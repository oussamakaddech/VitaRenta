# management/commands/rename_vehicle_images.py
import os
import uuid
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import Vehicule
from django.core.files.storage import default_storage

class Command(BaseCommand):
    help = 'Renomme les images de véhicules existantes pour supprimer les caractères spéciaux'
    
    def handle(self, *args, **options):
        vehicles = Vehicule.objects.exclude(image__isnull=True).exclude(image__exact='')
        
        for vehicle in vehicles:
            if vehicle.image:
                # Obtenir le chemin actuel
                old_path = vehicle.image.path
                old_name = os.path.basename(old_path)
                
                # Créer un nouveau nom de fichier
                ext = old_name.split('.')[-1] if '.' in old_name else 'jpg'
                new_name = f"{uuid.uuid4().hex}.{ext}"
                new_path = os.path.join(os.path.dirname(old_path), new_name)
                
                # Renommer le fichier
                try:
                    os.rename(old_path, new_path)
                    # Mettre à jour le chemin dans la base de données
                    vehicle.image.name = os.path.join('vehicules', new_name)
                    vehicle.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'Renommé: {old_name} -> {new_name}')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Erreur lors du renommage de {old_name}: {str(e)}')
                    )
        
        self.stdout.write(self.style.SUCCESS('Opération terminée'))