from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from users.models import EcoChallengeReward, User, EcoChallenge, RewardType
import uuid


class Command(BaseCommand):
    help = 'Créer des récompenses par défaut pour tester le système'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            help='Email de l\'utilisateur pour attribuer les récompenses',
            default='client@test.com'
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        
        try:
            # Récupérer l'utilisateur
            user = User.objects.get(email=user_email)
            self.stdout.write(f"Attribution des récompenses à: {user.email}")
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Utilisateur avec email {user_email} non trouvé')
            )
            return

        # Récupérer un défi pour associer (optionnel)
        challenge = EcoChallenge.objects.first()

        # Récompenses par défaut
        default_rewards = [
            {
                'title': 'Premier pas écologique',
                'description': 'Félicitations pour avoir rejoint la communauté éco-responsable !',
                'points': 50,
                'reward_type': RewardType.POINTS,
            },
            {
                'title': 'Badge Éco-Novice',
                'description': 'Vous avez terminé votre premier défi écologique',
                'points': 100,
                'reward_type': RewardType.BADGE,
            },
            {
                'title': 'Réduction 10%',
                'description': 'Réduction de 10% sur votre prochaine location',
                'points': 150,
                'reward_type': RewardType.DISCOUNT,
            },
            {
                'title': 'Location gratuite 2h',
                'description': 'Profitez de 2 heures de location gratuite',
                'points': 300,
                'reward_type': RewardType.FREE_RENTAL,
            },
            {
                'title': 'Certificat Éco-Conducteur',
                'description': 'Certificat officiel reconnaissant vos efforts environnementaux',
                'points': 500,
                'reward_type': RewardType.CERTIFICATE,
            },
            {
                'title': 'Bonus Écologique Suprême',
                'description': 'Bonus spécial pour excellence environnementale',
                'points': 1000,
                'reward_type': RewardType.ECO_BONUS,
            }
        ]

        created_count = 0
        for reward_data in default_rewards:
            # Vérifier si la récompense existe déjà
            existing = EcoChallengeReward.objects.filter(
                user=user,
                title=reward_data['title']
            ).first()
            
            if not existing:
                reward = EcoChallengeReward.objects.create(
                    user=user,
                    challenge=challenge,  # Peut être None
                    **reward_data
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Récompense créée: {reward.title} ({reward.points} points)'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️ Récompense déjà existante: {reward_data["title"]}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 {created_count} récompenses créées avec succès pour {user.email}!'
            )
        )

        # Afficher le total des points
        total_points = EcoChallengeReward.objects.filter(user=user).aggregate(
            total=models.Sum('points')
        )['total'] or 0
        
        self.stdout.write(
            self.style.SUCCESS(
                f'💰 Total des points pour {user.email}: {total_points}'
            )
        )
