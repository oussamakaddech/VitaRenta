"""
Utilitaires pour la gestion des connexions MongoDB avec Djongo
Corrige les problèmes de connexions fermées et optimise les performances
"""

import os
import logging
import threading
import time
from contextlib import contextmanager
from functools import wraps
from typing import Optional, Dict, Any

from django.conf import settings
from django.db import connection
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure

logger = logging.getLogger(__name__)

class MongoConnectionManager:
    """
    Gestionnaire centralisé des connexions MongoDB
    Singleton pour éviter les multiples instances
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.initialized = True
            self._mongo_client: Optional[MongoClient] = None
            self._connection_lock = threading.Lock()
            self._last_health_check = 0
            self._health_check_interval = 30  # 30 secondes
            self._is_healthy = True
            self._connection_retries = 0
            self._max_retries = 3

    @property
    def client(self) -> Optional[MongoClient]:
        """Obtenir le client MongoDB avec vérification de santé"""
        if not self._is_connection_healthy():
            self._reconnect()
        return self._mongo_client

    def _is_connection_healthy(self) -> bool:
        """Vérifier si la connexion est saine"""
        current_time = time.time()
        
        # Vérification périodique
        if current_time - self._last_health_check > self._health_check_interval:
            self._perform_health_check()
            self._last_health_check = current_time
        
        return self._is_healthy

    def _perform_health_check(self):
        """Effectuer une vérification de santé de la connexion"""
        try:
            if self._mongo_client:
                # Test ping rapide
                self._mongo_client.admin.command('ping')
                self._is_healthy = True
                self._connection_retries = 0
                logger.debug("✅ Connexion MongoDB saine")
            else:
                self._is_healthy = False
        except Exception as e:
            logger.warning(f"⚠️ Problème de connexion MongoDB: {e}")
            self._is_healthy = False

    def _get_connection_config(self) -> Dict[str, Any]:
        """Obtenir la configuration de connexion depuis Django settings"""
        try:
            db_config = settings.DATABASES.get('default', {})
            client_config = db_config.get('CLIENT', {})
            
            # Configuration par défaut optimisée
            default_config = {
                'maxPoolSize': 50,
                'minPoolSize': 5,
                'maxIdleTimeMS': 30000,
                'waitQueueTimeoutMS': 5000,
                'serverSelectionTimeoutMS': 5000,
                'connectTimeoutMS': 5000,
                'socketTimeoutMS': 5000,
                'retryWrites': True,
                'retryReads': True,
                'heartbeatFrequencyMS': 10000,
            }
            
            # Fusionner avec la configuration Django
            final_config = {**default_config, **client_config}
            
            return final_config
        except Exception as e:
            logger.error(f"Erreur récupération config MongoDB: {e}")
            return {}

    def _reconnect(self):
        """Reconnecter à MongoDB"""
        with self._connection_lock:
            if self._connection_retries >= self._max_retries:
                logger.error("Nombre maximum de tentatives de reconnexion atteint")
                return
            
            try:
                logger.info("🔄 Tentative de reconnexion MongoDB...")
                
                # Fermer l'ancienne connexion si elle existe
                if self._mongo_client:
                    try:
                        self._mongo_client.close()
                    except:
                        pass
                    self._mongo_client = None
                
                # Créer une nouvelle connexion
                config = self._get_connection_config()
                host = config.pop('host', 'mongodb://localhost:27017/')
                
                self._mongo_client = MongoClient(host, **config)
                
                # Tester la nouvelle connexion
                self._mongo_client.admin.command('ping')
                
                self._is_healthy = True
                self._connection_retries = 0
                logger.info("✅ Reconnexion MongoDB réussie")
                
            except Exception as e:
                self._connection_retries += 1
                logger.error(f"❌ Échec reconnexion MongoDB (tentative {self._connection_retries}): {e}")
                time.sleep(min(self._connection_retries * 2, 10))  # Backoff exponentiel

    def close(self):
        """Fermer la connexion MongoDB"""
        with self._connection_lock:
            if self._mongo_client:
                try:
                    self._mongo_client.close()
                    logger.info("Connexion MongoDB fermée")
                except Exception as e:
                    logger.warning(f"Erreur fermeture connexion: {e}")
                finally:
                    self._mongo_client = None
                    self._is_healthy = False

    def get_database(self, db_name: Optional[str] = None) -> Optional[object]:
        """Obtenir une instance de base de données"""
        if not db_name:
            db_config = settings.DATABASES.get('default', {})
            db_name = db_config.get('NAME', 'vitarenta_db')
        
        client = self.client
        if client:
            return client[db_name]
        return None

# Instance globale du gestionnaire
mongo_manager = MongoConnectionManager()

@contextmanager
def mongo_connection():
    """
    Context manager pour utiliser une connexion MongoDB sûre
    
    Usage:
        with mongo_connection() as db:
            if db:
                collection = db['ma_collection']
                # utiliser la collection...
    """
    db = None
    try:
        db = mongo_manager.get_database()
        yield db
    except Exception as e:
        logger.error(f"Erreur dans mongo_connection: {e}")
        yield None
    finally:
        # Pas besoin de fermer, géré par le pool
        pass

def mongo_retry(max_retries: int = 3, delay: float = 1.0):
    """
    Décorateur pour retry automatique des opérations MongoDB
    
    Args:
        max_retries: Nombre maximum de tentatives
        delay: Délai entre les tentatives (avec backoff exponentiel)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    # Erreurs qui justifient un retry
                    retry_errors = [
                        'cannot use mongoclient after close',
                        'connection closed',
                        'server selection timeout',
                        'network timeout',
                        'connection refused'
                    ]
                    
                    should_retry = any(error in error_msg for error in retry_errors)
                    
                    if attempt == max_retries - 1 or not should_retry:
                        logger.error(f"Échec définitif après {attempt + 1} tentatives: {e}")
                        raise
                    
                    wait_time = delay * (2 ** attempt)  # Backoff exponentiel
                    logger.warning(f"Tentative {attempt + 1}/{max_retries} échouée: {e}. "
                                 f"Retry dans {wait_time}s...")
                    
                    time.sleep(wait_time)
                    
                    # Forcer une reconnexion
                    mongo_manager._reconnect()
            
            return None
        return wrapper
    return decorator

def django_connection_retry(max_retries: int = 3):
    """
    Décorateur spécifique pour les opérations Django/Djongo
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    error_msg = str(e).lower()
                    
                    if 'cannot use mongoclient after close' in error_msg:
                        logger.warning(f"Connexion Django fermée, tentative {attempt + 1}/{max_retries}")
                        
                        if attempt < max_retries - 1:
                            # Forcer la fermeture de la connexion Django
                            try:
                                connection.close()
                            except:
                                pass
                            
                            time.sleep(1)
                            continue
                    
                    # Re-lancer l'exception si pas de retry ou dernière tentative
                    raise
            
            return None
        return wrapper
    return decorator

class DatabaseHealthMonitor:
    """
    Moniteur de santé de la base de données
    """
    
    def __init__(self):
        self.last_check = 0
        self.check_interval = 60  # 1 minute
        self.is_healthy = True
        self.error_count = 0
        self.max_errors = 5

    def check_django_connection(self) -> bool:
        """Vérifier la connexion Django/Djongo"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return True
        except Exception as e:
            logger.warning(f"Problème connexion Django: {e}")
            return False

    def check_mongo_connection(self) -> bool:
        """Vérifier la connexion MongoDB directe"""
        try:
            with mongo_connection() as db:
                if db:
                    db.command('ping')
                    return True
            return False
        except Exception as e:
            logger.warning(f"Problème connexion MongoDB: {e}")
            return False

    def perform_health_check(self) -> Dict[str, Any]:
        """Effectuer un check complet de santé"""
        current_time = time.time()
        
        if current_time - self.last_check > self.check_interval:
            django_ok = self.check_django_connection()
            mongo_ok = self.check_mongo_connection()
            
            self.is_healthy = django_ok and mongo_ok
            
            if not self.is_healthy:
                self.error_count += 1
            else:
                self.error_count = 0
            
            self.last_check = current_time
            
            result = {
                'django_connection': django_ok,
                'mongo_connection': mongo_ok,
                'overall_health': self.is_healthy,
                'error_count': self.error_count,
                'timestamp': current_time
            }
            
            if self.error_count >= self.max_errors:
                logger.error("Nombre critique d'erreurs de connexion atteint")
            
            return result
        
        return {
            'cached': True,
            'overall_health': self.is_healthy,
            'error_count': self.error_count
        }

# Instance globale du moniteur
health_monitor = DatabaseHealthMonitor()

# Fonction utilitaire pour les vues Django
def ensure_db_connection():
    """
    Fonction utilitaire pour s'assurer que la connexion DB est disponible
    À utiliser dans les vues qui accèdent à la base de données
    """
    try:
        health_status = health_monitor.perform_health_check()
        if not health_status.get('overall_health', False):
            logger.warning("Base de données non disponible, tentative de réparation...")
            mongo_manager._reconnect()
            
            # Réessayer le check
            health_status = health_monitor.perform_health_check()
            
        return health_status.get('overall_health', False)
    except Exception as e:
        logger.error(f"Erreur vérification connexion DB: {e}")
        return False
