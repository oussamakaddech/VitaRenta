import os, pickle
from django.conf import settings
from demand_forecast import train_arima_model, train_xgboost_model

# dossier où seront stockés les modèles
MODELS_DIR = os.path.join(settings.BASE_DIR, 'users', 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# CSV d’entraînement
CSV_PATH = os.path.join(settings.BASE_DIR, 'data', 'demand_forecast_dataset_2025.csv')

locations = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Gabès']
fuels     = ['essence', 'diesel', 'électrique', 'hybride']

arima_models   = {}
xgboost_models = {}

for loc in locations:
    for fuel in fuels:
        arima_models[(loc, fuel)]   = train_arima_model(CSV_PATH, loc, fuel)
        xgboost_models[(loc, fuel)] = train_xgboost_model(CSV_PATH, loc, fuel)

with open(os.path.join(MODELS_DIR, 'arima_models.pkl'), 'wb') as f:
    pickle.dump(arima_models, f)

with open(os.path.join(MODELS_DIR, 'xgboost_models.pkl'), 'wb') as f:
    pickle.dump(xgboost_models, f)

print("✅ Modèles entraînés et sauvegardés dans users/models/")