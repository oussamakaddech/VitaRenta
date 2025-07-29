# backend/recommendation_system.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from django.conf import settings
from pymongo import MongoClient
import logging
from .utils import calculate_eco_score
from .data_preparation import prepare_dataset
import traceback
import threading
import time

logger = logging.getLogger(__name__)

class RecommendationEngine:
    _model_cache = None
    _dataset_cache = None
    _cache_timestamp = None
    _cache_duration = 3600

    # User ID mapping (UUID to dataset ID)
    USER_ID_MAPPING = {
        '0b22af1e-582c-48ab-9bb7-f64ca348a81c': 'U0001'
    }

    def __init__(self):
        self.dataset = None
        self.df = None
        self.scaler = StandardScaler()
        self.mongo_client = None
        self.db = None
        self.user_features_df = None
        self._initialize_db()
        self._load_cached_data()

    def _load_cached_data(self):
        current_time = time.time()
        if (RecommendationEngine._dataset_cache is not None and 
            RecommendationEngine._cache_timestamp is not None and
            (current_time - RecommendationEngine._cache_timestamp) < RecommendationEngine._cache_duration):
            logger.info("Loading recommendation data from cache")
            self.df = RecommendationEngine._dataset_cache
            return True
        return False

    def _cache_data(self):
        RecommendationEngine._dataset_cache = self.df
        RecommendationEngine._cache_timestamp = time.time()
        logger.info("Dataset cached successfully")

    def _initialize_db(self):
        try:
            self.mongo_client = MongoClient(settings.DATABASES['default']['CLIENT']['host'])
            self.db = self.mongo_client[settings.DATABASES['default']['NAME']]
            logger.info("Database connection initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database connection: {str(e)}")
            self.mongo_client = None
            self.db = None

    def prepare_user_features(self, csv_path):
        logger.info(f"Preparing user features from CSV: {csv_path}")
        try:
            if self.df is not None:
                logger.info("Using cached dataset")
            else:
                self.df = prepare_dataset(csv_path, dataset_type="recommendation")
                if self.df.empty:
                    logger.error("No recommendation data found - dataset is empty")
                    self.df = None
                    return False
                logger.info(f"Dataset size: {len(self.df)} rows")
                self._cache_data()

            user_features = []
            for user_id, group in self.df.groupby('user_id'):
                try:
                    user_data = group.iloc[0]
                    hist_marques = user_data.get('historique_reservations', [])
                    preferred_brands = [res.get('marque', 'unknown') for res in hist_marques if res.get('marque') and res.get('marque') != 'unknown']
                    features = {
                        'user_id': str(user_id),
                        'preference_carburant': user_data.get('preference_carburant', 'essence'),
                        'budget_journalier': float(user_data.get('budget_journalier', 100)),
                        'preferred_brands': preferred_brands
                    }
                    user_features.append(features)
                except Exception as e:
                    logger.warning(f"Error processing user {user_id}: {str(e)}")
                    continue
            self.user_features_df = pd.DataFrame(user_features) if user_features else pd.DataFrame(columns=['user_id', 'preference_carburant', 'budget_journalier', 'preferred_brands'])
            logger.info(f"Prepared {len(self.user_features_df)} user features")
            return True
        except Exception as e:
            logger.error(f"Error preparing user features: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            self.user_features_df = pd.DataFrame(columns=['user_id', 'preference_carburant', 'budget_journalier', 'preferred_brands'])
            return False

    def simple_content_based_recommendation(self, user_id, n_items=5, marque_filter=None):
        try:
            logger.info(f"Generating simple content-based recommendations for user {user_id}")
            # Map UUID to dataset user_id
            mapped_user_id = self.USER_ID_MAPPING.get(str(user_id), str(user_id))
            user_row = self.user_features_df[self.user_features_df['user_id'] == mapped_user_id] if self.user_features_df is not None else pd.DataFrame()
            if user_row.empty:
                logger.warning(f"User {mapped_user_id} not found in features, using defaults")
                user_prefs = {
                    'preference_carburant': 'essence',
                    'budget_journalier': 150.0,
                    'preferred_brands': ['Kia', 'Fiat', 'Citroën']
                }
            else:
                user_prefs = user_row.iloc[0].to_dict()

            if not self.db:
                logger.error("No database connection available")
                return []

            query = {
                '$or': [
                    {'statut': 'disponible'},
                    {'statut': 'available'},
                    {'status': 'available'},
                    {'disponibilite': True}
                ],
                'marque': {'$nin': ['unknown', 'aaaaaaaa', '', None]}
            }
            if marque_filter:
                query['marque'] = marque_filter
            elif user_prefs['preferred_brands']:
                query['marque'] = {'$in': user_prefs['preferred_brands']}

            vehicles = list(self.db.core_vehicule.find(query).limit(n_items * 3))
            if not vehicles:
                logger.warning(f"No vehicles found with availability filter for marque={marque_filter or user_prefs['preferred_brands']}, trying all vehicles")
                query.pop('$or')
                vehicles = list(self.db.core_vehicule.find(query).limit(n_items * 2))
            if not vehicles:
                logger.error(f"No vehicles found in database for marque={marque_filter or user_prefs['preferred_brands']}")
                return []

            scored_vehicles = []
            for vehicle in vehicles:
                try:
                    score = 0.0
                    if vehicle.get('marque') in user_prefs.get('preferred_brands', []):
                        score += 0.4
                    if vehicle.get('carburant') == user_prefs.get('preference_carburant', 'essence'):
                        score += 0.2
                    budget = user_prefs.get('budget_journalier', 150.0)
                    prix = float(vehicle.get('prix_par_jour', 100))
                    price_ratio = min(budget / max(prix, 1), 1.0)
                    score += 0.2 * price_ratio
                    eco_score = self.calculate_eco_score(
                        vehicle.get('emissionsCO2', 120),
                        vehicle.get('carburant', 'essence')
                    )
                    score += 0.15 * eco_score
                    max_price = max(float(v.get('prix_par_jour', 100)) for v in vehicles)
                    price_score = 1.0 - (prix / max_price) if max_price > 0 else 1.0
                    score += 0.05 * price_score

                    formatted_vehicle = self._format_vehicle_data(vehicle)
                    if formatted_vehicle:
                        formatted_vehicle['score'] = score
                        scored_vehicles.append(formatted_vehicle)
                except Exception as e:
                    logger.warning(f"Error scoring vehicle {vehicle.get('id')}: {str(e)}")
                    continue

            scored_vehicles.sort(key=lambda x: x['score'], reverse=True)
            top_vehicles = scored_vehicles[:n_items]
            logger.info(f"Content-based scoring completed, top score: {top_vehicles[0]['score']:.3f}" if top_vehicles else "No valid vehicles")
            return top_vehicles
        except Exception as e:
            logger.error(f"Error in content-based recommendation: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return []

    def recommend_vehicles(self, user_id, n_items=5, csv_path=None, type_vehicule=None, marque_filter=None):
        try:
            if csv_path and not self.prepare_user_features(csv_path):
                logger.warning("Failed to prepare user features, using defaults")
            
            recommendations = self.simple_content_based_recommendation(user_id, n_items, marque_filter)
            if not recommendations:
                logger.warning("Content-based recommendations failed, using database fallback")
                return self._database_fallback_recommendations(user_id, n_items, type_vehicule, marque_filter)
            
            if type_vehicule:
                recommendations = [r for r in recommendations if r.get('type_vehicule', '').lower() == type_vehicule.lower()]
            
            return recommendations[:n_items]
        except Exception as e:
            logger.error(f"Error in recommend_vehicles for user {user_id}: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return self._database_fallback_recommendations(user_id, n_items, type_vehicule, marque_filter)

    def _format_vehicle_data(self, vehicle):
        try:
            marque = vehicle.get('marque') or vehicle.get('brand') or 'Unknown'
            if marque in ['unknown', 'aaaaaaaa', '', None]:
                logger.warning(f"Skipping vehicle {vehicle.get('id')} with invalid marque: {marque}")
                return None
            modele = vehicle.get('modele') or vehicle.get('model') or 'Unknown'
            carburant = vehicle.get('carburant') or vehicle.get('fuel') or 'essence'
            prix_par_jour = vehicle.get('prix_par_jour') or vehicle.get('price_per_day') or 100
            localisation = vehicle.get('localisation') or vehicle.get('location') or 'Tunis'
            type_vehicule = vehicle.get('type_vehicule') or vehicle.get('vehicle_type') or 'berline'
            emissions = vehicle.get('emissionsCO2') or vehicle.get('emissions') or 120
            try:
                prix_par_jour = float(prix_par_jour)
                emissions = float(emissions)
            except (ValueError, TypeError):
                prix_par_jour = 100.0
                emissions = 120.0
            if prix_par_jour <= 0:
                logger.warning(f"Skipping vehicle {vehicle.get('id')} with invalid price: {prix_par_jour}")
                return None
            return {
                'id': str(vehicle.get('id', '')),
                'marque': str(marque),
                'modele': str(modele),
                'carburant': str(carburant),
                'prix_par_jour': prix_par_jour,
                'localisation': str(localisation),
                'type_vehicule': str(type_vehicule),
                'emissionsCO2': emissions,
                'statut': vehicle.get('statut', 'disponible')
            }
        except Exception as e:
            logger.error(f"Error formatting vehicle data: {str(e)}")
            return None

    def _database_fallback_recommendations(self, user_id, n_items, type_vehicule=None, marque_filter=None):
        logger.info(f"Using database fallback recommendations for user {user_id}")
        if not self.db:
            logger.error("No database connection for fallback recommendations")
            return []
        try:
            mapped_user_id = self.USER_ID_MAPPING.get(str(user_id), str(user_id))
            query = {
                '$or': [
                    {'statut': 'disponible'},
                    {'statut': 'available'},
                    {'status': 'available'},
                    {'disponibilite': True}
                ],
                'marque': {'$nin': ['unknown', 'aaaaaaaa', '', None]}
            }
            if marque_filter:
                query['marque'] = marque_filter
            elif mapped_user_id and self.user_features_df is not None:
                user_row = self.user_features_df[self.user_features_df['user_id'] == mapped_user_id]
                if not user_row.empty:
                    preferred_brands = user_row.iloc[0].get('preferred_brands', ['Kia', 'Fiat', 'Citroën'])
                    if preferred_brands:
                        query['marque'] = {'$in': preferred_brands}
            if type_vehicule:
                query['type_vehicule'] = type_vehicule

            vehicles = list(self.db.core_vehicule.find(query).limit(n_items * 3))
            if not vehicles:
                logger.warning("No vehicles found with availability filter, trying all vehicles")
                query.pop('$or')
                vehicles = list(self.db.core_vehicule.find(query).limit(n_items * 2))
            if not vehicles:
                logger.error("No vehicles found in database at all")
                return []

            scored_vehicles = []
            user_prefs = {'preferred_brands': ['Kia', 'Fiat', 'Citroën'], 'preference_carburant': 'essence', 'budget_journalier': 150.0}
            if mapped_user_id and self.user_features_df is not None:
                user_row = self.user_features_df[self.user_features_df['user_id'] == mapped_user_id]
                if not user_row.empty:
                    user_prefs = user_row.iloc[0].to_dict()

            for vehicle in vehicles:
                try:
                    score = self._calculate_fallback_score(vehicle, user_prefs)
                    formatted_vehicle = self._format_vehicle_data(vehicle)
                    if formatted_vehicle:
                        formatted_vehicle['score'] = score
                        scored_vehicles.append(formatted_vehicle)
                except Exception as e:
                    logger.warning(f"Error scoring vehicle {vehicle.get('id')}: {str(e)}")
                    continue

            scored_vehicles.sort(key=lambda x: x['score'], reverse=True)
            formatted_vehicles = scored_vehicles[:n_items]
            logger.info(f"Fallback: Generated {len(formatted_vehicles)} recommendations")
            return formatted_vehicles
        except Exception as e:
            logger.error(f"Error in database fallback recommendations: {str(e)}")
            return []

    def _calculate_fallback_score(self, vehicle, user_prefs):
        try:
            score = 0.0
            emissions = float(vehicle.get('emissionsCO2', 120))
            carburant = vehicle.get('carburant', 'essence')
            eco_score = self.calculate_eco_score(emissions, carburant)
            score += eco_score * 0.3
            prix = float(vehicle.get('prix_par_jour', 100))
            if prix > 0:
                price_score = max(0, (500 - prix) / 500)
                score += price_score * 0.2
            if carburant in ['électrique', 'hybride']:
                score += 0.15
            elif carburant == 'diesel':
                score += 0.1
            if vehicle.get('marque') in user_prefs.get('preferred_brands', []):
                score += 0.3
            import random
            score += random.uniform(0, 0.05)
            return min(score, 1.0)
        except Exception as e:
            logger.warning(f"Error calculating fallback score: {str(e)}")
            return 0.5

    def calculate_eco_score(self, emissionsCO2, carburant):
        return calculate_eco_score(emissionsCO2, carburant)

    def __del__(self):
        if self.mongo_client:
            try:
                self.mongo_client.close()
            except:
                pass