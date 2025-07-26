import pandas as pd
import numpy as np
from lightfm import LightFM
from lightfm.data import Dataset
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn as nn
import torch.optim as optim
from statsmodels.tsa.arima.model import ARIMA
from xgboost import XGBRegressor
from sklearn.preprocessing import MinMaxScaler
from django.conf import settings
from pymongo import MongoClient
import requests
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self):
        self.dataset = None
        self.model = None
        self.tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        self.text_model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
        self.mongo_client = MongoClient('mongodb://localhost:27017/')
        self.db = self.mongo_client['your_database_name']

    def prepare_lightfm_data(self):
        # Récupérer les réservations depuis MongoDB
        reservations = self.db.reservations.find()
        df = pd.DataFrame(list(reservations))
        if df.empty:
            logger.warning("Aucune réservation trouvée dans la base de données")
            return None, None, None, None

        df = df.rename(columns={
            'user_id': 'user_id',
            'vehicule_id': 'vehicle_id',
            'marque': 'marque',
            'modele': 'modele',
            'type_moteur': 'carburant',
            'capacite': 'places',
            'prix_jour': 'prix_par_jour',
            'agence_ville': 'localisation'
        })

        # Nettoyage
        df = df.dropna(subset=['user_id', 'vehicle_id', 'marque', 'modele', 'carburant'])
        df['prix_par_jour'] = df['prix_par_jour'].round(-1)

        # Enrichissement avec météo et score écologique
        df['is_rainy'] = df['localisation'].apply(lambda loc: self.fetch_weather_data(loc)['is_rainy'])
        df['eco_score'] = df.apply(lambda row: self.calculate_eco_score(row['prix_par_jour'], row['carburant']), axis=1)

        # Création du dataset LightFM
        self.dataset = Dataset()
        user_features = []
        for user_id, group in df.groupby('user_id'):
            try:
                preferences = self.db.user_preferences.find_one({'user_id': user_id})
                comments = preferences.get('textual_feedback', '') if preferences else ""
                features = self.enrich_user_features(user_id, comments)
                user_features.append((user_id, features))
            except Exception as e:
                logger.error(f"Erreur lors de l'enrichissement des features utilisateur {user_id}: {str(e)}")
                user_features.append((user_id, []))

        vehicle_features = [
            (
                row['vehicle_id'],
                [
                    f"marque:{row['marque']}",
                    f"type:{row['carburant']}",
                    f"places:{row['places']}",
                    f"prix_range:{min(1000, int(row['prix_par_jour'] // 50) * 50)}",
                    f"eco_score:{round(row['eco_score'], 2)}"
                ]
            )
            for _, row in df.iterrows()
        ]

        interactions = [(row['user_id'], row['vehicle_id']) for _, row in df.iterrows()]
        weights = [row['eco_score'] + 1.0 for _, row in df.iterrows()]

        self.dataset.fit(
            users=df['user_id'].unique(),
            items=df['vehicle_id'].unique(),
            user_features=[f for _, fs in user_features for f in fs],
            item_features=[f for _, fs in vehicle_features for f in fs]
        )

        interactions_matrix, weights_matrix = self.dataset.build_interactions(
            [(u, v, w) for (u, v), w in zip(interactions, weights)]
        )
        user_features_matrix = self.dataset.build_user_features(user_features)
        item_features_matrix = self.dataset.build_item_features(vehicle_features)

        return interactions_matrix, weights_matrix, user_features_matrix, item_features_matrix

    def train_lightfm_model(self):
        interactions, weights, user_features, item_features = self.prepare_lightfm_data()
        if interactions is None:
            logger.error("Échec de l'entraînement du modèle LightFM : données manquantes")
            return None
        self.model = LightFM(loss='warp', no_components=30, learning_rate=0.05)
        self.model.fit(
            interactions,
            sample_weight=weights,
            user_features=user_features,
            item_features=item_features,
            epochs=30,
            num_threads=4
        )
        logger.info("Modèle LightFM entraîné avec succès")
        return self.model

    def recommend_vehicles(self, user_id, n_items=5):
        if not self.model or not self.dataset:
            self.train_lightfm_model()
            if not self.model:
                return []

        n_users, n_items = self.dataset.interactions_shape()
        user_index = self.dataset.mapping()[0].get(user_id, -1)
        if user_index == -1:
            logger.warning(f"Utilisateur {user_id} non trouvé dans le dataset")
            return []

        scores = self.model.predict(
            user_index,
            np.arange(n_items),
            user_features=self.dataset.user_features(),
            item_features=self.dataset.item_features()
        )

        top_items = np.argsort(-scores)[:n_items]
        vehicle_ids = [self.dataset.mapping()[2][i] for i in top_items]
        vehicles = self.db.vehicles.find({'_id': {'$in': vehicle_ids}, 'disponibilite': True})
        vehicles_list = list(vehicles)
        return sorted(vehicles_list, key=lambda v: -self.calculate_eco_score(v['prix_jour'], v['type_moteur']))[:n_items]

    def get_text_embedding(self, text):
        if not text or not isinstance(text, str):
            return np.zeros(384)  # Taille de l'embedding pour all-MiniLM-L6-v2
        inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        with torch.no_grad():
            outputs = self.text_model(**inputs)
        return outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

    def enrich_user_features(self, user_id, comments):
        text_embedding = self.get_text_embedding(comments)
        vehicle_features = {
            "economique": ["prix_range:0-100", "carburant:hybride"],
            "spacieux": ["type:SUV", "type:Minivan", "places:6", "places:7"],
            "rapide": ["type:Sport"],
            "écologique": ["carburant:électrique", "carburant:hybride"],
            "green": ["carburant:électrique", "carburant:hybride"]
        }
        user_features = []
        for keyword, features in vehicle_features.items():
            if keyword in comments.lower():
                user_features.extend(features)
        user_features.append(f"text_embedding:{np.mean(text_embedding)}")
        return user_features

    def fetch_weather_data(self, location):
        if not hasattr(settings, 'OPENWEATHERMAP_API_KEY'):
            logger.error("OPENWEATHERMAP_API_KEY non défini dans settings")
            return {"is_rainy": 0}
        try:
            api_key = settings.OPENWEATHERMAP_API_KEY
            url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={api_key}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            return {"is_rainy": 1 if data.get("weather", [{}])[0].get("main") in ["Rain", "Storm"] else 0}
        except requests.RequestException as e:
            logger.error(f"Erreur lors de la récupération des données météo pour {location}: {str(e)}")
            return {"is_rainy": 0}

    def fetch_weather_forecast(self, location, date):
        if not hasattr(settings, 'OPENWEATHERMAP_API_KEY'):
            logger.error("OPENWEATHERMAP_API_KEY non défini dans settings")
            return {"is_rainy": 0}
        try:
            api_key = settings.OPENWEATHERMAP_API_KEY
            url = f"http://api.openweathermap.org/data/2.5/forecast?q={location}&appid={api_key}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            target_date = datetime.strptime(date, '%Y-%m-%d').strftime('%Y-%m-%d')
            forecast = next((item for item in data.get('list', []) if target_date in item.get('dt_txt', '')), None)
            return {"is_rainy": 1 if forecast and forecast.get("weather", [{}])[0].get("main") in ["Rain", "Storm"] else 0}
        except requests.RequestException as e:
            logger.error(f"Erreur lors de la récupération des prévisions météo pour {location} à {date}: {str(e)}")
            return {"is_rainy": 0}

    def calculate_eco_score(self, prix, carburant):
        max_prix = 1000
        prix_score = 1 - (prix / max_prix) if prix else 1
        fuel_bonus = 0.3 if carburant in ["électrique", "hybride"] else 0
        return min(1.0, prix_score + fuel_bonus)

class FleetOptimizer:
    def __init__(self):
        self.vehicle_data = None
        self.mongo_client = MongoClient('mongodb://localhost:27017/')
        self.db = self.mongo_client['your_database_name']

    def load_vehicle_data(self, agency_id):
        vehicles = self.db.vehicles.find({'agence_id': agency_id, 'disponibilite': True})
        self.vehicle_data = pd.DataFrame(list(vehicles))
        self.vehicle_data = self.vehicle_data.rename(columns={
            'type_moteur': 'carburant',
            'capacite': 'places',
            'prix_jour': 'prix_par_jour'
        })

    def optimize_fleet_availability(self, agency_id):
        self.load_vehicle_data(agency_id)
        if self.vehicle_data.empty:
            logger.warning(f"Aucun véhicule disponible pour l'agence {agency_id}")
            return []

        self.vehicle_data['eco_score'] = self.vehicle_data.apply(
            lambda row: RecommendationEngine().calculate_eco_score(row['prix_par_jour'], row['carburant']), axis=1
        )
        self.vehicle_data['priority_score'] = self.vehicle_data['eco_score'] + (self.vehicle_data['places'] / 10)
        optimized_vehicles = self.vehicle_data.sort_values(by='priority_score', ascending=False)
        return optimized_vehicles[['_id', 'carburant', 'places', 'prix_par_jour', 'eco_score']].to_dict('records')

class MaintenancePredictor:
    def __init__(self):
        self.model = None
        self.scaler = MinMaxScaler()
        self.mongo_client = MongoClient('mongodb://localhost:27017/')
        self.db = self.mongo_client['your_database_name']

    def prepare_telemetry_data(self, vehicle_id):
        telemetry = self.db.vehicle_telemetry.find({'vehicule_id': vehicle_id}).sort('timestamp', 1)
        df = pd.DataFrame(list(telemetry))
        if df.empty:
            logger.warning(f"Aucune donnée de télémétrie pour le véhicule {vehicle_id}")
            return None
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        return df[['wear_level', 'energy_consumption', 'mileage']].values

    def train_lstm_model(self, vehicle_id):
        data = self.prepare_telemetry_data(vehicle_id)
        if data is None or len(data) < 10:
            logger.warning(f"Données insuffisantes pour entraîner LSTM pour le véhicule {vehicle_id}")
            return False

        scaled_data = self.scaler.fit_transform(data)
        X, y = [], []
        for i in range(len(scaled_data) - 10):
            X.append(scaled_data[i:i+10])
            y.append(scaled_data[i+10, 0])  # Prédire wear_level
        X, y = np.array(X), np.array(y)

        X = torch.tensor(X, dtype=torch.float32)
        y = torch.tensor(y, dtype=torch.float32).reshape(-1, 1)

        class LSTMModel(nn.Module):
            def __init__(self, input_size=3, hidden_size=50):
                super(LSTMModel, self).__init__()
                self.lstm1 = nn.LSTM(input_size, hidden_size, batch_first=True, return_sequences=True)
                self.lstm2 = nn.LSTM(hidden_size, hidden_size, batch_first=True)
                self.dense = nn.Linear(hidden_size, 1)

            def forward(self, x):
                x, _ = self.lstm1(x)
                x, _ = self.lstm2(x)
                x = self.dense(x[:, -1, :])
                return x

        self.model = LSTMModel()
        criterion = nn.MSELoss()
        optimizer = optim.Adam(self.model.parameters(), lr=0.001)

        epochs = 20
        batch_size = 32
        for epoch in range(epochs):
            self.model.train()
            for i in range(0, len(X), batch_size):
                batch_X = X[i:i+batch_size]
                batch_y = y[i:i+batch_size]
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
        
        logger.info(f"Modèle LSTM entraîné pour le véhicule {vehicle_id}")
        return True

    def predict_maintenance(self, vehicle_id):
        data = self.prepare_telemetry_data(vehicle_id)
        if data is None or len(data) < 10:
            return {"maintenance_needed": False, "wear_level": 0.0}

        scaled_data = self.scaler.transform(data)
        X = torch.tensor(np.array([scaled_data[-10:]]), dtype=torch.float32)
        
        self.model.eval()
        with torch.no_grad():
            prediction = self.model(X)[0][0].item()
        wear_level = self.scaler.inverse_transform([[prediction, 0, 0]])[0][0]
        maintenance_needed = wear_level > 0.8
        logger.info(f"Prédiction de maintenance pour le véhicule {vehicle_id}: wear_level={wear_level}, maintenance_needed={maintenance_needed}")
        return {"maintenance_needed": maintenance_needed, "wear_level": float(wear_level)}

class DemandPredictor:
    def __init__(self):
        self.arima_model = None
        self.xgboost_model = None
        self.mongo_client = MongoClient('mongodb://localhost:27017/')
        self.db = self.mongo_client['your_database_name']

    def prepare_demand_data(self, agency_id):
        reservations = self.db.reservations.find({'agence_id': agency_id})
        df = pd.DataFrame(list(reservations))
        df = df.rename(columns={'agence_ville': 'localisation', 'date_debut': 'date'})
        df['date'] = pd.to_datetime(df['date']).dt.date
        demand = df.groupby(['date', 'localisation']).size().reset_index(name='reservations')
        demand = demand.pivot(index='date', columns='localisation', values='reservations').fillna(0)
        weather_data = df.groupby('date').agg({'localisation': lambda x: RecommendationEngine().fetch_weather_forecast(x.iloc[0], x.iloc[0])}).reset_index()
        weather_data['is_rainy'] = weather_data['localisation'].apply(lambda x: x['is_rainy'])
        demand = demand.merge(weather_data[['date', 'is_rainy']], on='date')
        return demand

    def train_arima_model(self, agency_id, location):
        demand = self.prepare_demand_data(agency_id)
        if location not in demand.columns:
            logger.warning(f"Aucune donnée de demande pour {location} dans l'agence {agency_id}")
            return False
        time_series = demand[location]
        self.arima_model = ARIMA(time_series, order=(5, 1, 0))
        self.arima_model = self.arima_model.fit()
        logger.info(f"Modèle ARIMA entraîné pour {location} dans l'agence {agency_id}")
        return True

    def train_xgboost_model(self, agency_id, location):
        demand = self.prepare_demand_data(agency_id)
        if location not in demand.columns:
            logger.warning(f"Aucune donnée de demande pour {location} dans l'agence {agency_id}")
            return False
        X = demand[['is_rainy']].values
        y = demand[location].values
        self.xgboost_model = XGBRegressor(n_estimators=100, learning_rate=0.1)
        self.xgboost_model.fit(X, y)
        logger.info(f"Modèle XGBoost entraîné pour {location} dans l'agence {agency_id}")
        return True

    def predict_demand(self, agency_id, location, date):
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            logger.error(f"Format de date invalide: {date}")
            return 0
        demand = self.prepare_demand_data(agency_id)
        if location not in demand.columns:
            return 0
        if not self.arima_model:
            self.train_arima_model(agency_id, location)
        if not self.xgboost_model:
            self.train_xgboost_model(agency_id, location)

        forecast = self.arima_model.forecast(steps=7)
        arima_pred = forecast[-1]

        weather = self.fetch_weather_forecast(location, date)
        xgboost_pred = self.xgboost_model.predict(np.array([[weather['is_rainy']]]))[0]

        combined_pred = 0.6 * arima_pred + 0.4 * xgboost_pred
        logger.info(f"Prédiction de demande pour {location} à {date}: {combined_pred}")
        return float(combined_pred)