import csv
import random
import os

# Configuration
NUM_VEHICLES = 10
OUTPUT_FILE = 'data/eco_score_dataset.csv'

# Types de carburant et leurs caractéristiques
FUEL_TYPES = {
    'électrique': {
        'base_co2': 0,  # Pas d'émissions directes
        'base_energy': 15,  # kWh/100km
        'weight_factor': 0.8
    },
    'hybride': {
        'base_co2': 70,  # g/km
        'base_energy': 4.5 * 9.7,  # Convertir L/100km en kWh/100km
        'weight_factor': 0.9
    },
    'essence': {
        'base_co2': 120,  # g/km
        'base_energy': 7.0 * 9.7,  # Convertir L/100km en kWh/100km
        'weight_factor': 1.0
    },
    'diesel': {
        'base_co2': 100,  # g/km
        'base_energy': 6.0 * 10.7,  # Convertir L/100km en kWh/100km
        'weight_factor': 0.95
    }
}

# Créer le répertoire data s'il n'existe pas
os.makedirs('data', exist_ok=True)

# Générer les données
data = []

for vehicle_id in range(1, NUM_VEHICLES + 1):
    # Choisir un type de carburant aléatoire
    fuel_type = random.choice(list(FUEL_TYPES.keys()))
    fuel_data = FUEL_TYPES[fuel_type]
    
    # Ajouter de la variabilité
    co2_variation = random.uniform(-10, 10)
    energy_variation = random.uniform(-1, 1)
    
    # Calculer les valeurs
    co2_emissions = max(0, fuel_data['base_co2'] + co2_variation)
    energy_consumption = max(0, fuel_data['base_energy'] + energy_variation)
    
    # Calculer le score écologique
    # Formule: score = 100 - (co2_emissions * 0.4 + energy_consumption * 0.6) * weight_factor
    co2_impact = co2_emissions * 0.4
    energy_impact = energy_consumption * 0.6
    score = max(0, min(100, 100 - (co2_impact + energy_impact) * fuel_data['weight_factor']))
    
    # Ajouter l'enregistrement
    data.append({
        'vehicle_id': f'vehicle_{vehicle_id}',
        'fuel_type': fuel_type,
        'co2_emissions': round(co2_emissions, 2),
        'energy_consumption': round(energy_consumption, 2),
        'eco_score': round(score, 1)
    })

# Écrire dans le fichier CSV
with open(OUTPUT_FILE, 'w', newline='') as csvfile:
    fieldnames = ['vehicle_id', 'fuel_type', 'co2_emissions', 'energy_consumption', 'eco_score']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    
    writer.writeheader()
    for row in data:
        writer.writerow(row)

print(f"Dataset de scoring écologique généré avec succès: {OUTPUT_FILE}")
print(f"Nombre d'enregistrements: {len(data)}")