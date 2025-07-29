# backend/recommendation_system.py
import pandas as pd
import numpy as np
from lightfm import LightFM
from lightfm.data import Dataset
from lightfm.evaluation import precision_at_k, auc_score
from sklearn.preprocessing import StandardScaler
import pickle
import os
from django.conf import settings
from pymongo import MongoClient
import logging
from .utils import calculate_eco_score
from .data_preparation import prepare_dataset

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self):
        self.dataset = None
        self.model = None
        self.scaler = StandardScaler()
        self.mongo_client = MongoClient(settings.DATABASES['default']['CLIENT']['host'])
        self.db = self.mongo_client[settings.DATABASES['default']['NAME']]
        self.load_pretrained_model()

    def load_pretrained_model(self):
        model_path = os.path.join(settings.BASE_DIR, 'models', 'lightfm_model.pkl')
        dataset_path = os.path.join(settings.BASE_DIR, 'models', 'lightfm_dataset.pkl')
        try:
            if os.path.exists(model_path) and os.path.exists(dataset_path):
                with open(model_path, 'rb') as f:
                    self.model = pickle.load(f)
                with open(dataset_path, 'rb') as f:
                    self.dataset = pickle.load(f)
                logger.info("Pre-trained LightFM model loaded successfully")
            else:
                logger.info("No pre-trained LightFM model found, training required")
        except Exception as e:
            logger.error(f"Error loading pre-trained model: {str(e)}")
            self.model = None
            self.dataset = None
        finally:
            self.mongo_client.close()

    def prepare_lightfm_data(self, csv_path):
        df = prepare_dataset(csv_path, dataset_type="recommendation")
        if df.empty:
            logger.warning("No recommendation data found")
            return None, None, None, None

        self.dataset = Dataset()
        user_features = []
        for user_id, group in df.groupby('user_id'):
            try:
                user_data = group.iloc[0]
                features = [
                    f"preference_carburant:{user_data['preference_carburant']}",
                    f"budget_range:{min(1000, int(user_data['budget_journalier'] // 10) * 10)}",
                    f"is_rainy:{user_data['is_rainy']}",
                    f"event:{user_data['événement_local']}",
                    f"is_holiday:{user_data['is_holiday']}"
                ]
                for hist in user_data['historique_reservations']:
                    features.append(f"marque:{hist.get('marque', '')}")
                    features.append(f"modele:{hist.get('modele', '')}")
                user_features.append((user_id, features))
            except Exception as e:
                logger.error(f"Error processing user features for user {user_id}: {str(e)}")
                user_features.append((user_id, []))

        vehicle_features = [
            (
                row['vehicle_id'],
                [
                    f"marque:{row['marque']}",
                    f"modele:{row['modele']}",
                    f"carburant:{row['carburant']}",
                    f"prix_range:{min(1000, int(row['prix_par_jour'] // 50) * 50)}",
                    f"eco_score:{round(row['eco_score'], 2)}",
                    f"localisation:{row['localisation']}",
                    f"type_vehicule:{row['type_vehicule']}"
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

    def train_lightfm_model(self, csv_path):
        if self.model and self.dataset:
            logger.info("Using pre-trained LightFM model")
            return self.model

        interactions, weights, user_features, item_features = self.prepare_lightfm_data(csv_path)
        if interactions is None:
            logger.error("Failed to train LightFM model: missing data")
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
        precision = precision_at_k(self.model, interactions, k=5, user_features=user_features, item_features=item_features).mean()
        auc = auc_score(self.model, interactions, user_features=user_features, item_features=item_features).mean()
        logger.info(f"LightFM model trained successfully - Precision@5: {precision:.4f}, AUC: {auc:.4f}")

        # Save model and dataset
        model_path = os.path.join(settings.BASE_DIR, 'models', 'lightfm_model.pkl')
        dataset_path = os.path.join(settings.BASE_DIR, 'models', 'lightfm_dataset.pkl')
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        try:
            with open(model_path, 'wb') as f:
                pickle.dump(self.model, f)
            with open(dataset_path, 'wb') as f:
                pickle.dump(self.dataset, f)
            logger.info("LightFM model and dataset saved successfully")
        except Exception as e:
            logger.error(f"Error saving LightFM model: {str(e)}")
        return self.model

    def recommend_vehicles(self, user_id, n_items=5, csv_path=None):
        if not self.model or not self.dataset:
            if not csv_path:
                raise ValueError("CSV path required for training if no pre-trained model exists")
            self.train_lightfm_model(csv_path)
            if not self.model:
                return []

        n_users, n_items = self.dataset.interactions_shape()
        user_index = self.dataset.mapping()[0].get(user_id, -1)
        if user_index == -1:
            logger.warning(f"User {user_id} not found in dataset")
            return []

        try:
            scores = self.model.predict(
                user_index,
                np.arange(n_items),
                user_features=self.dataset.user_features(),
                item_features=self.dataset.item_features()
            )
            top_items = np.argsort(-scores)[:n_items]
            vehicle_ids = [self.dataset.mapping()[2][i] for i in top_items]
            vehicles = self.db.core_vehicule.find({'id': {'$in': vehicle_ids}, 'statut': 'disponible'})
            vehicles_list = list(vehicles)
            return sorted(vehicles_list, key=lambda v: -calculate_eco_score(v.get('emissionsCO2', 0), v.get('carburant', '')))[:n_items]
        except Exception as e:
            logger.error(f"Error generating recommendations for user {user_id}: {str(e)}")
            return []
        finally:
            self.mongo_client.close()

    def calculate_eco_score(self, emissionsCO2, carburant):
        return calculate_eco_score(emissionsCO2, carburant)