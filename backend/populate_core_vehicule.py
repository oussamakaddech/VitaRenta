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

    vehicles = []
    seen_vehicle_ids = set()
    for _, row in df.iterrows():
        try:
            vehicle_data = row['caractéristiques_vehicule']
            vehicle_id = row['vehicle_id']
            if vehicle_id in seen_vehicle_ids:
                continue
            seen_vehicle_ids.add(vehicle_id)
            vehicle_data['id'] = vehicle_id
            vehicle_data['statut'] = 'disponible'
            marque = vehicle_data.get('marque', 'unknown')
            if marque in ['unknown', 'aaaaaaaa', '', None]:
                logger.warning(f"Skipping vehicle {vehicle_id} with invalid marque: {marque}")
                continue
            if not vehicle_data.get('modele') or vehicle_data.get('modele') == 'unknown':
                vehicle_data['modele'] = 'Unknown'
            if not vehicle_data.get('prix_par_jour') or vehicle_data.get('prix_par_jour') <= 0:
                vehicle_data['prix_par_jour'] = 100.0
            if not vehicle_data.get('emissionsCO2'):
                vehicle_data['emissionsCO2'] = 120.0
            if not vehicle_data.get('localisation'):
                vehicle_data['localisation'] = 'Tunis'
            if not vehicle_data.get('type_vehicule'):
                vehicle_data['type_vehicule'] = 'berline'
            vehicles.append(vehicle_data)
        except Exception as e:
            logger.error(f"Error processing vehicle_id {row.get('vehicle_id')}: {str(e)}")
            continue

    try:
        client = MongoClient(settings.DATABASES['default']['CLIENT']['host'])
        db = client[settings.DATABASES['default']['NAME']]
        db.core_vehicule.delete_many({})
        if vehicles:
            db.core_vehicule.insert_many(vehicles)
            logger.info(f"{len(vehicles)} vehicles inserted into core_vehicule collection")
        else:
            logger.error("No valid vehicles to insert")
    except Exception as e:
        logger.error(f"Error inserting vehicles into MongoDB: {str(e)}")
        raise
    finally:
        client.close()