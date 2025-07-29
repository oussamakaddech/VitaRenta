# backend/data_preparation.py
import os
import pandas as pd
import requests
import json
from django.conf import settings
from pymongo import MongoClient
import logging
from .utils import calculate_eco_score

logger = logging.getLogger(__name__)

def fetch_weather_data(location):
    if not hasattr(settings, 'OPENWEATHER_API_KEY'):
        logger.error("OPENWEATHER_API_KEY not defined in settings")
        return {"is_rainy": 0, "temperature": 20.0}  # TODO: Replace with location-specific historical average
    try:
        api_key = settings.OPENWEATHER_API_KEY
        url = f"http://api.openweathermap.org/data/2.5/weather?q={location},TN&appid={api_key}"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        return {
            "is_rainy": 1 if data.get("weather", [{}])[0].get("main") in ["Rain", "Storm"] else 0,
            "temperature": data.get("main", {}).get("temp", 20.0) - 273.15
        }
    except requests.RequestException as e:
        logger.error(f"Error fetching weather data for {location}: {str(e)}")
        return {"is_rainy": 0, "temperature": 20.0}

def fetch_event_data(location):
    return {"is_family_event": 1 if location in ["Tunis", "Sfax"] else 0}

def prepare_dataset(csv_path, dataset_type="recommendation"):
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found: {csv_path}")
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    
    df = pd.read_csv(csv_path)
    
    if dataset_type == "recommendation":
        # Parse JSON columns once
        for col in ['météo', 'historique_reservations', 'caractéristiques_vehicule']:
            if col in df.columns:
                df[col] = df[col].apply(lambda x: json.loads(x) if isinstance(x, str) else x)
        
        df['vehicle_id'] = df['vehicule_recommande_id']
        df['marque'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('marque', ''))
        df['modele'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('modele', ''))
        df['carburant'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('carburant', ''))
        df['prix_par_jour'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('prix_par_jour', 0))
        df['emissionsCO2'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('emissionsCO2', 0))
        df['localisation'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('localisation', ''))
        df['type_vehicule'] = df['caractéristiques_vehicule'].apply(lambda x: x.get('type_vehicule', ''))
        
        df = df.dropna(subset=['user_id', 'vehicle_id', 'marque', 'modele', 'carburant'])
        df['prix_par_jour'] = df['prix_par_jour'].fillna(df['prix_par_jour'].mean()).round(-1)
        df['emissionsCO2'] = df['emissionsCO2'].fillna(0).round(-1)
        
        df['is_rainy'] = df['météo'].apply(lambda x: 1 if x.get('pluie', 0) > 0 else 0)
        df['temperature'] = df['météo'].apply(lambda x: x.get('temperature', 20.0))
        df['is_family_event'] = df['localisation'].apply(lambda loc: fetch_event_data(loc)['is_family_event'])
        df['eco_score'] = df.apply(lambda row: calculate_eco_score(row['emissionsCO2'], row['carburant']), axis=1)
        
    elif dataset_type == "demand":
        df['date'] = pd.to_datetime(df['date'])
        df = df.dropna(subset=['date', 'localisation', 'carburant_vehicule'])
        df['météo_temp'] = df['météo_temp'].fillna(df['météo_temp'].mean()).round(1)
        df['météo_précipitations'] = df['météo_précipitations'].fillna(0).round(1)
        
        df['is_rainy'] = df['localisation'].apply(lambda loc: fetch_weather_data(loc)['is_rainy'])
        df['is_family_event'] = df['localisation'].apply(lambda loc: fetch_event_data(loc)['is_family_event'])
    
    try:
        client = MongoClient(settings.DATABASES['default']['CLIENT']['host'])
        db = client[settings.DATABASES['default']['NAME']]
        collection = 'recommendations' if dataset_type == "recommendation" else 'demand_forecast'
        db[collection].delete_many({})
        db[collection].insert_many(df.to_dict('records'))
        logger.info(f"Dataset {dataset_type} saved to MongoDB, collection: {collection}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB or insert data: {str(e)}")
        raise
    finally:
        client.close()
    
    return df