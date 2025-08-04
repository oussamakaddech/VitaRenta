import csv
import random
from datetime import datetime, timedelta
import os

# Configuration
NUM_VEHICLES = 10
DAYS_OF_DATA = 30
DATA_POINTS_PER_DAY = 10
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'data', 'iot_dataset.csv')

# Types de carburant et leurs caractéristiques de base
FUEL_TYPES = {
    'électrique': {
        'base_temp': 40,
        'base_vibration': 0.5,
        'base_consumption': 15,  # kWh/100km
        'base_battery_health': 95
    },
    'hybride': {
        'base_temp': 70,
        'base_vibration': 1.0,
        'base_consumption': 4.5,  # L/100km
        'base_battery_health': 90
    },
    'essence': {
        'base_temp': 85,
        'base_vibration': 1.5,
        'base_consumption': 7.0,  # L/100km
        'base_battery_health': 85
    },
    'diesel': {
        'base_temp': 90,
        'base_vibration': 2.0,
        'base_consumption': 6.0,  # L/100km
        'base_battery_health': 80
    }
}

# Créer le répertoire data s'il n'existe pas
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

# Générer les données
data = []
for vehicle_id in range(1, NUM_VEHICLES + 1):
    # Choisir un type de carburant aléatoire
    fuel_type = random.choice(list(FUEL_TYPES.keys()))
    base_values = FUEL_TYPES[fuel_type]
    
    # Définir le kilométrage initial
    initial_mileage = random.randint(10000, 100000)
    
    # Générer des données pour chaque jour
    for day in range(DAYS_OF_DATA):
        # Facteur de dégradation (augmente avec le temps)
        degradation_factor = 1 + (day * 0.01)
        
        # Générer plusieurs points de données par jour
        for i in range(DATA_POINTS_PER_DAY):
            timestamp = datetime.now() - timedelta(days=DAYS_OF_DATA - day, hours=i*2.4)
            
            # Ajouter de la variabilité aléatoire
            temp_variation = random.uniform(-5, 5)
            vibration_variation = random.uniform(-0.2, 0.2)
            consumption_variation = random.uniform(-0.5, 0.5)
            
            # Calculer les valeurs avec dégradation
            temperature = min(120, base_values['base_temp'] * degradation_factor + temp_variation)
            vibration = max(0.1, base_values['base_vibration'] * degradation_factor + vibration_variation)
            fuel_consumption = max(0.1, base_values['base_consumption'] * degradation_factor + consumption_variation)
            
            # Kilométrage (augmentation progressive)
            mileage = initial_mileage + (day * 50) + (i * 5)
            
            # Heures de moteur (augmentation progressive)
            engine_hours = day * 2 + i * 0.2
            
            # Santé de la batterie (diminue avec le temps)
            battery_health = max(0, base_values['base_battery_health'] - (day * 0.5) - (i * 0.05))
            
            # Ajouter l'enregistrement
            data.append({
                'vehicle_id': f'vehicle_{vehicle_id}',
                'timestamp': timestamp.isoformat(),
                'temperature': round(temperature, 2),
                'vibration': round(vibration, 2),
                'fuel_consumption': round(fuel_consumption, 2),
                'mileage': round(mileage, 2),
                'engine_hours': round(engine_hours, 2),
                'battery_health': round(battery_health, 2),
                'fuel_type': fuel_type
            })

# Écrire dans le fichier CSV avec encodage UTF-8
with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as csvfile:
    fieldnames = ['vehicle_id', 'timestamp', 'temperature', 'vibration', 
                  'fuel_consumption', 'mileage', 'engine_hours', 'battery_health', 'fuel_type']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    
    writer.writeheader()
    for row in data:
        writer.writerow(row)

print(f"Dataset IoT généré avec succès: {OUTPUT_FILE}")
print(f"Nombre d'enregistrements: {len(data)}")