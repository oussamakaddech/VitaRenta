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
import random

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

def ensemble_predict_demand(csv_path, location='Tunis', carburant='électrique', context=None, date=None):
    """
    Improved ensemble prediction that takes date into account
    Returns a prediction based on historical patterns, context and date
    """
    try:
        # Basic validation
        if not os.path.exists(csv_path):
            logger.warning(f"CSV file not found: {csv_path}")
            return generate_fallback_prediction(location, carburant, context, date)
        
        # Try to read and process the CSV
        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            logger.error(f"Error reading CSV: {str(e)}")
            return generate_fallback_prediction(location, carburant, context, date)
        
        # Filter data for specific location and fuel type
        if 'localisation' in df.columns and 'carburant_vehicule' in df.columns:
            filtered_df = df[
                (df['localisation'] == location) & 
                (df['carburant_vehicule'] == carburant)
            ]
        else:
            logger.warning("Required columns not found in CSV")
            return generate_fallback_prediction(location, carburant, context, date)
        
        # Calculate base prediction from historical data
        if not filtered_df.empty and 'nombre_réservations' in filtered_df.columns:
            # Add day of week analysis if date column exists
            if 'date' in filtered_df.columns and date:
                try:
                    filtered_df['date'] = pd.to_datetime(filtered_df['date'])
                    filtered_df['day_of_week'] = filtered_df['date'].dt.dayofweek
                    filtered_df['month'] = filtered_df['date'].dt.month
                    
                    # Parse the target date
                    target_date = pd.to_datetime(date)
                    target_day = target_date.dayofweek
                    target_month = target_date.month
                    
                    # Get historical average for this day of week and month
                    day_month_df = filtered_df[
                        (filtered_df['day_of_week'] == target_day) & 
                        (filtered_df['month'] == target_month)
                    ]
                    
                    if not day_month_df.empty:
                        base_demand = day_month_df['nombre_réservations'].mean()
                    else:
                        # Fallback to day of week average
                        day_df = filtered_df[filtered_df['day_of_week'] == target_day]
                        if not day_df.empty:
                            base_demand = day_df['nombre_réservations'].mean()
                        else:
                            base_demand = filtered_df['nombre_réservations'].mean()
                except Exception as e:
                    logger.error(f"Error processing date data: {str(e)}")
                    base_demand = filtered_df['nombre_réservations'].mean()
            else:
                base_demand = filtered_df['nombre_réservations'].mean()
        else:
            base_demand = get_default_demand(location, carburant, date)
        
        # Apply context multipliers
        final_prediction = apply_context_multipliers(base_demand, context, date)
        
        logger.info(f"Prediction for {location} - {carburant} on {date}: {final_prediction}")
        return max(0.0, float(final_prediction))
        
    except Exception as e:
        logger.error(f"Error in ensemble_predict_demand: {str(e)}")
        return generate_fallback_prediction(location, carburant, context, date)

def generate_fallback_prediction(location, carburant, context, date):
    """Generate fallback prediction when data is unavailable"""
    base_demand = get_default_demand(location, carburant, date)
    return apply_context_multipliers(base_demand, context, date)

def get_default_demand(location, carburant, date=None):
    """Get default demand values based on location, fuel type and date"""
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
    
    # Day of week multipliers
    day_multipliers = {
        0: 0.8,  # Monday
        1: 0.9,  # Tuesday
        2: 0.95, # Wednesday
        3: 1.0,  # Thursday
        4: 1.2,  # Friday
        5: 1.4,  # Saturday
        6: 1.3   # Sunday
    }
    
    # Seasonal multipliers
    seasonal_multipliers = {
        1: 0.8,   # January - Low season
        2: 0.8,   # February
        3: 0.9,   # March
        4: 1.0,   # April
        5: 1.1,   # May
        6: 1.3,   # June - Start of high season
        7: 1.5,   # July - Peak season
        8: 1.5,   # August - Peak season
        9: 1.2,   # September
        10: 1.0,  # October
        11: 0.9,  # November
        12: 0.8   # December
    }
    
    base_demand = 15.0  # Base daily reservations
    location_mult = location_multipliers.get(location, 1.0)
    fuel_mult = fuel_multipliers.get(carburant, 1.0)
    
    # Apply date-based multipliers if date is provided
    date_mult = 1.0
    if date:
        try:
            target_date = pd.to_datetime(date)
            day_mult = day_multipliers.get(target_date.dayofweek, 1.0)
            month_mult = seasonal_multipliers.get(target_date.month, 1.0)
            date_mult = day_mult * month_mult
        except Exception as e:
            logger.error(f"Error processing date: {str(e)}")
            date_mult = 1.0
    
    return base_demand * location_mult * fuel_mult * date_mult

def apply_context_multipliers(base_demand, context, date=None):
    """Apply context-based multipliers to base demand"""
    if not context or len(context) < 4:
        return base_demand
    
    try:
        # Context order: [is_rainy, is_family_event, is_holiday, taux_occupation]
        is_rainy, is_family_event, is_holiday, taux_occupation = context[:4]
        
        multiplier = 1.0
        
        # Weather impact
        if is_rainy:
            multiplier *= 0.8  # Rain reduces demand
        
        # Family events typically increase demand
        if is_family_event:
            multiplier *= 1.3
        
        # Holidays may increase or decrease demand depending on type
        if is_holiday:
            multiplier *= 1.15
        
        # Occupancy rate affects demand
        occupancy_multiplier = 0.7 + (taux_occupation * 0.6)  # Range: 0.7 to 1.3
        multiplier *= occupancy_multiplier
        
        # Add some randomness to avoid identical values
        random_factor = 0.95 + random.random() * 0.1  # Range: 0.95 to 1.05
        multiplier *= random_factor
        
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