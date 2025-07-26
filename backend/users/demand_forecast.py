# backend/demand_forecast.py
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from xgboost import XGBRegressor
from .data_preparation import prepare_dataset

def prepare_demand_data(csv_path):
    df = prepare_dataset(csv_path)
    
    # Agréger les réservations par jour et localisation
    df['date_debut'] = pd.to_datetime(df['date_debut'])
    demand = df.groupby(['date_debut', 'localisation']).size().reset_index(name='reservations')
    demand = demand.pivot(index='date_debut', columns='localisation', values='reservations').fillna(0)
    
    # Ajouter le contexte météo
    weather_data = df.groupby('date_debut').agg({'is_rainy': 'mean', 'is_family_event': 'mean'}).reset_index()
    demand = demand.merge(weather_data, on='date_debut')
    
    return demand

def train_arima_model(csv_path, location='Tunis'):
    demand = prepare_demand_data(csv_path)
    time_series = demand[location]
    
    model = ARIMA(time_series, order=(5,1,0))
    model_fit = model.fit()
    return model_fit

def train_xgboost_model(csv_path):
    demand = prepare_demand_data(csv_path)
    
    X = demand[['is_rainy', 'is_family_event']].values
    y = demand['Tunis'].values  # Exemple pour Tunis
    
    model = XGBRegressor(n_estimators=100, learning_rate=0.1)
    model.fit(X, y)
    return model

def predict_demand(model, is_arima=True, context=None):
    if is_arima:
        forecast = model.forecast(steps=7)  # Prévision sur 7 jours
        return forecast
    else:
        return model.predict([context])[0]