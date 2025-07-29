# backend/populate_core_vehicule.py
import json
import os
import pandas as pd
from pymongo import MongoClient
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def populate_core_vehicule(csv_path):
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found: {csv_path}")
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    
    df = pd.read_csv(csv_path)
    df['caractéristiques_vehicule'] = df['caractéristiques_vehicule'].apply(
        lambda x: json.loads(x) if isinstance(x, str) else x
    )

    df['caractéristiques_vehicule_str'] = df['caractéristiques_vehicule'].apply(json.dumps)
    df_unique = df[['vehicle_id', 'caractéristiques_vehicule_str']].drop_duplicates()

    vehicles = []
    for _, row in df_unique.iterrows():
        try:
            vehicle_data = json.loads(row['caractéristiques_vehicule_str'])
            vehicle_data['id'] = row['vehicle_id']
            vehicle_data['statut'] = 'disponible'
            vehicles.append(vehicle_data)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON for vehicle_id {row['vehicle_id']}: {str(e)}")
            continue

    try:
        client = MongoClient(settings.DATABASES['default']['CLIENT']['host'])
        db = client[settings.DATABASES['default']['NAME']]
        db.core_vehicule.delete_many({})
        db.core_vehicule.insert_many(vehicles)
        logger.info(f"{len(vehicles)} vehicles inserted into core_vehicule collection")
    except Exception as e:
        logger.error(f"Error inserting vehicles into MongoDB: {str(e)}")
        raise
    finally:
        client.close()