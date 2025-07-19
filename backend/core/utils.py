from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_welcome_email(user):
    subject = 'Bienvenue chez VitaRenta !'
    message = f"""
    Bonjour {user.nom},

    Merci de vous être inscrit sur VitaRenta, votre plateforme de location de véhicules.
    Vous pouvez maintenant explorer notre flotte, réserver des véhicules et gérer votre profil.

    Détails de votre compte :
    - Email : {user.email}
    - Nom : {user.nom}
    - Rôle : {user.get_role_display()}

    Connectez-vous dès maintenant sur http://localhost:3000/login pour commencer !

    Cordialement,
    L'équipe VitaRenta
    """
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        logger.info(f"Email de bienvenue envoyé à {user.email}")
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi de l'email de bienvenue à {user.email}: {e}")
        raise