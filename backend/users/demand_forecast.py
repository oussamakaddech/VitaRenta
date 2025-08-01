import logging, os, pandas as pd, numpy as np, typing as t
from functools import lru_cache
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from django.utils.encoding import force_str
from urllib.parse import unquote
import traceback

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)
def ensemble_predict_demand(csv_path, location='Tunis', carburant='électrique', context=None):
    """
    Simplified ensemble prediction without external dependencies
    Returns a basic prediction based on historical patterns and context
    """
    try:
        # Basic validation
        if not os.path.exists(csv_path):
            logger.warning(f"CSV file not found: {csv_path}")
            return generate_fallback_prediction(location, carburant, context)
        
        # Try to read and process the CSV
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            logger.error(f"Error reading CSV: {str(e)}")
            return generate_fallback_prediction(location, carburant, context)
        
        # Filter data for specific location and fuel type
        if 'localisation' in df.columns and 'carburant_vehicule' in df.columns:
            filtered_df = df[
                (df['localisation'] == location) & 
                (df['carburant_vehicule'] == carburant)
            ]
        else:
            logger.warning("Required columns not found in CSV")
            return generate_fallback_prediction(location, carburant, context)
        
        # Calculate base prediction from historical data
        if not filtered_df.empty and 'nombre_réservations' in filtered_df.columns:
            base_demand = filtered_df['nombre_réservations'].mean()
        else:
            base_demand = get_default_demand(location, carburant)
        
        # Apply context multipliers
        final_prediction = apply_context_multipliers(base_demand, context)
        
        logger.info(f"Prediction for {location} - {carburant}: {final_prediction}")
        return max(0.0, float(final_prediction))
        
    except Exception as e:
        logger.error(f"Error in ensemble_predict_demand: {str(e)}")
        return generate_fallback_prediction(location, carburant, context)

def generate_fallback_prediction(location, carburant, context):
    """Generate fallback prediction when data is unavailable"""
    base_demand = get_default_demand(location, carburant)
    return apply_context_multipliers(base_demand, context)

def get_default_demand(location, carburant):
    """Get default demand values based on location and fuel type"""
    location_multipliers = {
        'Tunis': 1.2,
        'Sfax': 1.0,
        'Sousse': 0.9,
        'Bizerte': 0.7,
        'Djerba': 0.8
    }
    
    fuel_multipliers = {
        'électrique': 1.1,
        'hybride': 1.0,
        'essence': 0.9,
        'diesel': 0.8
    }
    
    base_demand = 15.0  # Base daily reservations
    location_mult = location_multipliers.get(location, 1.0)
    fuel_mult = fuel_multipliers.get(carburant, 1.0)
    
    return base_demand * location_mult * fuel_mult

def apply_context_multipliers(base_demand, context):
    """Apply context-based multipliers to base demand"""
    if not context or len(context) < 3:
        return base_demand
    
    try:
        is_family_event, is_holiday, taux_occupation = context[:3]
        
        multiplier = 1.0
        
        # Family events typically increase demand
        if is_family_event:
            multiplier *= 1.3
        
        # Holidays may increase or decrease demand depending on type
        if is_holiday:
            multiplier *= 1.15
        
        # Occupancy rate affects demand
        occupancy_multiplier = 0.7 + (taux_occupation * 0.6)  # Range: 0.7 to 1.3
        multiplier *= occupancy_multiplier
        
        return base_demand * multiplier
        
    except Exception as e:
        logger.error(f"Error applying context multipliers: {str(e)}")
        return base_demand

# Placeholder functions for compatibility
def train_arima_model(csv_path, location='Tunis', carburant='électrique'):
    """Placeholder for ARIMA model training"""
    logger.info(f"ARIMA training placeholder for {location} - {carburant}")
    return None

def train_xgboost_model(csv_path, location='Tunis', carburant='électrique'):
    """Placeholder for XGBoost model training"""
    logger.info(f"XGBoost training placeholder for {location} - {carburant}")
    return None

def predict_demand(model, is_arima=True, context=None):
    """Placeholder for model prediction"""
    if not model:
        return 0.0
    logger.info("Prediction placeholder")
    return 10.0  # Placeholder value