from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, Vehicule, Agence, Reservation
import re
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import datetime

# WARNING: Allowing unauthenticated access to vehicle and reservation management is a security risk.
# In production, consider adding rate limiting, a public API key, or reintroducing authentication.

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'telephone', 'preference_carburant',
            'role', 'date_joined', 'photo_url', 'budget_journalier', 'agence'
        ]

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    mot_de_passe = serializers.CharField(write_only=True, required=False)

    def validate_email(self, value):
        if value:
            return value.lower()
        return value

class SignUpSerializer(serializers.ModelSerializer):
    mot_de_passe = serializers.CharField(write_only=True, min_length=8, required=False)
    confirmer_mot_de_passe = serializers.CharField(write_only=True, required=False)
    role = serializers.ChoiceField(
        choices=[('client', 'Client'), ('agence', 'Agence'), ('admin', 'Admin'), ('visiteur', 'Visiteur')],
        default='visiteur',
        required=False
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'mot_de_passe', 'confirmer_mot_de_passe',
            'telephone', 'preference_carburant', 'role', 'budget_journalier'
        ]

    def validate_email(self, value):
        if value and User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée")
        return value.lower() if value else value

    def validate_mot_de_passe(self, value):
        if not value:
            return value
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_telephone(self, value):
        if not value:
            return value
        clean_phone = re.sub(r'[\s\-\.]', '', value)
        if len(clean_phone) < 8:
            raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres")
        return value

    def validate_budget_journalier(self, value):
        if value is not None and (value < 0 or value > 50000):
            raise serializers.ValidationError("Le budget journalier doit être entre 0€ et 50 000€")
        return value

    def validate(self, data):
        if data.get('mot_de_passe') and data.get('confirmer_mot_de_passe'):
            if data['mot_de_passe'] != data['confirmer_mot_de_passe']:
                raise serializers.ValidationError({
                    'confirmer_mot_de_passe': 'Les mots de passe ne correspondent pas'
                })
        return data

    def create(self, validated_data):
        password = validated_data.pop('mot_de_passe', None)
        validated_data.pop('confirmer_mot_de_passe', None)
        role = validated_data.get('role', 'visiteur')

        if password:
            user = User.objects.create_user(
                username=validated_data.get('email', f"user_{User.objects.count() + 1}"),
                email=validated_data.get('email', ''),
                password=password,
                nom=validated_data.get('nom', 'Utilisateur'),
                telephone=validated_data.get('telephone', ''),
                preference_carburant=validated_data.get('preference_carburant', ''),
                role=role,
                budget_journalier=validated_data.get('budget_journalier', 50)
            )
        else:
            user = User.objects.create(
                username=validated_data.get('email', f"guest_{User.objects.count() + 1}"),
                email=validated_data.get('email', ''),
                nom=validated_data.get('nom', 'Visiteur'),
                telephone=validated_data.get('telephone', ''),
                preference_carburant=validated_data.get('preference_carburant', ''),
                role=role,
                budget_journalier=validated_data.get('budget_journalier', 50),
                is_active=True
            )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    preference_carburant_display = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'full_name', 'telephone', 'preference_carburant',
            'preference_carburant_display', 'role', 'date_joined', 'last_login',
            'is_active', 'photo_url', 'budget_journalier', 'agence'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_full_name(self, obj):
        return obj.nom or f"Utilisateur {obj.id}"

    def get_photo_url(self, obj):
        return obj.photo_url or ""

    def get_preference_carburant_display(self, obj):
        if obj.preference_carburant:
            choices_dict = {
                'électrique': 'Électrique',
                'hybride': 'Hybride',
                'essence': 'Essence',
                'diesel': 'Diesel'
            }
            return choices_dict.get(obj.preference_carburant, obj.preference_carburant)
        return ""

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['nom', 'email', 'telephone', 'preference_carburant', 'photo_url', 'budget_journalier', 'role']
        read_only_fields = ['photo_url']

    def validate_email(self, value):
        if not value:
            return value
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Format d'email invalide")
        user = self.instance
        if user and User.objects.filter(email=value.lower()).exclude(id=user.id).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée")
        return value.lower() if value else value

    def validate_nom(self, value):
        if not value or len(value.strip()) < 1:
            return "Utilisateur"
        if len(value.strip()) > 100:
            raise serializers.ValidationError("Le nom ne peut pas dépasser 100 caractères")
        return value.strip()

    def validate_telephone(self, value):
        if not value:
            return value
        clean_phone = re.sub(r'[\s\-\.]', '', value)
        if len(clean_phone) < 8:
            raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres")
        return value

    def validate_preference_carburant(self, value):
        valid_choices = ['électrique', 'hybride', 'essence', 'diesel', '']
        if value and value not in valid_choices:
            raise serializers.ValidationError(
                f"Préférence carburant invalide. Choisissez parmi: {', '.join(valid_choices)}"
            )
        return value

    def validate_budget_journalier(self, value):
        if value is not None and (value < 0 or value > 50000):
            raise serializers.ValidationError("Le budget journalier doit être entre 0€ et 50 000€")
        return value

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

class VehiculeSerializer(serializers.ModelSerializer):
    agence = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Vehicule
        fields = [
            'id', 'marque', 'modele', 'type', 'carburant', 'transmission',
            'nombre_places', 'annee', 'kilometrage', 'couleur', 'immatriculation',
            'emissionsCO2', 'consommationEnergie', 'prix_par_jour', 'localisation',
            'description', 'climatisation', 'equipements', 'statut',
            'date_derniere_maintenance', 'prochaine_maintenance', 'agence_id',
            'agence', 'created_at', 'updated_at', 'image'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'agence']
        extra_kwargs = {'agence_id': {'required': False, 'allow_null': True}}

    def get_agence(self, obj):
        if obj.agence:
            return AgenceSerializer(obj.agence).data
        return None

    def validate_marque(self, value):
        if not value or len(value.strip()) < 1:
            return "Marque inconnue"
        return value.strip()

    def validate_modele(self, value):
        if not value or len(value.strip()) < 1:
            return "Modèle inconnu"
        return value.strip()

    def validate_type(self, value):
        if not value or len(value.strip()) < 1:
            return "Type inconnu"
        return value.strip()

    def validate_carburant(self, value):
        valid_choices = ['électrique', 'hybride', 'essence', 'diesel']
        if value not in valid_choices:
            return 'essence'
        return value

    def validate_transmission(self, value):
        valid_choices = ['manuelle', 'automatique']
        if value not in valid_choices:
            return 'manuelle'
        return value

    def validate_prix_par_jour(self, value):
        if value is None or value < 0:
            return 50
        if value > 50000:
            return 50000
        return value

    def validate_statut(self, value):
        valid_choices = ['disponible', 'loué', 'maintenance', 'hors_service']
        if value not in valid_choices:
            return 'disponible'
        return value

    def validate_image(self, value):
        if not value:
            return value
        allowed_types = ['image/jpeg', 'image/png', 'image/gif']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError("Type de fichier non autorisé. Utilisez JPEG, PNG ou GIF.")
        if value.size > 5 * 1024 * 1024:  # 5MB limit
            raise serializers.ValidationError("L'image ne doit pas dépasser 5MB.")
        return value

    def validate_agence_id(self, value):
        if value is None:
            return None  # Allow null if model supports it
        try:
            Agence.objects.get(id=value)
            return value
        except Agence.DoesNotExist:
            raise serializers.ValidationError("L'agence spécifiée n'existe pas.")

class AgenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agence
        fields = ['id', 'nom', 'adresse', 'ville', 'code_postal', 'pays', 'telephone', 'email', 'site_web', 'description', 'date_creation', 'active']
        read_only_fields = ['id', 'date_creation']

    def validate_nom(self, value):
        if not value or len(value.strip()) < 1:
            return "Agence sans nom"
        return value.strip()

    def validate_adresse(self, value):
        if not value or len(value.strip()) < 1:
            return "Adresse non spécifiée"
        return value.strip()

    def validate_ville(self, value):
        if not value or len(value.strip()) < 1:
            return "Ville non spécifiée"
        return value.strip()

    def validate_code_postal(self, value):
        if not value or len(value.strip()) < 1:
            return "Code postal non spécifié"
        return value.strip()

    def validate_pays(self, value):
        if not value or len(value.strip()) < 1:
            return "Pays non spécifié"
        return value.strip()

    def validate_telephone(self, value):
        if not value:
            return value
        clean_phone = re.sub(r'[\s\-\.]', '', value)
        if len(clean_phone) < 8:
            raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres")
        return value

    def validate_email(self, value):
        if value and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Format d'email invalide")
        return value.lower() if value else value

    def create(self, validated_data):
        return Agence.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

class ReservationSerializer(serializers.ModelSerializer):
    vehicule = VehiculeSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'user_id', 'user', 'vehicule_id', 'vehicule', 'date_debut',
            'date_fin', 'montant_total', 'statut', 'commentaires',
            'assurance_complete', 'conducteur_supplementaire', 'gps',
            'siege_enfant', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'vehicule', 'user', 'montant_total', 'statut']
        extra_kwargs = {'user_id': {'required': False, 'allow_null': True}}

    def validate_user_id(self, value):
        if value is None:
            return None
        try:
            User.objects.get(id=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("L'utilisateur spécifié n'existe pas.")

    def validate_vehicule_id(self, value):
        try:
            vehicle = Vehicule.objects.get(id=value)
            if vehicle.statut != 'disponible':
                raise serializers.ValidationError("Le véhicule n'est pas disponible pour la réservation.")
            return value
        except Vehicule.DoesNotExist:
            raise serializers.ValidationError("Le véhicule spécifié n'existe pas.")

    def validate(self, data):
        date_debut = data.get('date_debut')
        date_fin = data.get('date_fin')
        vehicule_id = data.get('vehicule_id')

        if date_debut and date_fin and date_fin <= date_debut:
            raise serializers.ValidationError("La date de fin doit être postérieure à la date de début.")

        if vehicule_id and date_debut and date_fin:
            overlapping_reservations = Reservation.objects.filter(
                vehicule_id=vehicule_id,
                statut__in=['confirmee', 'en_attente'],
                date_debut__lt=date_fin,
                date_fin__gt=date_debut
            )
            if overlapping_reservations.exists():
                raise serializers.ValidationError("Le véhicule est déjà réservé pour les dates spécifiées.")

            try:
                vehicle = Vehicule.objects.get(id=vehicule_id)
                delta = (date_fin - date_debut).days or 1
                montant_total = vehicle.prix_par_jour * delta
                if data.get('assurance_complete'):
                    montant_total += delta * 15
                if data.get('conducteur_supplementaire'):
                    montant_total += delta * 8
                if data.get('gps'):
                    montant_total += delta * 5
                if data.get('siege_enfant'):
                    montant_total += delta * 3
                data['montant_total'] = montant_total
                data['statut'] = 'en_attente'
            except Vehicule.DoesNotExist:
                raise serializers.ValidationError("Le véhicule spécifié n'existe pas.")

        return data