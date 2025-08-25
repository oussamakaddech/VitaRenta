# signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import UserEcoChallenge, EcoChallengeReward, ChallengeStatus

@receiver(post_save, sender=UserEcoChallenge)
def create_challenge_reward(sender, instance, created, **kwargs):
    """Crée automatiquement une récompense quand un défi est complété"""
    if instance.status == ChallengeStatus.COMPLETED and not hasattr(instance, 'reward'):
        EcoChallengeReward.objects.create(
            user=instance.user,
            user_challenge=instance,
            points_awarded=instance.challenge.reward_points,
            credit_awarded=instance.challenge.reward_credit_euros,
            badge_awarded=instance.challenge.reward_badge
        )

@receiver(pre_save, sender=UserEcoChallenge)
def check_challenge_completion(sender, instance, **kwargs):
    """Vérifie automatiquement la completion du défi"""
    if instance.pk:  # Instance existante
        try:
            old_instance = UserEcoChallenge.objects.get(pk=instance.pk)
            if (old_instance.status == ChallengeStatus.ACTIVE and 
                instance.is_completed and 
                instance.status == ChallengeStatus.ACTIVE):
                instance.status = ChallengeStatus.COMPLETED
                instance.completed_at = timezone.now()
        except UserEcoChallenge.DoesNotExist:
            pass
