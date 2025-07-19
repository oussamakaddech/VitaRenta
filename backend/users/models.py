from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
import uuid
import re

def generate_uuid():
    return str(uuid.uuid4())

UUID_LENGTH = 36

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
        default=50.00,
        validators=[MinValueValidator(0)]
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom']

    def clean(self):
        super().clean()
        # Nettoyer le champ budget_journalier
        if self.budget_journalier is not None:
            budget_str = str(self.budget_journalier)
            cleaned_budget = re.sub(r'[\xa0\s]+', '', budget_str)
            try:
                self.budget_journalier = float(cleaned_budget)
            except ValueError:
                raise ValidationError({'budget_journalier': 'Le budget journalier doit être un nombre valide.'})

    def save(self, *args, **kwargs):
        # Nettoyer les données avant sauvegarde
        self.clean()
        
        if not self.username:
            if self.email:
                base_username = self.email.split('@')[0]
                unique_suffix = uuid.uuid4().hex[:8]
                self.username = f"{base_username}_{unique_suffix}"
            else:
                self.username = f"user_{uuid.uuid4().hex[:12]}"
        
        if self.email:
            self.email = self.email.lower()
        
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
    date_creation = models.DateTimeField(auto_now_add=True)  # Renommé pour cohérence
    active = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        # Nettoyer les champs texte
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
            self.telephone = re.sub(r'[\xa0]+', '', self.telephone)
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
    type = models.CharField(max_length=50)
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
    immatriculation = models.CharField(max_length=20, blank=True)
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
        validators=[MinValueValidator(0)],
        help_text=_('Prix quotidien en euros')
    )
    localisation = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    climatisation = models.BooleanField(default=False)
    equipements = models.JSONField(default=list, blank=True)
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
    agence_id = models.CharField(max_length=UUID_LENGTH, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='vehicules/', blank=True, null=True)

    def clean(self):
        super().clean()
        # Nettoyer les champs décimaux
        if self.consommationEnergie is not None:
            consommation_str = str(self.consommationEnergie)
            cleaned_consommation = re.sub(r'[\xa0\s]+', '', consommation_str)
            try:
                self.consommationEnergie = float(cleaned_consommation)
            except ValueError:
                raise ValidationError({'consommationEnergie': 'La consommation doit être un nombre valide.'})
        
        if self.prix_par_jour is not None:
            prix_str = str(self.prix_par_jour)
            cleaned_prix = re.sub(r'[\xa0\s]+', '', prix_str)
            try:
                self.prix_par_jour = float(cleaned_prix)
            except ValueError:
                raise ValidationError({'prix_par_jour': 'Le prix par jour doit être un nombre valide.'})

    def save(self, *args, **kwargs):
        self.clean()
        
        if not self.marque:
            self.marque = 'Marque inconnue'
        if not self.modele:
            self.modele = 'Modèle inconnu'
        if not self.type:
            self.type = 'Type inconnu'
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.marque} {self.modele} ({self.immatriculation or 'Sans immatriculation'})"

    @property
    def agence(self):
        if self.agence_id:
            try:
                return Agence.objects.get(id=self.agence_id)
            except Agence.DoesNotExist:
                return None
        return None

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['marque', 'modele'], name='vehicule_marque_modele_idx'),
            models.Index(fields=['statut'], name='vehicule_statut_idx'),
            models.Index(fields=['carburant'], name='vehicule_carburant_idx'),
            models.Index(fields=['type'], name='vehicule_type_idx'),
            models.Index(fields=['created_at'], name='vehicule_created_at_idx'),
            models.Index(fields=['agence_id'], name='vehicule_agence_idx'),
            models.Index(fields=['prix_par_jour'], name='vehicule_prix_idx')
        ]

class Reservation(models.Model):
    id = models.CharField(primary_key=True, max_length=UUID_LENGTH, default=generate_uuid, editable=False, unique=True)
    user_id = models.CharField(max_length=UUID_LENGTH)
    vehicule_id = models.CharField(max_length=UUID_LENGTH)
    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField()
    montant_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
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
        # Nettoyer le montant total
        if self.montant_total is not None:
            montant_str = str(self.montant_total)
            cleaned_montant = re.sub(r'[\xa0\s]+', '', montant_str)
            try:
                self.montant_total = float(cleaned_montant)
            except ValueError:
                raise ValidationError({'montant_total': 'Le montant total doit être un nombre valide.'})

    def save(self, *args, **kwargs):
        self.clean()
        
        if self.date_debut and self.date_fin:
            if self.date_fin <= self.date_debut:
                raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        super().save(*args, **kwargs)

    def __str__(self):
        user_info = f"User {self.user_id}"
        vehicule_info = f"Véhicule {self.vehicule_id}"
        return f"Reservation {self.id[:8]} - {user_info} - {vehicule_info}"

    @property
    def user(self):
        if self.user_id:
            try:
                return User.objects.get(id=self.user_id)
            except User.DoesNotExist:
                return None
        return None

    @property
    def vehicule(self):
        if self.vehicule_id:
            try:
                return Vehicule.objects.get(id=self.vehicule_id)
            except Vehicule.DoesNotExist:
                return None
        return None

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['date_debut', 'date_fin'], name='reservation_date_idx'),
            models.Index(fields=['statut'], name='reservation_statut_idx'),
            models.Index(fields=['created_at'], name='reservation_created_at_idx'),
            models.Index(fields=['user_id'], name='reservation_user_idx'),
            models.Index(fields=['vehicule_id'], name='reservation_vehicule_idx')
        ]
