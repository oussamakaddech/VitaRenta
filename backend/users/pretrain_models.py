# backend/pretrain_models.py
import pandas as pd
import numpy as np
import pickle
import os
import sys
import django
from django.conf import settings
from filelock import FileLock
import logging
from .recommendation_system import RecommendationEngine
from .demand_forecast import train_xgboost_model
from .data_preparation import prepare_dataset

logger = logging.getLogger(__name__)

def validate_dataset(csv_path):
    """Validate the dataset integrity."""
    try:
        df = pd.read_csv(csv_path)
        if df.empty:
            logger.error(f"Dataset {csv_path} is empty")
            return False
        required_columns = ['user_id', 'vehicle_id'] if 'recommendation' in csv_path else ['date', 'localisation', 'carburant_vehicule']
        if not all(col in df.columns for col in required_columns):
            logger.error(f"Missing required columns in {csv_path}")
            return False
        if df.isnull().any().any():
            logger.warning(f"Missing values detected in {csv_path}")
        return True
    except Exception as e:
        logger.error(f"Error validating dataset {csv_path}: {str(e)}")
        return False

def pretrain_lightfm_model():
    try:
        csv_path = settings.DATASETS['recommendation']
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found: {csv_path}")
            return False

        if not validate_dataset(csv_path):
            return False

        prepare_dataset(csv_path, dataset_type="recommendation")
        
        engine = RecommendationEngine()
        model = engine.train_lightfm_model(csv_path)
        if model is None:
            logger.error("Failed to train LightFM model")
            return False

        model_path = os.path.join(settings.BASE_DIR, 'models', 'lightfm_model.pkl')
        dataset_path = os.path.join(settings.BASE_DIR, 'models', 'lightfm_dataset.pkl')
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        with FileLock(os.path.join(settings.BASE_DIR, 'models', 'lockfile.lock')):
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            with open(dataset_path, 'wb') as f:
                pickle.dump(engine.dataset, f)
        
        logger.info("Pre-trained LightFM model and dataset saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error pre-training LightFM: {str(e)}")
        return False

def pretrain_xgboost_model():
    try:
        csv_path = settings.DATASETS['demand_forecast']
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found: {csv_path}")
            return False

        if not validate_dataset(csv_path):
            return False

        prepare_dataset(csv_path, dataset_type="demand")
        
        locations = ["Tunis", "Sfax", "Sousse", "Bizerte", "Djerba"]
        fuel_types = ["essence", "diesel", "électrique", "hybride"]
        models = {}
        
        for location in locations:
            for fuel in fuel_types:
                logger.info(f"Training XGBoost for {location} - {fuel}")
                model = train_xgboost_model(csv_path, location=location, carburant=fuel)
                if model:
                    models[(location, fuel)] = model
                else:
                    logger.warning(f"Failed to train for {location} - {fuel}")
        
        model_path = os.path.join(settings.BASE_DIR, 'models', 'xgboost_models.pkl')
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        with FileLock(os.path.join(settings.BASE_DIR, 'models', 'lockfile.lock')):
            with open(model_path, 'wb') as f:
                pickle.dump(models, f)
        
        logger.info("Pre-trained XGBoost models saved successfully")
        return True
    except Exception as e:
        logger.error(f"Error pre-training XGBoost: {str(e)}")
        return False

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vitarenta.settings')
    django.setup()
    pretrain_lightfm_model()
    pretrain_xgboost_model()