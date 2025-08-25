import os
from celery import Celery
from django.conf import settings

# Définir le module de configuration Django pour Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vitarenta.settings')

app = Celery('vitarenta')

# Utiliser un namespace string pour que tous les paramètres de configuration
# liés à Celery aient le préfixe CELERY
app.config_from_object('django.conf:settings', namespace='CELERY')

# Charger automatiquement les tâches depuis toutes les applications Django enregistrées
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
