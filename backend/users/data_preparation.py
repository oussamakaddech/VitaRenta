# backend/data_preparation.py
import pandas as pd
import requests
from django.conf import settings
from pymongo import MongoClient

def fetch_weather_data(location):
    api_key = settings.OPENWEATHER_API_KEY
    url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}"
    response = requests.get(url).json()
    return {"is_rainy": 1 if response.get("weather", [{}])[0].get("main") in ["Rain", "Storm"] else 0}

def fetch_event_data(location):
    # Simulation (Eventbrite API peut être utilisée pour des données réelles)
    return {"is_family_event": 1 if location in ["Tunis", "Sfax"] else 0}

def calculate_eco_score(co2_emissions, carburant):
    max_co2 = 300
    co2_score = 1 - (co2_emissions / max_co2) if co2_emissions else 1
    fuel_bonus = 0.3 if carburant in ["electrique", "hybride"] else 0
    return min(1.0, co2_score + fuel_bonus)

def prepare_dataset(csv_path):
    df = pd.read_csv(csv_path)
    
    # Nettoyage
    df = df.dropna(subset=['user_id', 'vehicle_id', 'marque', 'modele', 'carburant'])
    df['prix_par_jour'] = df['prix_par_jour'].round(-1)
    df['co2_emissions'] = df['co2_emissions'].fillna(0).round(-1)
    
    # Enrichissement
    df['is_rainy'] = df['localisation'].apply(lambda loc: fetch_weather_data(loc)['is_rainy'])
    df['is_family_event'] = df['localisation'].apply(lambda loc: fetch_event_data(loc)['is_family_event'])
    df['eco_score'] = df.apply(lambda row: calculate_eco_score(row['co2_emissions'], row['carburant']), axis=1)
    
    # Sauvegarde dans MongoDB
    client = MongoClient(settings.MONGODB_URI)
    db = client['vitarenta']
    db['interactions'].insert_many(df.to_dict('records'))
    
    return df