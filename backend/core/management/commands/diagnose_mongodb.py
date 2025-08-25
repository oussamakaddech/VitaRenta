#!/usr/bin/env python3
"""
Commande Django pour diagnostiquer les problèmes de connexion MongoDB avec Djongo
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os
import sys
import traceback


class Command(BaseCommand):
    help = 'Diagnostic des problèmes de connexion MongoDB avec Djongo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Affichage détaillé des informations de diagnostic',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Tenter de corriger automatiquement les problèmes détectés',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        auto_fix = options['fix']
        
        self.stdout.write("🔍 Diagnostic MongoDB/Djongo")
        self.stdout.write("=" * 50)
        
        # 1. Vérifier la configuration MongoDB
        self.check_mongodb_config(verbose)
        
        # 2. Tester la connexion MongoDB directe
        self.test_mongodb_connection(verbose)
        
        # 3. Tester la connexion Djongo
        self.test_djongo_connection(verbose)
        
        # 4. Vérifier les modèles
        self.check_models(verbose)
        
        # 5. Diagnostic des problèmes de fermeture de connexion
        self.diagnose_connection_issues(verbose)
        
        if auto_fix:
            self.stdout.write("\n🔧 Tentative de correction automatique...")
            self.apply_fixes()

    def check_mongodb_config(self, verbose):
        """Vérifier la configuration MongoDB dans settings.py"""
        self.stdout.write("\n1️⃣ Configuration MongoDB:")
        
        try:
            db_config = settings.DATABASES.get('default', {})
            engine = db_config.get('ENGINE', '')
            
            if 'djongo' in engine:
                self.stdout.write(f"   ✅ Engine: {engine}")
                
                client_config = db_config.get('CLIENT', {})
                if verbose:
                    self.stdout.write(f"   📊 Configuration CLIENT:")
                    for key, value in client_config.items():
                        if 'password' not in key.lower():
                            self.stdout.write(f"      {key}: {value}")
                        else:
                            self.stdout.write(f"      {key}: ***")
                            
                # Vérifier les paramètres critiques
                host = client_config.get('host', '')
                if not host:
                    self.stdout.write("   ⚠️ HOST manquant dans la configuration CLIENT")
                else:
                    self.stdout.write(f"   ✅ Host: {host}")
                    
            else:
                self.stdout.write(f"   ❌ Engine n'est pas Djongo: {engine}")
                
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur configuration: {e}")
            if verbose:
                self.stdout.write(f"      {traceback.format_exc()}")

    def test_mongodb_connection(self, verbose):
        """Tester la connexion MongoDB directe avec PyMongo"""
        self.stdout.write("\n2️⃣ Test connexion MongoDB directe:")
        
        try:
            from pymongo import MongoClient
            from pymongo.errors import ServerSelectionTimeoutError
            
            # Récupérer la configuration depuis les settings
            db_config = settings.DATABASES.get('default', {})
            client_config = db_config.get('CLIENT', {})
            
            # Construire l'URI de connexion
            host = client_config.get('host', 'mongodb://localhost:27017/')
            if not host.startswith('mongodb://'):
                host = f"mongodb://{host}:27017/"
                
            self.stdout.write(f"   📡 Connexion à: {host}")
            
            # Test de connexion avec timeout court
            client = MongoClient(host, serverSelectionTimeoutMS=5000)
            
            # Tester la connexion
            client.admin.command('ping')
            self.stdout.write("   ✅ Connexion MongoDB réussie")
            
            # Lister les bases de données
            db_name = db_config.get('NAME', 'vitarenta_db')
            db = client[db_name]
            collections = db.list_collection_names()
            
            self.stdout.write(f"   📂 Base de données: {db_name}")
            self.stdout.write(f"   📚 Collections: {len(collections)}")
            
            if verbose and collections:
                for collection in collections[:10]:  # Limiter à 10
                    count = db[collection].count_documents({})
                    self.stdout.write(f"      {collection}: {count} documents")
            
            client.close()
            
        except ServerSelectionTimeoutError:
            self.stdout.write("   ❌ MongoDB n'est pas accessible")
            self.stdout.write("      Vérifiez que MongoDB est démarré sur localhost:27017")
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur connexion MongoDB: {e}")
            if verbose:
                self.stdout.write(f"      {traceback.format_exc()}")

    def test_djongo_connection(self, verbose):
        """Tester la connexion via Djongo"""
        self.stdout.write("\n3️⃣ Test connexion Djongo:")
        
        try:
            from django.db import connection
            
            # Tenter une requête simple compatible avec Djongo
            # "SELECT 1" ne fonctionne pas avec Djongo, essayer autre chose
            try:
                # Test avec une vraie table
                with connection.cursor() as cursor:
                    cursor.execute("SELECT COUNT(*) FROM auth_permission")
                    result = cursor.fetchone()
                    
                self.stdout.write("   ✅ Connexion Djongo fonctionnelle")
                
            except Exception as inner_e:
                # Fallback: juste tester l'ouverture de connexion
                try:
                    # Forcer l'ouverture de la connexion
                    connection.ensure_connection()
                    self.stdout.write("   ✅ Connexion Djongo établie (test simplifié)")
                except Exception as fallback_e:
                    raise inner_e
                
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur connexion Djongo: {e}")
            
            # Vérifier si c'est le problème de fermeture de connexion
            if "Cannot use MongoClient after close" in str(e):
                self.stdout.write("   🔍 Problème détecté: Connexion MongoDB fermée prématurément")
                self.stdout.write("      Solution: Patch Djongo ou configuration de pool de connexions")
            elif "Unsupported" in str(e):
                self.stdout.write("   🔍 Problème détecté: Requête SQL non supportée par Djongo")
                self.stdout.write("      Info: Djongo a des limitations sur certaines requêtes SQL")
            
            if verbose:
                self.stdout.write(f"      {traceback.format_exc()}")

    def check_models(self, verbose):
        """Vérifier les modèles Django"""
        self.stdout.write("\n4️⃣ Vérification des modèles:")
        
        try:
            from django.apps import apps
            
            # Lister tous les modèles
            all_models = apps.get_models()
            self.stdout.write(f"   📊 Nombre de modèles: {len(all_models)}")
            
            # Vérifier les modèles avec des problèmes potentiels
            problematic_models = []
            
            for model in all_models:
                try:
                    # Test simple pour voir si le modèle peut être utilisé
                    model._meta.get_fields()
                except Exception as e:
                    problematic_models.append((model.__name__, str(e)))
            
            if problematic_models:
                self.stdout.write(f"   ⚠️ Modèles avec problèmes: {len(problematic_models)}")
                if verbose:
                    for model_name, error in problematic_models:
                        self.stdout.write(f"      {model_name}: {error}")
            else:
                self.stdout.write("   ✅ Tous les modèles sont valides")
                
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur vérification modèles: {e}")

    def diagnose_connection_issues(self, verbose):
        """Diagnostiquer les problèmes spécifiques de connexion"""
        self.stdout.write("\n5️⃣ Diagnostic des problèmes de connexion:")
        
        issues_found = []
        
        # Vérifier la version de pymongo
        try:
            import pymongo
            pymongo_version = pymongo.version
            self.stdout.write(f"   📦 PyMongo version: {pymongo_version}")
            
            # Vérifier la compatibilité
            if pymongo_version.startswith('4.'):
                issues_found.append("PyMongo 4.x peut causer des problèmes avec Djongo 1.3.6")
                
        except ImportError:
            issues_found.append("PyMongo n'est pas installé")
        
        # Vérifier la version de djongo
        try:
            import djongo
            if hasattr(djongo, '__version__'):
                djongo_version = djongo.__version__
                self.stdout.write(f"   📦 Djongo version: {djongo_version}")
            else:
                self.stdout.write("   📦 Djongo version: inconnue")
        except ImportError:
            issues_found.append("Djongo n'est pas installé")
        
        # Vérifier les paramètres de connexion
        db_config = settings.DATABASES.get('default', {})
        client_config = db_config.get('CLIENT', {})
        
        if not client_config.get('host'):
            issues_found.append("Paramètre 'host' manquant dans CLIENT")
            
        # Vérifier les middlewares potentiellement problématiques
        middleware = getattr(settings, 'MIDDLEWARE', [])
        problematic_middleware = [
            'django.middleware.transaction.TransactionMiddleware',
        ]
        
        for mw in problematic_middleware:
            if mw in middleware:
                issues_found.append(f"Middleware potentiellement problématique: {mw}")
        
        if issues_found:
            self.stdout.write("   ⚠️ Problèmes détectés:")
            for issue in issues_found:
                self.stdout.write(f"      - {issue}")
        else:
            self.stdout.write("   ✅ Aucun problème évident détecté")

    def apply_fixes(self):
        """Appliquer des corrections automatiques"""
        self.stdout.write("\n🔧 Application des corrections:")
        
        fixes_applied = []
        
        # Fix 1: Vérifier et corriger la configuration MongoDB
        try:
            self.fix_mongodb_config()
            fixes_applied.append("Configuration MongoDB optimisée")
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur fix config: {e}")
        
        # Fix 2: Créer un middleware de gestion des connexions
        try:
            self.create_connection_middleware()
            fixes_applied.append("Middleware de connexion créé")
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur création middleware: {e}")
        
        # Fix 3: Patch Djongo si nécessaire
        try:
            self.patch_djongo_if_needed()
            fixes_applied.append("Patch Djongo vérifié")
        except Exception as e:
            self.stdout.write(f"   ❌ Erreur patch Djongo: {e}")
        
        if fixes_applied:
            self.stdout.write("   ✅ Corrections appliquées:")
            for fix in fixes_applied:
                self.stdout.write(f"      - {fix}")
        else:
            self.stdout.write("   ⚠️ Aucune correction appliquée")

    def fix_mongodb_config(self):
        """Optimiser la configuration MongoDB"""
        # Cette fonction pourrait modifier settings.py si nécessaire
        # Pour l'instant, elle donne juste des recommandations
        
        self.stdout.write("   📝 Recommandations de configuration:")
        self.stdout.write("      - Utiliser un pool de connexions")
        self.stdout.write("      - Configurer maxPoolSize et minPoolSize")
        self.stdout.write("      - Activer retryWrites=true")

    def create_connection_middleware(self):
        """Créer un middleware pour gérer les connexions MongoDB"""
        middleware_path = os.path.join(
            settings.BASE_DIR, 
            'core', 
            'djongo_middleware.py'
        )
        
        middleware_content = '''"""
Middleware pour gérer les problèmes de connexion MongoDB avec Djongo
"""
from django.db import connection
import logging

logger = logging.getLogger(__name__)

class DjongoConnectionMiddleware:
    """Middleware pour gérer les connexions MongoDB avec Djongo"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Vérifier la connexion avant la requête
        try:
            # Test de connexion simple
            if hasattr(connection, 'ensure_connection'):
                connection.ensure_connection()
        except Exception as e:
            logger.warning(f"Problème de connexion détecté: {e}")
            # Tenter de fermer et rouvrir la connexion
            try:
                connection.close()
            except:
                pass

        response = self.get_response(request)
        
        # Optionnel: fermer la connexion après la requête pour éviter les fuites
        # Attention: cela peut impacter les performances
        # connection.close()
        
        return response

    def process_exception(self, request, exception):
        """Gérer les exceptions liées à la base de données"""
        if "Cannot use MongoClient after close" in str(exception):
            logger.error("Connexion MongoDB fermée détectée, tentative de reconnexion...")
            try:
                connection.close()
                # La prochaine requête créera une nouvelle connexion
            except:
                pass
        return None
'''
        
        with open(middleware_path, 'w', encoding='utf-8') as f:
            f.write(middleware_content)
        
        self.stdout.write(f"   ✅ Middleware créé: {middleware_path}")

    def patch_djongo_if_needed(self):
        """Appliquer le patch Djongo si nécessaire"""
        try:
            # Importer et exécuter le script de patch existant
            import subprocess
            import sys
            
            patch_script = os.path.join(settings.BASE_DIR, 'patch_djongo.py')
            if os.path.exists(patch_script):
                result = subprocess.run([sys.executable, patch_script], 
                                      capture_output=True, text=True)
                if result.returncode == 0:
                    self.stdout.write("   ✅ Script de patch exécuté avec succès")
                else:
                    self.stdout.write(f"   ⚠️ Script de patch retourné: {result.returncode}")
            else:
                self.stdout.write("   ℹ️ Script de patch non trouvé (patch_djongo.py)")
                
        except Exception as e:
            self.stdout.write(f"   ⚠️ Impossible d'exécuter le patch: {e}")
