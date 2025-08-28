# Créez un fichier management/commands/create_default_coupons.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid
import random
import string

from users.models import Coupon
User = get_user_model()

class Command(BaseCommand):
    help = 'Crée des coupons par défaut pour tous les utilisateurs'

    def handle(self, *args, **options):
        # Créer 3 coupons par défaut pour chaque utilisateur
        default_coupons = [
            {'valeur': 10, 'type': 'pourcentage'},
            {'valeur': 5, 'type': 'montant'},
            {'valeur': 15, 'type': 'pourcentage'},
        ]
        
        users = User.objects.all()
        created_count = 0
        
        for user in users:
            for coupon_data in default_coupons:
                # Générer un code unique
                code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
                
                # Date de validité: 6 mois à partir d'aujourd'hui
                valide_jusqua = timezone.now().date() + timedelta(days=180)
                
                # Créer le coupon
                Coupon.objects.create(
                    code=code,
                    valeur=coupon_data['valeur'],
                    type=coupon_data['type'],
                    valide_jusqua=valide_jusqua,
                    user=user
                )
                created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Succès! {created_count} coupons par défaut ont été créés pour {users.count()} utilisateurs'
            )
        )