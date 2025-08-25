"""
Middleware avancé pour gérer les problèmes de connexion MongoDB avec Djongo
Corrige spécifiquement l'erreur "Cannot use MongoClient after close"
"""
from django.db import connection
from django.http import JsonResponse
from django.core.exceptions import ImproperlyConfigured
import logging
import threading
import time
from functools import wraps

logger = logging.getLogger(__name__)

class DjongoConnectionMiddleware:
    """
    Middleware pour gérer les connexions MongoDB avec Djongo
    Résout les problèmes de connexions fermées prématurément
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.connection_lock = threading.Lock()
        self.last_connection_check = 0
        self.connection_check_interval = 30  # Vérifier toutes les 30 secondes

    def __call__(self, request):
        # Vérifier et réparer la connexion si nécessaire
        self._ensure_connection_health()
        
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            if self._is_connection_error(e):
                logger.warning(f"Erreur de connexion détectée: {e}")
                # Tenter de réparer la connexion et réessayer
                if self._repair_connection():
                    try:
                        response = self.get_response(request)
                        return response
                    except Exception as retry_e:
                        logger.error(f"Échec de réparation de connexion: {retry_e}")
                        return self._create_error_response(retry_e)
                else:
                    return self._create_error_response(e)
            else:
                raise

    def _ensure_connection_health(self):
        """Vérifier périodiquement la santé de la connexion"""
        current_time = time.time()
        
        if current_time - self.last_connection_check > self.connection_check_interval:
            with self.connection_lock:
                if current_time - self.last_connection_check > self.connection_check_interval:
                    try:
                        self._test_connection()
                        self.last_connection_check = current_time
                    except Exception as e:
                        logger.warning(f"Test de connexion échoué: {e}")
                        self._repair_connection()
                        self.last_connection_check = current_time

    def _test_connection(self):
        """Tester la connexion de base de données"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception as e:
            if self._is_connection_error(e):
                raise
            # Autres erreurs non liées à la connexion
            pass

    def _is_connection_error(self, exception):
        """Détecter si une exception est liée à un problème de connexion"""
        error_msg = str(exception).lower()
        connection_errors = [
            'cannot use mongoclient after close',
            'connection closed',
            'connection lost',
            'server selection timeout',
            'network timeout',
            'connection refused',
            'no server available'
        ]
        return any(error in error_msg for error in connection_errors)

    def _repair_connection(self):
        """Réparer la connexion de base de données"""
        try:
            logger.info("Tentative de réparation de la connexion MongoDB...")
            
            # Fermer la connexion existante
            if hasattr(connection, 'close'):
                connection.close()
            
            # Forcer la reconnexion lors de la prochaine utilisation
            if hasattr(connection, 'connect'):
                connection.connect()
            
            # Tester la nouvelle connexion
            self._test_connection()
            
            logger.info("✅ Connexion MongoDB réparée avec succès")
            return True
            
        except Exception as e:
            logger.error(f"❌ Échec de réparation de connexion: {e}")
            return False

    def _create_error_response(self, exception):
        """Créer une réponse d'erreur appropriée"""
        return JsonResponse({
            'error': 'Problème de connexion à la base de données',
            'message': 'Veuillez réessayer dans quelques instants',
            'details': str(exception) if logger.isEnabledFor(logging.DEBUG) else None
        }, status=503)

    def process_exception(self, request, exception):
        """Traiter les exceptions non gérées"""
        if self._is_connection_error(exception):
            logger.error(f"Exception de connexion non gérée: {exception}")
            
            # Tenter une réparation d'urgence
            if self._repair_connection():
                logger.info("Connexion réparée après exception")
            
            return self._create_error_response(exception)
        
        return None


class MongoConnectionPoolMiddleware:
    """
    Middleware alternatif utilisant un pool de connexions personnalisé
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self._init_connection_pool()

    def _init_connection_pool(self):
        """Initialiser le pool de connexions"""
        try:
            from pymongo import MongoClient
            from django.conf import settings
            
            db_config = settings.DATABASES.get('default', {})
            client_config = db_config.get('CLIENT', {})
            
            # Configuration du pool de connexions
            pool_config = {
                'maxPoolSize': 50,
                'minPoolSize': 5,
                'maxIdleTimeMS': 30000,
                'waitQueueTimeoutMS': 5000,
                'serverSelectionTimeoutMS': 5000,
                'connectTimeoutMS': 5000,
                'socketTimeoutMS': 5000,
                'retryWrites': True,
                'retryReads': True,
            }
            
            # Fusionner avec la configuration existante
            final_config = {**client_config, **pool_config}
            
            # Créer le client avec pool
            host = final_config.pop('host', 'mongodb://localhost:27017/')
            self.mongo_client = MongoClient(host, **final_config)
            
            logger.info("Pool de connexions MongoDB initialisé")
            
        except Exception as e:
            logger.error(f"Erreur initialisation pool MongoDB: {e}")
            self.mongo_client = None

    def __call__(self, request):
        # Vérifier la santé du pool
        if self.mongo_client:
            try:
                # Test ping pour vérifier la connexion
                self.mongo_client.admin.command('ping')
            except Exception as e:
                logger.warning(f"Pool de connexions défaillant: {e}")
                self._recreate_pool()

        return self.get_response(request)

    def _recreate_pool(self):
        """Recréer le pool de connexions"""
        try:
            if self.mongo_client:
                self.mongo_client.close()
            self._init_connection_pool()
        except Exception as e:
            logger.error(f"Erreur recréation pool: {e}")


def mongo_connection_retry(max_retries=3, delay=1):
    """
    Décorateur pour retry automatique en cas d'erreur de connexion MongoDB
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    
                    error_msg = str(e).lower()
                    if any(error in error_msg for error in [
                        'cannot use mongoclient after close',
                        'connection closed',
                        'server selection timeout'
                    ]):
                        logger.warning(f"Tentative {attempt + 1}/{max_retries} échouée: {e}")
                        time.sleep(delay * (attempt + 1))
                        
                        # Tenter de réparer la connexion
                        try:
                            connection.close()
                        except:
                            pass
                    else:
                        raise
            return None
        return wrapper
    return decorator


class DatabaseHealthChecker:
    """
    Utilitaire pour vérifier périodiquement la santé de la base de données
    """
    
    def __init__(self):
        self.last_check = 0
        self.check_interval = 60  # 1 minute
        self.is_healthy = True

    def check_health(self):
        """Vérifier la santé de la base de données"""
        current_time = time.time()
        
        if current_time - self.last_check > self.check_interval:
            try:
                from pymongo import MongoClient
                from django.conf import settings
                
                db_config = settings.DATABASES.get('default', {})
                client_config = db_config.get('CLIENT', {})
                host = client_config.get('host', 'mongodb://localhost:27017/')
                
                # Test de connexion rapide
                client = MongoClient(host, serverSelectionTimeoutMS=3000)
                client.admin.command('ping')
                client.close()
                
                self.is_healthy = True
                logger.debug("Check santé MongoDB: ✅")
                
            except Exception as e:
                self.is_healthy = False
                logger.warning(f"Check santé MongoDB: ❌ {e}")
            
            self.last_check = current_time

        return self.is_healthy

# Instance globale du health checker
db_health_checker = DatabaseHealthChecker()
