# backend/demand_forecast.py
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from xgboost import XGBRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error
from .data_preparation import prepare_dataset
import pickle
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def prepare_demand_data(csv_path):
    df = prepare_dataset(csv_path, dataset_type="demand")
    
    df['date'] = pd.to_datetime(df['date'])
    demand = df.groupby(['date', 'localisation', 'carburant_vehicule']).agg({
        'nombre_réservations': 'sum',
        'taux_occupation': 'mean',
        'is_rainy': 'mean',
        'is_family_event': 'mean',
        'is_holiday': 'mean'
    }).reset_index()
    
    demand_pivot = demand.pivot(index='date', columns=['localisation', 'carburant_vehicule'], values='nombre_réservations').fillna(0)
    demand_pivot = demand_pivot.join(demand.groupby('date').agg({
        'is_rainy': 'mean',
        'is_family_event': 'mean',
        'is_holiday': 'mean',
        'taux_occupation': 'mean'
    }))
    
    return demand_pivot

def load_pretrained_xgboost_model(location, carburant):
    model_path = os.path.join(settings.BASE_DIR, 'models', 'xgboost_models.pkl')
    try:
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                models = pickle.load(f)
            model = models.get((location, carburant))
            if model:
                logger.info(f"Pre-trained XGBoost model loaded for {location} - {carburant}")
                return model
        logger.info(f"No pre-trained XGBoost model found for {location} - {carburant}")
        return None
    except Exception as e:
        logger.error(f"Error loading pre-trained XGBoost model: {str(e)}")
        return None

def train_arima_model(csv_path, location='Tunis', carburant='électrique'):
    demand = prepare_demand_data(csv_path)
    column_key = (location, carburant)
    if column_key not in demand.columns:
        logger.warning(f"No data for {location} - {carburant}")
        return None
    time_series = demand[column_key]
    
    try:
        tscv = TimeSeriesSplit(n_splits=5)
        best_mse = float('inf')
        best_order = (5, 1, 0)
        for p in range(3, 6):
            for d in range(0, 2):
                for q in range(0, 2):
                    mse_scores = []
                    for train_index, test_index in tscv.split(time_series):
                        train, test = time_series[train_index], time_series[test_index]
                        try:
                            model = ARIMA(train, order=(p, d, q))
                            model_fit = model.fit()
                            predictions = model_fit.forecast(steps=len(test))
                            mse = mean_squared_error(test, predictions)
                            mse_scores.append(mse)
                        except:
                            continue
                    if mse_scores and np.mean(mse_scores) < best_mse:
                        best_mse = np.mean(mse_scores)
                        best_order = (p, d, q)
                        if best_mse < 0.1:  # Early stopping
                            break
                if best_mse < 0.1:
                    break
            if best_mse < 0.1:
                break
        
        model = ARIMA(time_series, order=best_order)
        model_fit = model.fit()
        logger.info(f"ARIMA model trained for {location} - {carburant} with order {best_order}, MSE: {best_mse:.4f}")
        return model_fit
    except Exception as e:
        logger.error(f"Error training ARIMA for {location} - {carburant}: {str(e)}")
        return None

def train_xgboost_model(csv_path, location='Tunis', carburant='électrique'):
    pretrained_model = load_pretrained_xgboost_model(location, carburant)
    if pretrained_model:
        return pretrained_model
    
    demand = prepare_demand_data(csv_path)
    column_key = (location, carburant)
    if column_key not in demand.columns:
        logger.warning(f"No data for {location} - {carburant}")
        return None
    
    X = demand[['is_rainy', 'is_family_event', 'is_holiday', 'taux_occupation']].values
    y = demand[column_key].values
    
    try:
        best_mse = float('inf')
        best_params = {'n_estimators': 100, 'learning_rate': 0.1}
        for n_estimators in [50, 100, 200]:
            for lr in [0.01, 0.05, 0.1]:
                model = XGBRegressor(n_estimators=n_estimators, learning_rate=lr)
                tscv = TimeSeriesSplit(n_splits=5)
                mse_scores = []
                for train_index, test_index in tscv.split(X):
                    X_train, X_test = X[train_index], X[test_index]
                    y_train, y_test = y[train_index], y[test_index]
                    model.fit(X_train, y_train)
                    predictions = model.predict(X_test)
                    mse = mean_squared_error(y_test, predictions)
                    mse_scores.append(mse)
                if mse_scores and np.mean(mse_scores) < best_mse:
                    best_mse = np.mean(mse_scores)
                    best_params = {'n_estimators': n_estimators, 'learning_rate': lr}
                    if best_mse < 0.1:  # Early stopping
                        break
                if best_mse < 0.1:
                    break
            if best_mse < 0.1:
                break
        
        model = XGBRegressor(**best_params)
        model.fit(X, y)
        logger.info(f"XGBoost model trained for {location} - {carburant} with parameters {best_params}, MSE: {best_mse:.4f}")
        return model
    except Exception as e:
        logger.error(f"Error training XGBoost for {location} - {carburant}: {str(e)}")
        return None

def predict_demand(model, is_arima=True, context=None):
    if not is_arima and (context is None or len(context) != 4):
        logger.error("Invalid context for XGBoost prediction")
        raise ValueError("Context must be a list of 4 values: [is_rainy, is_family_event, is_holiday, taux_occupation]")
    
    try:
        if is_arima:
            forecast = model.forecast(steps=7)
            logger.info(f"ARIMA prediction: {forecast[-1]} reservations")
            return float(forecast[-1])
        else:
            prediction = model.predict([context])[0]
            logger.info(f"XGBoost prediction: {prediction} reservations")
            return float(prediction)
    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}")
        return 0

def ensemble_predict_demand(csv_path, location='Tunis', carburant='électrique', context=None):
    arima_model = train_arima_model(csv_path, location, carburant)
    xgboost_model = train_xgboost_model(csv_path, location, carburant)
    
    if not arima_model or not xgboost_model:
        logger.warning(f"Ensemble prediction failed for {location} - {carburant}")
        return 0
    
    arima_pred = predict_demand(arima_model, is_arima=True)
    xgboost_pred = predict_demand(xgboost_model, is_arima=False, context=context)
    
    ensemble_pred = 0.5 * arima_pred + 0.5 * xgboost_pred
    logger.info(f"Ensemble prediction for {location} - {carburant}: {ensemble_pred} reservations")
    return ensemble_pred