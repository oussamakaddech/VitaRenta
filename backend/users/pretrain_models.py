# backend/pretrain_models.py
import pandas as pd
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def validate_dataset(csv_path):
    """Validate the dataset integrity."""
    try:
        logger.info(f"Validating dataset: {csv_path}")
        df = pd.read_csv(csv_path)
        if df.empty:
            logger.error(f"Dataset {csv_path} is empty")
            return False
        required_columns = ['user_id', 'vehicle_id', 'caractéristiques_vehicule', 'preference_carburant', 'budget_journalier', 'is_rainy', 'événement_local', 'is_holiday', 'historique_reservations']
        if not all(col in df.columns for col in required_columns):
            logger.error(f"Missing required columns in {csv_path}: {required_columns}")
            return False
        if df.isnull().any().any():
            logger.warning(f"Missing values detected in {csv_path}")
        return True
    except Exception as e:
        logger.error(f"Error validating dataset {csv_path}: {str(e)}")
        return False

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vitarenta.settings')
    import django
    django.setup()
    logger.info("Starting dataset validation")
    success = validate_dataset(settings.DATASETS['recommendation'])
    logger.info(f"Dataset validation {'successful' if success else 'failed'}")