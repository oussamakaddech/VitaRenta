from celery import shared_task
from django.utils import timezone
from django.db.models import Q, Sum
from .models import UserEcoChallenge, ChallengeStatus, EcoChallengeProgress
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@shared_task
def check_expired_challenges():
    """Vérifie et met à jour les défis expirés"""
    try:
        now = timezone.now()
        expired_challenges = UserEcoChallenge.objects.filter(
            status=ChallengeStatus.ACTIVE,
            deadline__lt=now
        )
        
        updated_count = expired_challenges.update(status=ChallengeStatus.EXPIRED)
        
        logger.info(f"Mis à jour {updated_count} défis expirés")
        return f"Mis à jour {updated_count} défis expirés"
        
    except Exception as e:
        logger.error(f"Erreur lors de la vérification des défis expirés: {e}")
        return f"Erreur: {e}"

@shared_task
def update_challenges_from_eco_score():
    """Met à jour la progression des défis basée sur les données d'éco-score"""
    try:
        # Cette tâche sera connectée aux données IoT/éco-score
        # Pour l'instant, c'est un placeholder qui peut être étendu
        
        active_challenges = UserEcoChallenge.objects.filter(
            status=ChallengeStatus.ACTIVE
        )
        
        updated_count = 0
        for challenge in active_challenges:
            # Ici, on récupérerait les données d'éco-score
            # et on mettrait à jour la progression automatiquement
            # Exemple : connexion avec les données IoT du véhicule
            pass
        
        logger.info(f"Vérifié la progression de {active_challenges.count()} défis actifs")
        return f"Vérifié {active_challenges.count()} défis"
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour de la progression: {e}")
        return f"Erreur: {e}"

@shared_task
def auto_update_challenge_progress(user_id, vehicle_id, eco_score=None, distance_km=None, co2_saved=None):
    """Met à jour automatiquement la progression des défis d'un utilisateur"""
    try:
        from .models import User, UserEcoChallenge, EcoChallengeProgress, EcoChallengeType
        
        user = User.objects.get(id=user_id)
        active_challenges = UserEcoChallenge.objects.filter(
            user=user,
            status=ChallengeStatus.ACTIVE
        )
        
        updated_challenges = []
        
        for user_challenge in active_challenges:
            challenge_type = user_challenge.challenge.type
            progress_value = Decimal('0.00')
            
            # Déterminer la valeur de progression selon le type de défi
            if challenge_type == EcoChallengeType.ECO_DRIVING and distance_km:
                progress_value = Decimal(str(distance_km))
            elif challenge_type == EcoChallengeType.CO2_REDUCTION and co2_saved:
                progress_value = Decimal(str(co2_saved))
            elif challenge_type == EcoChallengeType.ECO_SCORE and eco_score:
                # Pour les défis d'éco-score, on compte les jours avec un score > seuil
                if eco_score >= 85:  # Seuil configurable
                    progress_value = Decimal('1.00')  # Un jour réussi
            elif challenge_type == EcoChallengeType.FUEL_EFFICIENCY and distance_km:
                progress_value = Decimal(str(distance_km))
            
            if progress_value > 0:
                # Créer un enregistrement de progression
                EcoChallengeProgress.objects.create(
                    user_challenge=user_challenge,
                    value=progress_value,
                    eco_score=eco_score,
                    co2_saved=co2_saved,
                    distance_km=distance_km,
                    vehicle_id=vehicle_id
                )
                
                # Mettre à jour la progression totale
                total_progress = EcoChallengeProgress.objects.filter(
                    user_challenge=user_challenge
                ).aggregate(total=Sum('value'))['total'] or Decimal('0.00')
                
                user_challenge.progress = total_progress
                user_challenge.save()  # Déclenche la vérification de completion
                
                updated_challenges.append(user_challenge.challenge.title)
        
        logger.info(f"Progression mise à jour pour {len(updated_challenges)} défis de l'utilisateur {user.email}")
        return f"Défis mis à jour: {', '.join(updated_challenges)}"
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour automatique de la progression: {e}")
        return f"Erreur: {e}"

@shared_task
def process_challenge_rewards():
    """Traite les récompenses des défis complétés"""
    try:
        from .models import UserEcoChallenge, EcoChallengeReward
        
        # Trouver les défis complétés sans récompense
        completed_challenges = UserEcoChallenge.objects.filter(
            status=ChallengeStatus.COMPLETED,
            reward__isnull=True
        )
        
        rewards_created = 0
        for user_challenge in completed_challenges:
            # Créer la récompense si elle n'existe pas
            reward, created = EcoChallengeReward.objects.get_or_create(
                user_challenge=user_challenge,
                defaults={
                    'user': user_challenge.user,
                    'points_awarded': user_challenge.challenge.reward_points,
                    'credit_awarded': user_challenge.challenge.reward_credit_euros,
                    'badge_awarded': user_challenge.challenge.reward_badge
                }
            )
            if created:
                rewards_created += 1
        
        logger.info(f"Créé {rewards_created} nouvelles récompenses")
        return f"Créé {rewards_created} récompenses"
        
    except Exception as e:
        logger.error(f"Erreur lors du traitement des récompenses: {e}")
        return f"Erreur: {e}"
