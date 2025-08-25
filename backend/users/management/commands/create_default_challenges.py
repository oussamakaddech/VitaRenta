from django.core.management.base import BaseCommand
from decimal import Decimal
from users.models import EcoChallenge, EcoChallengeType, ChallengeDifficulty

class Command(BaseCommand):
    help = 'Crée les défis éco-responsables par défaut'
    
    def handle(self, *args, **options):
        challenges = [
            {
                'type': EcoChallengeType.ECO_DRIVING,
                'title': 'Éco-Conducteur Débutant',
                'description': 'Parcourez 50 km en mode éco-responsable',
                'target_value': Decimal('50.00'),
                'unit': 'km',
                'difficulty': ChallengeDifficulty.BEGINNER,
                'duration_days': 14,
                'reward_points': 100,
                'reward_credit_euros': Decimal('5.00'),
            },
            {
                'type': EcoChallengeType.CO2_REDUCTION,
                'title': 'Champion du CO₂',
                'description': 'Économisez 10 kg de CO₂ ce mois-ci',
                'target_value': Decimal('10.00'),
                'unit': 'kg CO₂',
                'difficulty': ChallengeDifficulty.INTERMEDIATE,
                'duration_days': 30,
                'reward_points': 200,
                'reward_credit_euros': Decimal('10.00'),
            },
            {
                'type': EcoChallengeType.FUEL_EFFICIENCY,
                'title': 'Économe en Énergie',
                'description': 'Consommez moins de 6 kWh/100km sur 200 km',
                'target_value': Decimal('200.00'),
                'unit': 'km',
                'difficulty': ChallengeDifficulty.INTERMEDIATE,
                'duration_days': 21,
                'reward_points': 150,
                'reward_credit_euros': Decimal('8.00'),
            },
            {
                'type': EcoChallengeType.ECO_SCORE,
                'title': 'Score Parfait',
                'description': 'Maintenez un éco-score supérieur à 85 pendant 7 jours',
                'target_value': Decimal('7.00'),
                'unit': 'jours',
                'difficulty': ChallengeDifficulty.EXPERT,
                'duration_days': 14,
                'reward_points': 300,
                'reward_credit_euros': Decimal('15.00'),
                'reward_badge': 'Maître Éco-Responsable',
            },
            {
                'type': EcoChallengeType.ECO_DRIVING,
                'title': 'Marathon Vert',
                'description': 'Parcourez 500 km en mode éco-responsable',
                'target_value': Decimal('500.00'),
                'unit': 'km',
                'difficulty': ChallengeDifficulty.EXPERT,
                'duration_days': 60,
                'reward_points': 500,
                'reward_credit_euros': Decimal('25.00'),
                'reward_badge': 'Marathonien Vert',
            },
            {
                'type': EcoChallengeType.CO2_REDUCTION,
                'title': 'Sauveur de Planète',
                'description': 'Économisez 50 kg de CO₂ en 3 mois',
                'target_value': Decimal('50.00'),
                'unit': 'kg CO₂',
                'difficulty': ChallengeDifficulty.EXPERT,
                'duration_days': 90,
                'reward_points': 800,
                'reward_credit_euros': Decimal('40.00'),
                'reward_badge': 'Sauveur de Planète',
            },
        ]
        
        created_count = 0
        for challenge_data in challenges:
            challenge, created = EcoChallenge.objects.get_or_create(
                title=challenge_data['title'],
                defaults=challenge_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Défi créé: {challenge.title}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Défi existe déjà: {challenge.title}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Commande terminée. {created_count} nouveaux défis créés.'
            )
        )
