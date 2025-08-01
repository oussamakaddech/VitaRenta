# models.py
from datetime import timedelta
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
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

    def get_full_name(self):
        return self.nom or self.username

    def get_short_name(self):
        return self.nom or self.username

    class Meta:
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
            models.Index(fields=['username'], name='user_username_idx'),
            models.Index(fields=['date_joined'], name='user_date_joined_idx'),
            models.Index(fields=['role'], name='user_role_idx')
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
    immatriculation = models.CharField(max_length=20, unique=True, blank=True)
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
                self.consommationEnergie = float(self.consommationEnergie)
            except (ValueError, TypeError):
                raise ValidationError({'consommationEnergie': 'La consommation doit être un nombre valide.'})
        if self.prix_par_jour is not None:
            try:
                self.prix_par_jour = float(self.prix_par_jour)
            except (ValueError, TypeError):
                raise ValidationError({'prix_par_jour': 'Le prix par jour doit être un nombre valide.'})
        if self.immatriculation:
            self.immatriculation = self.immatriculation.strip().upper()

    def save(self, *args, **kwargs):
        self.clean()
        if not self.marque:
            self.marque = 'Marque inconnue'
        if not self.modele:
            self.modele = 'Modèle inconnu'
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
                    self.montant_total = Decimal(self.montant_total)
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