from pathlib import Path
import os
from datetime import timedelta
from django.core.management.utils import get_random_secret_key

# Chemins de base
BASE_DIR = Path(__file__).resolve().parent.parent
LOGS_DIR = BASE_DIR / "logs"
os.makedirs(LOGS_DIR, exist_ok=True)
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
# Répertoires de médias
MEDIA_ROOT = BASE_DIR / "media"
PROFILE_PHOTOS_DIR = MEDIA_ROOT / "profile_photos"
VEHICLE_IMAGES_DIR = MEDIA_ROOT / "vehicle_images"
os.makedirs(PROFILE_PHOTOS_DIR, exist_ok=True)
os.makedirs(VEHICLE_IMAGES_DIR, exist_ok=True)
MEDIA_URL = "/media/"

# Clé secrète et mode de débogage
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", get_random_secret_key())
DEBUG = os.getenv("DJANGO_DEBUG", "True") == "True"

# Liste des hôtes autorisés
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")
if DEBUG:
    ALLOWED_HOSTS = ["*"]

# Modèle d'utilisateur personnalisé
AUTH_USER_MODEL = "users.User"

# Applications installées
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
]

LOCAL_APPS = [
    "users",
    "core",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Middleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.BearerTokenMiddleware",
]

if not os.getenv("DISABLE_RATE_LIMITING", "True") == "True":
    MIDDLEWARE.append("core.middleware.TooManyAttemptsMiddleware")

# Configuration des URL et WSGI
ROOT_URLCONF = "vitarenta.urls"
WSGI_APPLICATION = "vitarenta.wsgi.application"

# Templates
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
DATASETS = {
    'recommendation': os.path.join(BASE_DIR, 'data', 'recommendation_dataset_cars_2025.csv'),
    'demand_forecast': os.path.join(BASE_DIR, 'data', 'demand_forecast_dataset_2025.csv'),
}
# Configuration de la base de données
USE_SQLITE = os.getenv("USE_SQLITE", "False") == "True"
FORCE_MONGODB = os.getenv("FORCE_MONGODB", "True") == "True"

if USE_SQLITE and not FORCE_MONGODB:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            
        }
    }
    print("🔄 Utilisation de SQLite")
else:
    MONGO_HOST = os.getenv("MONGO_HOST", "localhost")
    MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
    MONGO_DB = os.getenv("MONGO_DB", "vitarenta_db")
    MONGO_URI = os.getenv("MONGO_URI", f"mongodb://{MONGO_HOST}:{MONGO_PORT}/")
    MONGO_USER = os.getenv("MONGO_USER", "")
    MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "")

    if MONGO_USER and MONGO_PASSWORD:
        DATABASES = {
            "default": {
                "ENGINE": "djongo",
                "NAME": MONGO_DB,
                "CLIENT": {
                    "host": MONGO_URI,
                    "username": MONGO_USER,
                    "password": MONGO_PASSWORD,
                    "authSource": os.getenv("MONGO_AUTH_SOURCE", "admin"),
                    "authMechanism": os.getenv("MONGO_AUTH_MECHANISM", "SCRAM-SHA-1"),
                    "retryWrites": True,
                    "w": "majority",
                },
                "ENFORCE_SCHEMA": False,
            }
        }
        print(f"🔄 MongoDB avec auth: {MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}")
    else:
        DATABASES = {
            "default": {
                "ENGINE": "djongo",
                "NAME": MONGO_DB,
                "CLIENT": {
                    "host": MONGO_URI,
                    "retryWrites": True,
                    "w": "majority",
                },
                "ENFORCE_SCHEMA": False,
            }
        }
        print(f"🔄 MongoDB sans auth: {MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}")

# Configuration de REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "login": "100/hour" if not os.getenv("DISABLE_RATE_LIMITING", "True") == "True" else "10000/hour",
        "anon": "1000/hour",
        "user": "5000/hour",
        "email_verification_request": "10/hour",
        "password_reset_request": "10/hour",
    },
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": int(os.getenv("API_PAGINATION_SIZE", 50)),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "TOKEN_TYPE_CLAIM": "token_type",
}

# Configuration CORS
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "True") == "True"
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000").split(",")
CORS_ALLOW_CREDENTIALS = True

# Configuration des fichiers statiques et médias
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "/media/"

# Configuration de l'authentification
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Configuration internationale
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Configuration des logs
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "class": "logging.FileHandler",
            "filename": LOGS_DIR / "vitarenta.log",
            "formatter": "verbose",
        },
        "console": {
            "level": os.getenv("LOG_LEVEL", "DEBUG"),
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "": {
            "handlers": ["file", "console"],
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "propagate": True,
        },
        "django": {
            "handlers": ["file", "console"],
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "propagate": True,
        },
    },
}

# Configuration des sessions
SESSION_COOKIE_AGE = 1209600  # 2 semaines en secondes
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False") == "True"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "False") == "True"
CSRF_COOKIE_HTTPONLY = True

# Configuration de la sécurité
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False") == "True"

# Configuration des emails
# ...existing code...
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "oussama.kaddech11@gmail.com")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@vitarenta.com")
EMAIL_TIMEOUT = 10
# Paramètres personnalisés
DISABLE_RATE_LIMITING = os.getenv("DISABLE_RATE_LIMITING", "True") == "True"
ALLOW_ANONYMOUS_ACCESS = os.getenv("ALLOW_ANONYMOUS_ACCESS", "True") == "True"

# Validation des champs monétaires
DECIMAL_SEPARATOR = ","
USE_THOUSAND_SEPARATOR = True
THOUSAND_SEPARATOR = " "
NUMBER_GROUPING = 3
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
OPENWEATHER_API_KEY = 'bd5e378503939ddaee76f12ad7a97608'  # Remplacez par une clé valide ou laissez vide pour désactiver