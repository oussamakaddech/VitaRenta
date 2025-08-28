from datetime import timedelta
from venv import logger
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.core.validators import MaxValueValidator
from django.core.exceptions import ValidationError
import uuid
import re

def generate_uuid():
    return str(uuid.uuid4())

UUID_LENGTH = 36

class UserManager(BaseUserManager):
    def create_user(self, email, password, nom=None, **extra_fields):
        if not email:
            raise ValueError(_('L\'email est requis'))
        email = self.normalize_email(email)
        user = self.model(email=email, nom=nom or '', **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, nom=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Le superutilisateur doit avoir is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Le superutilisateur doit avoir is_superuser=True.'))
        return self.create_user(email, password, nom, **extra_fields)

class User(AbstractUser):
    id = models.CharField(primary_key=True, max_length=UUID_LENGTH, default=generate_uuid, editable=False, unique=True)
    username = models.CharField(
        max_length=150,
        unique=True,
        blank=True,
        null=False,
        default='',
        help_text=_('Nom d\'utilisateur unique généré automatiquement')
    )
    email = models.EmailField(_('email address'), unique=True)
    nom = models.CharField(max_length=100, default='')
    telephone = models.CharField(max_length=20, blank=True, default='')
    preference_carburant = models.CharField(
        max_length=20,
        choices=[
            ('électrique', _('Électrique')),
            ('hybride', _('Hybride')),
            ('essence', _('Essence')),
            ('diesel', _('Diesel'))
        ],
        blank=True,
        default=''
    )
    role = models.CharField(
        max_length=20,
        choices=[
            ('client', _('Client')),
            ('agence', _('Agence')),
            ('admin', _('Admin')),
            ('visiteur', _('Visiteur'))
        ],
        default='visiteur'
    )
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login_attempt = models.DateTimeField(null=True, blank=True)
    login_attempts = models.PositiveIntegerField(default=0)
    agence = models.ForeignKey('Agence', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    photo_url = models.URLField(blank=True, null=True)
    budget_journalier = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    password_reset_token = models.CharField(max_length=100, null=True, blank=True)
    password_reset_expiry = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom']
    objects = UserManager()

    def clean(self):
        super().clean()
        if self.budget_journalier is not None:
            try:
                self.budget_journalier = Decimal(str(self.budget_journalier))
            except (ValueError, TypeError, InvalidOperation):
                raise ValidationError({'budget_journalier': 'Le budget journalier doit être un nombre valide.'})

    def save(self, *args, **kwargs):
        self.clean()
        if not self.username:
            base_username = self.email.split('@')[0] if self.email else 'user'
            unique_suffix = uuid.uuid4().hex[:8]
            self.username = f"{base_username}_{unique_suffix}"
        if self.email:
            self.email = self.email.lower().strip()
        if User.objects.filter(username=self.username).exclude(id=self.id).exists():
            self.username = f"{self.username}_{uuid.uuid4().hex[:4]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nom} ({self.email})" if self.nom else self.email or self.username

    def reset_login_attempts(self):
        self.login_attempts = 0
        self.last_login_attempt = None
        self.save(update_fields=['login_attempts', 'last_login_attempt'])

    def reset_password_token(self):
        """Generate a new password reset token and set expiry."""
        self.password_reset_token = uuid.uuid4().hex
        self.password_reset_expiry = timezone.now() + timedelta(hours=1)
        self.save(update_fields=['password_reset_token', 'password_reset_expiry'])

    def get_full_name(self):
        return self.nom or self.username

    def get_short_name(self):
        return self.nom or self.username

    class Meta:
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
            models.Index(fields=['username'], name='user_username_idx'),
            models.Index(fields=['date_joined'], name='user_date_joined_idx'),
            models.Index(fields=['role'], name='user_role_idx'),
            models.Index(fields=['password_reset_token'], name='user_reset_token_idx')
        ]

class Agence(models.Model):
    id = models.CharField(primary_key=True, max_length=UUID_LENGTH, default=generate_uuid, editable=False, unique=True)
    nom = models.CharField(max_length=100)
    adresse = models.CharField(max_length=200)
    ville = models.CharField(max_length=100)
    code_postal = models.CharField(max_length=20)
    pays = models.CharField(max_length=100)
    telephone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    site_web = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
    latitude = models.FloatField(null=True, blank=True)     # <-- AJOUT
    longitude = models.FloatField(null=True, blank=True)    # <-- AJOUT
    def clean(self):
        super().clean()
        if self.nom:
            self.nom = re.sub(r'[\xa0]+', ' ', self.nom).strip()
        if self.adresse:
            self.adresse = re.sub(r'[\xa0]+', ' ', self.adresse).strip()
        if self.ville:
            self.ville = re.sub(r'[\xa0]+', ' ', self.ville).strip()
        if self.code_postal:
            self.code_postal = re.sub(r'[\xa0\s]+', '', self.code_postal)
        if self.pays:
            self.pays = re.sub(r'[\xa0]+', ' ', self.pays).strip()
        if self.telephone:
            self.telephone = re.sub(r'[\xa0\s]+', '', self.telephone)
        if self.email:
            self.email = self.email.lower().strip()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nom

    class Meta:
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['nom'], name='agence_nom_idx'),
            models.Index(fields=['email'], name='agence_email_idx'),
            models.Index(fields=['date_creation'], name='agence_date_creation_idx'),
            models.Index(fields=['ville'], name='agence_ville_idx'),
            models.Index(fields=['code_postal'], name='agence_code_postal_idx')
        ]

class Vehicule(models.Model):
    id = models.CharField(primary_key=True, max_length=UUID_LENGTH, default=generate_uuid, editable=False, unique=True)
    marque = models.CharField(max_length=50)
    modele = models.CharField(max_length=50)
    carburant = models.CharField(
        max_length=20,
        choices=[
            ('électrique', _('Électrique')),
            ('hybride', _('Hybride')),
            ('essence', _('Essence')),
            ('diesel', _('Diesel'))
        ]
    )
    transmission = models.CharField(
        max_length=20,
        choices=[
            ('manuelle', _('Manuelle')),
            ('automatique', _('Automatique'))
        ],
        default='manuelle'
    )
    nombre_places = models.PositiveIntegerField(default=5)
    annee = models.PositiveIntegerField(null=True, blank=True)
    kilometrage = models.PositiveIntegerField(null=True, blank=True)
    couleur = models.CharField(max_length=50, blank=True)
    immatriculation = models.CharField(max_length=20, null=True, blank=True)
    emissionsCO2 = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_('Émissions CO2 en g/km')
    )
    consommationEnergie = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Consommation en L/100km ou kWh/100km')
    )
    prix_par_jour = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text=_('Prix quotidien en euros')
    )
    localisation = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    statut = models.CharField(
        max_length=20,
        choices=[
            ('disponible', _('Disponible')),
            ('loué', _('Loué')),
            ('maintenance', _('Maintenance')),
            ('hors_service', _('Hors service'))
        ],
        default='disponible'
    )
    date_derniere_maintenance = models.DateField(null=True, blank=True)
    prochaine_maintenance = models.DateField(null=True, blank=True)
    agence = models.ForeignKey('Agence', on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicules')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='vehicules/', blank=True, null=True)

    def clean(self):
        super().clean()
        if self.consommationEnergie is not None:
            try:
                if not isinstance(self.consommationEnergie, Decimal):
                    self.consommationEnergie = Decimal(str(self.consommationEnergie))
            except (ValueError, TypeError, InvalidOperation):
                raise ValidationError({'consommationEnergie': 'La consommation doit être un nombre valide.'})
        if self.prix_par_jour is not None:
            try:
                if not isinstance(self.prix_par_jour, Decimal):
                    self.prix_par_jour = Decimal(str(self.prix_par_jour))
            except (ValueError, TypeError, InvalidOperation):
                raise ValidationError({'prix_par_jour': 'Le prix par jour doit être un nombre valide.'})
        if self.immatriculation:
            self.immatriculation = self.immatriculation.strip().upper()

    def modifier(self, **kwargs):
        """Méthode pour modifier un véhicule"""
        for field, value in kwargs.items():
            setattr(self, field, value)
        self.save()
        return self
    
    def mettre_en_maintenance(self):
        """Méthode pour mettre un véhicule en maintenance"""
        self.statut = 'maintenance'
        self.date_derniere_maintenance = timezone.now().date()
        self.save()
        return self

    def save(self, *args, **kwargs):
        self.clean()
        if not self.marque:
            self.marque = 'Marque inconnue'
        if not self.modele:
            self.modele = 'Modèle inconnu'
        if not self.immatriculation and not self.pk:
            self.immatriculation = f"TEMP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.marque} {self.modele} ({self.immatriculation or 'Sans immatriculation'})"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['marque', 'modele'], name='vehicule_marque_modele_idx'),
            models.Index(fields=['statut'], name='vehicule_statut_idx'),
            models.Index(fields=['carburant'], name='vehicule_carburant_idx'),
            models.Index(fields=['created_at'], name='vehicule_created_at_idx'),
            models.Index(fields=['agence'], name='vehicule_agence_idx'),
            models.Index(fields=['prix_par_jour'], name='vehicule_prix_idx'),
            models.Index(fields=['immatriculation'], name='vehicule_immatriculation_idx')
        ]

class Reservation(models.Model):
    id = models.CharField(primary_key=True, max_length=UUID_LENGTH, default=generate_uuid, editable=False, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    vehicule = models.ForeignKey(Vehicule, on_delete=models.CASCADE, null=True, blank=True)
    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField()
    montant_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text=_('Montant total en euros')
    )
    statut = models.CharField(
        max_length=20,
        choices=[
            ('en_attente', _('En attente')),
            ('confirmee', _('Confirmée')),
            ('terminee', _('Terminée')),
            ('annulee', _('Annulée'))
        ],
        default='en_attente'
    )
    commentaires = models.TextField(blank=True)
    assurance_complete = models.BooleanField(default=False)
    conducteur_supplementaire = models.BooleanField(default=False)
    gps = models.BooleanField(default=False)
    siege_enfant = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.montant_total is not None:
            try:
                if not isinstance(self.montant_total, Decimal):
                    self.montant_total = Decimal(str(self.montant_total))
            except (ValueError, TypeError, InvalidOperation):
                raise ValidationError({'montant_total': 'Le montant total doit être un nombre valide.'})
        if self.date_debut and self.date_fin and self.date_fin <= self.date_debut:
            raise ValidationError({'date_fin': 'La date de fin doit être postérieure à la date de début.'})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Reservation {self.id[:8]} - {self.user} - {self.vehicule}"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['date_debut', 'date_fin'], name='reservation_date_idx'),
            models.Index(fields=['statut'], name='reservation_statut_idx'),
            models.Index(fields=['created_at'], name='reservation_created_at_idx'),
            models.Index(fields=['vehicule'], name='reservation_vehicule_idx')
        ]


class IOTData(models.Model):
    vehicle = models.ForeignKey(Vehicule, on_delete=models.CASCADE, related_name='iot_data')
    timestamp = models.DateTimeField(auto_now_add=True)
    temperature = models.FloatField()
    vibration = models.FloatField()
    fuel_consumption = models.FloatField()
    mileage = models.FloatField()
    engine_hours = models.FloatField()
    battery_health = models.FloatField()

    def __str__(self):
        return f"IOTData for {self.vehicle} at {self.timestamp}"

# models.py
class EcoScore(models.Model):
    vehicle = models.OneToOneField(Vehicule, on_delete=models.CASCADE, related_name='eco_score')
    score = models.FloatField()
    co2_emissions = models.FloatField()
    energy_consumption = models.FloatField()
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['vehicle'], name='unique_vehicle_eco_score')
        ]
    
    def clean(self):
        # Vérifier s'il existe déjà un score pour ce véhicule
        existing = EcoScore.objects.filter(vehicle_id=self.vehicle_id)
        if self.pk:
            existing = existing.exclude(pk=self.pk)
        
        if existing.exists():
            raise ValidationError("Un éco-score existe déjà pour ce véhicule")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"EcoScore {self.score} for {self.vehicle}"

class MaintenancePrediction(models.Model):
    vehicle = models.ForeignKey('Vehicule', on_delete=models.CASCADE, related_name='maintenance_predictions')
    prediction_date = models.DateTimeField(auto_now_add=True)
    predicted_failure_date = models.DateTimeField()
    confidence = models.FloatField()
    failure_type = models.CharField(max_length=100)
    recommendation = models.TextField()



# models.py - VERSION COMPLÈTE ET CORRIGÉE

import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


class EcoChallengeType(models.TextChoices):
    ECO_DRIVING = 'eco_driving', 'Conduite Écologique'
    CO2_REDUCTION = 'co2_reduction', 'Réduction CO₂'
    FUEL_EFFICIENCY = 'fuel_efficiency', 'Efficacité Énergétique'
    ECO_SCORE = 'eco_score', 'Score Écologique'
    LOW_EMISSION = 'low_emission', 'Faibles émissions'
    DISTANCE_REDUCTION = 'distance_reduction', 'Réduction de distance'
    ALTERNATIVE_TRANSPORT = 'alternative_transport', 'Transport alternatif'


class ChallengeDifficulty(models.TextChoices):
    BEGINNER = 'beginner', 'Débutant'
    INTERMEDIATE = 'intermediate', 'Intermédiaire'
    ADVANCED = 'advanced', 'Avancé'
    EXPERT = 'expert', 'Expert'


class ChallengeStatus(models.TextChoices):
    ACTIVE = 'active', 'Actif'
    COMPLETED = 'completed', 'Terminé'
    ABANDONED = 'abandoned', 'Abandonné'
    EXPIRED = 'expired', 'Expiré'


class RewardType(models.TextChoices):
    POINTS = 'points', 'Points'
    BADGE = 'badge', 'Badge'
    DISCOUNT = 'discount', 'Réduction'
    FREE_RENTAL = 'free_rental', 'Location gratuite'
    CERTIFICATE = 'certificate', 'Certificat'
    ECO_BONUS = 'eco_bonus', 'Bonus écologique'


class EcoChallenge(models.Model):
    """Modèle pour les défis éco-responsables"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=30, choices=EcoChallengeType.choices)
    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(verbose_name="Description")
    
    # Objectif et mesure
    target_value = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00'))],  # ✅ CORRECTION
        verbose_name="Valeur objectif"
    )
    unit = models.CharField(max_length=50, verbose_name="Unité de mesure")
    
    # Difficulté et durée
    difficulty = models.CharField(
        max_length=20, 
        choices=ChallengeDifficulty.choices,
        default=ChallengeDifficulty.BEGINNER
    )
    duration_days = models.PositiveIntegerField(
        default=14,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        verbose_name="Durée en jours"
    )
    
    # Récompenses
    reward_points = models.PositiveIntegerField(
        default=0,
        verbose_name="Points de récompense"
    )
    reward_credit_euros = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],  # ✅ CORRECTION
        verbose_name="Crédit en euros"
    )
    reward_badge = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Badge de récompense"
    )
    
    # Métadonnées
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    featured = models.BooleanField(default=False, verbose_name="En vedette")
    max_participants = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Nombre max de participants"
    )
    auto_approve_participants = models.BooleanField(default=True)
    
    # Dates de validité
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    
    # Métadonnées avancées
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_challenges',
        verbose_name="Créé par"
    )
    
    category = models.CharField(
        max_length=50,
        choices=[
            ('environmental', 'Environnemental'),
            ('efficiency', 'Efficacité'),
            ('innovation', 'Innovation'),
            ('community', 'Communauté'),
        ],
        default='environmental'
    )
    
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Faible'),
            ('medium', 'Moyenne'),
            ('high', 'Haute'),
            ('critical', 'Critique'),
        ],
        default='medium'
    )
    
    tags = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=dict, blank=True)
    success_criteria = models.JSONField(default=dict, blank=True)
    
    # Gamification
    bonus_multiplier = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('1.00'),
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    seasonal_bonus = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    
    # Impact environnemental
    total_impact_co2 = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    estimated_completion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]  # ✅ CORRECTION
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Défi Éco-Responsable"
        verbose_name_plural = "Défis Éco-Responsables"
        ordering = ['-featured', '-created_at']
        indexes = [
            models.Index(fields=['type', 'difficulty']),
            models.Index(fields=['is_active', 'featured']),
            models.Index(fields=['created_by']),
            models.Index(fields=['category', 'priority']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"
    
    def _safe_decimal_to_float(self, value):
        """Conversion sécurisée Decimal128 vers float"""
        if value is None:
            return 0.0
        
        try:
            # MongoDB Decimal128
            if hasattr(value, 'to_decimal'):
                return float(value.to_decimal())
            # Types Python standard
            elif hasattr(value, '__float__'):
                return float(value)
            # Conversion string
            else:
                return float(str(value))
        except Exception:
            return 0.0
    
    @property
    def is_available(self):
        """Vérifie si le défi est disponible"""
        now = timezone.now()
        if not self.is_active:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_participants:
            current_participants = self.user_challenges.filter(
                status__in=[ChallengeStatus.ACTIVE, ChallengeStatus.COMPLETED]
            ).count()
            if current_participants >= self.max_participants:
                return False
        return True
    
    @property
    def completion_rate_actual(self):
        """Taux de completion réel - VERSION CORRIGÉE"""
        try:
            total_participants = self.user_challenges.count()
            if total_participants == 0:
                return 0.0
                
            completed = self.user_challenges.filter(status=ChallengeStatus.COMPLETED).count()
            rate = (completed / total_participants) * 100
            return round(float(rate), 2)
        except Exception as e:
            logger.error(f"Erreur dans completion_rate_actual: {str(e)}")
            return 0.0
    
    @property
    def average_progress(self):
        """Version simplifiée sans agrégation complexe"""
        try:
            # Éviter les agrégations Django avec Djongo
            participants = list(self.user_challenges.filter(status=ChallengeStatus.ACTIVE))
            if not participants:
                return 0.0
            
            total_progress = 0.0
            count = 0
            
            for participant in participants:
                try:
                    progress_val = self._safe_decimal_to_float(participant.progress)
                    total_progress += progress_val
                    count += 1
                except Exception:
                    continue
            
            return round(total_progress / count, 2) if count > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Erreur average_progress: {str(e)}")
            return 0.0
    
    def get_participant_stats(self):
        """Version simplifiée sans agrégation complexe"""
        try:
            # Éviter les agrégations Django - compter manuellement
            all_participants = list(self.user_challenges.all())
            
            stats = {
                'total': 0,
                'active': 0,
                'completed': 0,
                'abandoned': 0,
                'expired': 0,
                'completion_rate': 0.0,
                'average_progress': 0.0
            }
            
            total_progress = 0.0
            active_count = 0
            
            for participant in all_participants:
                stats['total'] += 1
                
                if participant.status == ChallengeStatus.ACTIVE:
                    stats['active'] += 1
                    try:
                        progress_val = self._safe_decimal_to_float(participant.progress)
                        total_progress += progress_val
                        active_count += 1
                    except Exception:
                        pass
                elif participant.status == ChallengeStatus.COMPLETED:
                    stats['completed'] += 1
                elif participant.status == ChallengeStatus.ABANDONED:
                    stats['abandoned'] += 1
                elif participant.status == ChallengeStatus.EXPIRED:
                    stats['expired'] += 1
            
            # Calculer les pourcentages
            if stats['total'] > 0:
                stats['completion_rate'] = round((stats['completed'] / stats['total']) * 100, 2)
            
            if active_count > 0:
                stats['average_progress'] = round(total_progress / active_count, 2)
            
            return stats
            
        except Exception as e:
            logger.error(f"Erreur get_participant_stats: {str(e)}")
            return {
                'total': 0, 'active': 0, 'completed': 0,
                'abandoned': 0, 'expired': 0,
                'completion_rate': 0.0, 'average_progress': 0.0
            }
    
    @property
    def participant_count(self):
        """Nombre total de participants actifs et terminés - VERSION CORRIGÉE"""
        try:
            return self.user_challenges.filter(
                status__in=[ChallengeStatus.ACTIVE, ChallengeStatus.COMPLETED]
            ).count()
        except Exception as e:
            logger.error(f"Erreur dans participant_count: {str(e)}")
            return 0


class UserEcoChallenge(models.Model):
    """Modèle pour les défis acceptés par les utilisateurs"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='eco_challenges'
    )
    challenge = models.ForeignKey(
        EcoChallenge,
        on_delete=models.CASCADE,
        related_name='user_challenges'
    )
    calculated_reward = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Statut et progression
    status = models.CharField(
        max_length=20,
        choices=ChallengeStatus.choices,
        default=ChallengeStatus.ACTIVE
    )
    progress = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    # Dates importantes
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(verbose_name="Date limite", null=True, blank=True)
    
    # Métadonnées
    reward_claimed = models.BooleanField(default=False)
    final_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]
    )
    
    class Meta:
        verbose_name = "Défi Utilisateur"
        verbose_name_plural = "Défis Utilisateur"
        unique_together = ('user', 'challenge')
        ordering = ['-started_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.challenge.title}"
    
    def _safe_decimal_to_float(self, value):
        """Conversion sécurisée Decimal vers float"""
        if value is None:
            return 0.0
        
        try:
            if hasattr(value, 'to_decimal'):
                return float(value.to_decimal())
            elif hasattr(value, '__float__'):
                return float(value)
            else:
                return float(str(value))
        except Exception:
            return 0.0
    
    @property
    def is_completed(self):
        """Vérifie si le défi est terminé"""
        try:
            progress_val = self._safe_decimal_to_float(self.progress)
            target_val = self._safe_decimal_to_float(self.challenge.target_value) if self.challenge else 0.0
            return progress_val >= target_val
        except Exception:
            return False
    
    @property
    def progress_percentage(self):
        """Calcule le pourcentage de progression"""
        try:
            progress_val = self._safe_decimal_to_float(self.progress)
            target_val = self._safe_decimal_to_float(self.challenge.target_value) if self.challenge else 0.0
            
            if target_val == 0:
                return 0.0
            
            percentage = (progress_val / target_val) * 100
            return min(float(percentage), 100.0)
        except Exception:
            return 0.0
    
    @property
    def days_remaining(self):
        """Retourne le nombre de jours restants avant expiration"""
        try:
            if self.status != ChallengeStatus.ACTIVE or not self.deadline:
                return 0
            
            remaining = (self.deadline - timezone.now()).days
            return max(0, remaining)
        except Exception:
            return 0
    
    @property
    def target(self):
        """Valeur cible du défi"""
        try:
            return self._safe_decimal_to_float(self.challenge.target_value) if self.challenge else 0.0
        except Exception:
            return 0.0
    
    @property
    def unit(self):
        """Unité de mesure du défi"""
        try:
            return self.challenge.unit if self.challenge else ""
        except Exception:
            return ""
    
    @property
    def is_expired(self):
        """Vérifie si le défi a expiré"""
        try:
            if not self.deadline:
                return False
                
            return (
                timezone.now() >= self.deadline and 
                self.status == ChallengeStatus.ACTIVE
            )
        except Exception as e:
            logger.error(f"Erreur dans is_expired: {str(e)}")
            return False
    
    def update_reward(self):
        """Recalcule la récompense basée sur le système configuré"""
        try:
            config = ChallengeRewardConfig.objects.get(challenge=self.challenge)
            progress = self.progress
            
            # Obtenir le système de récompenses
            reward_system = config.reward_system
            
            # Calculer la récompense brute
            raw_reward = reward_system.calculate_reward(self.challenge, progress)
            
            # Appliquer le multiplicateur
            multiplied_reward = raw_reward * float(config.multiplier)
            
            # Appliquer le seuil de bonus
            if config.bonus_threshold and progress >= config.bonus_threshold:
                multiplied_reward *= 1.5  # Bonus de 50%
            
            # Appliquer le plafond
            if config.reward_cap:
                multiplied_reward = min(multiplied_reward, float(config.reward_cap))
            
            self.calculated_reward = multiplied_reward
            self.save(update_fields=['calculated_reward'])
            
        except Exception as e:
            logger.error(f"Erreur dans update_reward: {str(e)}")
    
    def claim_reward(self):
        """Revendique la récompense et l'applique au compte utilisateur"""
        if self.claimed:
            return False
        
        # Récupérer la récompense calculée
        reward_amount = self.calculated_reward
        
        if reward_amount <= 0:
            return False
        
        # Appliquer la récompense au compte utilisateur
        user = self.user
        
        # Selon le type de récompense configuré
        config = ChallengeRewardConfig.objects.get(challenge=self.challenge)
        
        if config.reward_system.type == 'exchange_system':
            # Pour un système d'échange, ajouter des crédits
            user.budget_journalier += reward_amount
            user.save()
        else:
            # Pour d'autres systèmes, ajouter des points
            user.eco_points += int(reward_amount)
            user.save()
        
        # Enregistrer la récompense
        self.reward_amount = reward_amount
        self.reward_description = f"Récompense pour le défi '{self.challenge.title}'"
        self.claimed = True
        self.claimed_at = timezone.now()
        self.save()
        
        return True
    
    def save(self, *args, **kwargs):
        """Sauvegarde avec logique supplémentaire"""
        try:
            # Auto-calcul du deadline
            if not self.deadline and self.challenge:
                if not self.started_at:
                    self.started_at = timezone.now()
                self.deadline = self.started_at + timedelta(days=self.challenge.duration_days)
            
            # Auto-complétion si nécessaire
            if self.is_completed and self.status == ChallengeStatus.ACTIVE:
                self.status = ChallengeStatus.COMPLETED
                self.completed_at = timezone.now()
            
            super().save(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Erreur save UserEcoChallenge: {str(e)}")
            raise
    
    def manual_entries_count(self):
        """Compte le nombre de saisies manuelles"""
        try:
            return self.progress_history.filter(manual=True).count()
        except Exception:
            return 0
    
    def last_entry_type(self):
        """Retourne le type de la dernière entrée"""
        try:
            last_entry = self.progress_history.order_by('-recorded_at').first()
            return 'manual' if last_entry and last_entry.manual else None
        except Exception:
            return None
class EcoChallengeProgress(models.Model):
    """Modèle pour tracer la progression des défis"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_challenge = models.ForeignKey(
        UserEcoChallenge,
        on_delete=models.CASCADE,
        related_name='progress_history'
    )
    
    # Données de progression
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    eco_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))]  # ✅ CORRECTION
    )
    co2_saved = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    energy_consumption = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    distance_km = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    
    # Source des données
    vehicle_id = models.UUIDField(null=True, blank=True)
    reservation_id = models.UUIDField(null=True, blank=True)
    
    # Timestamp
    recorded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Progression de Défi"
        verbose_name_plural = "Progressions de Défis"
        ordering = ['-recorded_at']
    
    def __str__(self):
        return f"{self.user_challenge} - {self.value} ({self.recorded_at.date()})"


class EcoChallengeReward(models.Model):
    """Modèle pour tracer les récompenses attribuées"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='eco_rewards'
    )
    user_challenge = models.ForeignKey(
        UserEcoChallenge,
        on_delete=models.CASCADE,
        related_name='rewards',
        null=True,
        blank=True
    )
    challenge = models.ForeignKey(
        EcoChallenge,
        on_delete=models.CASCADE,
        related_name='rewards',
        null=True,
        blank=True
    )
    
    # Informations de la récompense
    title = models.CharField(max_length=200, default="Récompense")
    description = models.TextField(blank=True, null=True)
    reward_type = models.CharField(
        max_length=20, 
        choices=RewardType.choices,
        default=RewardType.POINTS
    )
    
    # Valeurs des récompenses
    points = models.PositiveIntegerField(default=0)
    points_awarded = models.PositiveIntegerField(default=0)  # Compatibilité
    credit_awarded = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]  # ✅ CORRECTION
    )
    badge_awarded = models.CharField(max_length=100, blank=True, null=True)
    
    # Statut de réclamation
    claimed = models.BooleanField(default=False)
    claimed_at = models.DateTimeField(null=True, blank=True)
    
    # Métadonnées
    awarded_at = models.DateTimeField(auto_now_add=True)
    awarded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rewards_awarded'
    )
    applied_to_account = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "Récompense de Défi"
        verbose_name_plural = "Récompenses de Défis"
        ordering = ['-awarded_at']
    
    def save(self, *args, **kwargs):
        # Synchroniser points avec points_awarded pour compatibilité
        if self.points and not self.points_awarded:
            self.points_awarded = self.points
        elif self.points_awarded and not self.points:
            self.points = self.points_awarded
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title} - {getattr(self.user, 'nom', None) or self.user.username} ({self.points}pts)"

# Nouveau modèle pour les systèmes de récompenses flexibles
class RewardSystem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    type = models.CharField(
        max_length=20,
        choices=[
            ('points_based', 'Basé sur les points'),
            ('level_based', 'Basé sur les niveaux'),
            ('milestone_based', 'Basé sur les jalons'),
            ('exchange_system', 'Système d\'échange'),
            ('custom_formula', 'Formule personnalisée')
        ],
        default='points_based'
    )
    
    # Configuration spécifique au type
    points_per_unit = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Points accordés par unité accomplie'
    )
    level_thresholds = models.JSONField(null=True, blank=True)
    milestone_targets = models.JSONField(null=True, blank=True)
    exchange_rates = models.JSONField(null=True, blank=True)
    custom_formula = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Système de Récompense"
        verbose_name_plural = "Systèmes de Récompenses"
    
    def calculate_reward(self, challenge, user_progress):
        """
        Calcule la récompense selon le type de système
        """
        if self.type == 'points_based':
            return self.calculate_points(challenge, user_progress)
        elif self.type == 'level_based':
            return self.calculate_level(user_progress)
        elif self.type == 'milestone_based':
            return self.calculate_milestone(user_progress)
        elif self.type == 'exchange_system':
            return self.calculate_exchange(user_progress)
        elif self.type == 'custom_formula':
            return self.calculate_custom(challenge, user_progress)
        return 0
    
    def calculate_points(self, challenge, user_progress):
        if not self.points_per_unit:
            return 0
        return float(user_progress) * float(self.points_per_unit)
    
    def calculate_level(self, user_progress):
        if not self.level_thresholds:
            return 0
        thresholds = sorted([float(t) for t in self.level_thresholds.values()])
        for level, threshold in enumerate(thresholds, start=1):
            if user_progress < threshold:
                return (level - 1) * 100  # Exemple: niveau 1 = 100 pts, niveau 2 = 200 pts, etc.
        return len(thresholds) * 100
    
    def calculate_milestone(self, user_progress):
        if not self.milestone_targets:
            return 0
        milestones = sorted([float(t) for t in self.milestone_targets.values()])
        earned = 0
        for milestone in milestones:
            if user_progress >= milestone:
                earned += 100  # Chaque jalon rapporte 100 points
        return earned
    
    def calculate_exchange(self, user_progress):
        if not self.exchange_rates:
            return 0
        # Logique d'échange personnalisée
        return user_progress * 10  # Exemple simple
    
    def calculate_custom(self, challenge, user_progress):
        if not self.custom_formula:
            return 0
        # Évaluation de formule personnalisée (simplifié)
        try:
            # Remplacer les variables dans la formule
            formula = self.custom_formula.replace('progress', str(user_progress))
            return eval(formula, {'__builtins__': {}}, {})
        except:
            return 0

# Modèle de configuration de récompense pour chaque défi
class ChallengeRewardConfig(models.Model):
    challenge = models.OneToOneField(EcoChallenge, on_delete=models.CASCADE)
    reward_system = models.ForeignKey(RewardSystem, on_delete=models.CASCADE)
    multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal('1.00')
    )
    bonus_threshold = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    reward_cap = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
class Feedback(models.Model):
    # Utiliser ObjectIdField pour MongoDB avec Djongo
    try:
        from djongo import models as djongo_models
        _id = djongo_models.ObjectIdField(primary_key=True)
    except ImportError:
        id = models.AutoField(primary_key=True)
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedback')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Feedback de {self.user.email} - {self.rating}/5"
    
class ChallengeRewardConfig(models.Model):
    challenge = models.OneToOneField(EcoChallenge, on_delete=models.CASCADE)
    reward_system = models.ForeignKey(RewardSystem, on_delete=models.CASCADE)
    multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal('1.00')
    )
    bonus_threshold = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )
    reward_cap = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )    