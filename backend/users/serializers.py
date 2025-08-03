from decimal import Decimal, InvalidOperation
import decimal
import uuid
from venv import logger
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, Vehicule, Agence, Reservation
import re
from django.utils import timezone
from datetime import datetime
from django.contrib.auth import get_user_model
from bson.decimal128 import Decimal128

User = get_user_model()

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
        if value:
            clean_phone = re.sub(r'[\s\-\.]', '', value)
            if len(clean_phone) < 8:
                raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres")
        return value
    
    def validate_email(self, value):
        if value and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Format d'email invalide")
        return value.lower() if value else value

class UserSerializer(serializers.ModelSerializer):
    agence = AgenceSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'telephone', 'preference_carburant',
            'role', 'date_joined', 'photo_url', 'budget_journalier', 'agence'
        ]
        extra_kwargs = {
            'agence': {'required': False, 'allow_null': True}
        }

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    mot_de_passe = serializers.CharField(write_only=True, required=True)
    
    def validate_email(self, value):
        return value.lower().strip()

class SignUpSerializer(serializers.ModelSerializer):
    mot_de_passe = serializers.CharField(write_only=True, min_length=8, required=True)
    confirmer_mot_de_passe = serializers.CharField(write_only=True, required=True)
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
        extra_kwargs = {
            'email': {'required': True},
            'nom': {'required': True}
        }
    
    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée")
        return value.lower()
    
    def validate_mot_de_passe(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate_telephone(self, value):
        if value:
            clean_phone = re.sub(r'[\s\-\.]', '', value)
            if len(clean_phone) < 8:
                raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 8 chiffres")
        return value
    
    def validate_budget_journalier(self, value):
        if value is not None:
            try:
                value = Decimal(str(value))
                if value < 0 or value > 50000:
                    raise serializers.ValidationError("Le budget journalier doit être entre 0€ et 50 000€")
            except (ValueError, InvalidOperation):
                raise serializers.ValidationError("Le budget journalier doit être un nombre valide")
        return value
    
    def validate(self, data):
        if data['mot_de_passe'] != data['confirmer_mot_de_passe']:
            raise serializers.ValidationError({
                'confirmer_mot_de_passe': 'Les mots de passe ne correspondent pas'
            })
        return data
    
    def create(self, validated_data):
        password = validated_data.pop('mot_de_passe')
        validated_data.pop('confirmer_mot_de_passe')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            nom=validated_data.get('nom', ''),
            telephone=validated_data.get('telephone', ''),
            preference_carburant=validated_data.get('preference_carburant', ''),
            role=validated_data.get('role', 'visiteur'),
            budget_journalier=validated_data.get('budget_journalier', Decimal('50.00'))
        )
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    preference_carburant_display = serializers.SerializerMethodField()
    agence = AgenceSerializer(read_only=True)
    
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
        if obj.photo_url:
            return obj.photo_url
        return ''
    
    def get_preference_carburant_display(self, obj):
        choices_dict = dict(User._meta.get_field('preference_carburant').choices)
        return choices_dict.get(obj.preference_carburant, '')

class UserUpdateSerializer(serializers.ModelSerializer):
    agence_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = ['nom', 'email', 'telephone', 'preference_carburant', 'photo_url', 'budget_journalier', 'role', 'agence_id']
        read_only_fields = ['photo_url']
    
    def validate_email(self, value):
        if not value:
            raise serializers.ValidationError("L'email est requis")
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Format d'email invalide")
        user = self.instance
        if user and User.objects.filter(email=value.lower()).exclude(id=user.id).exists():
            raise serializers.ValidationError("Cette adresse email est déjà utilisée")
        return value.lower()
    
    def validate_nom(self, value):
        if not value or len(value.strip()) < 1:
            return "Utilisateur"
        if len(value.strip()) > 100:
            raise serializers.ValidationError("Le nom ne peut pas dépasser 100 caractères")
        return value.strip()
    
    def validate_telephone(self, value):
        if value:
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
    
    def validate_agence_id(self, value):
        if value:
            try:
                return Agence.objects.get(id=value)
            except Agence.DoesNotExist:
                raise serializers.ValidationError("L'agence spécifiée n'existe pas.")
        return None
    
    def update(self, instance, validated_data):
        agence = validated_data.pop('agence_id', None)
        if agence is not None:
            instance.agence = agence
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance

class VehiculeSerializer(serializers.ModelSerializer):
    agence = AgenceSerializer(read_only=True)
    agence_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Vehicule
        fields = [
            'id', 'marque', 'modele', 'carburant', 'transmission',
            'nombre_places', 'annee', 'kilometrage', 'couleur', 'immatriculation',
            'emissionsCO2', 'consommationEnergie', 'prix_par_jour', 'localisation',
            'description', 'statut', 'date_derniere_maintenance', 'prochaine_maintenance',
            'agence_id', 'agence', 'created_at', 'updated_at', 'image'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'agence']

    def validate_marque(self, value):
        if not value or len(value.strip()) < 1:
            return "Marque inconnue"
        return value.strip()

    def validate_immatriculation(self, value):
        # Handle None, empty string, or whitespace-only values
        if not value or (isinstance(value, str) and not value.strip()):
            # Generate a unique temporary immatriculation
            while True:
                temp_immat = f"TMP-{uuid.uuid4().hex[:8].upper()}"
                if not Vehicule.objects.filter(immatriculation=temp_immat).exists():
                    return temp_immat
        
        # Clean the value
        cleaned_value = value.strip() if isinstance(value, str) else value
        
        # Check for duplicates (exclude current instance if updating)
        queryset = Vehicule.objects.filter(immatriculation=cleaned_value)
        if hasattr(self, 'instance') and self.instance and self.instance.pk:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError("Cette immatriculation existe déjà.")
        
        return cleaned_value

    def validate_modele(self, value):
        if not value or len(value.strip()) < 1:
            return "Modèle inconnu"
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
        if value:
            try:
                return Agence.objects.get(id=value)
            except Agence.DoesNotExist:
                raise serializers.ValidationError("L'agence spécifiée n'existe pas.")
        return None

    def validate(self, attrs):
        """
        Object-level validation to ensure immatriculation is never None
        """
        # Ensure immatriculation is never None before saving
        if 'immatriculation' not in attrs or attrs.get('immatriculation') is None:
            attrs['immatriculation'] = f"TMP-{uuid.uuid4().hex[:8].upper()}"
        
        return attrs

    def create(self, validated_data):
        agence = validated_data.pop('agence_id', None)
        
        # Double-check immatriculation is not None before creating
        if not validated_data.get('immatriculation'):
            validated_data['immatriculation'] = f"TMP-{uuid.uuid4().hex[:8].upper()}"
        
        vehicle = Vehicule.objects.create(agence=agence, **validated_data)
        return vehicle

    def update(self, instance, validated_data):
        agence = validated_data.pop('agence_id', None)
        if agence is not None:
            instance.agence = agence
        
        # Ensure immatriculation is not set to None during update
        if 'immatriculation' in validated_data and not validated_data['immatriculation']:
            validated_data['immatriculation'] = f"TMP-{uuid.uuid4().hex[:8].upper()}"
            
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
    
    # Ajout des méthodes pour modifier et mettre en maintenance
    def modifier(self, instance, validated_data):
        """Méthode pour modifier un véhicule"""
        return self.update(instance, validated_data)
    
    def mettre_en_maintenance(self, instance):
        """Méthode pour mettre un véhicule en maintenance"""
        instance.statut = 'maintenance'
        instance.date_derniere_maintenance = timezone.now().date()
        instance.save()
        return instance

class ReservationSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField(read_only=True)
    vehicule_display = serializers.SerializerMethodField(read_only=True)
    vehicule_id = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = Reservation
        fields = [
            'id', 'vehicule_id', 'vehicule_display', 'user', 'date_debut',
            'date_fin', 'montant_total', 'statut', 'commentaires',
            'assurance_complete', 'conducteur_supplementaire', 'gps',
            'siege_enfant', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'vehicule_display', 'montant_total',
            'statut', 'created_at', 'updated_at'
        ]
    
    def get_user(self, obj):
        from .serializers import UserSerializer
        return UserSerializer(obj.user).data
    
    def get_vehicule_display(self, obj):
        from .serializers import VehiculeSerializer
        return VehiculeSerializer(obj.vehicule).data
    
    def _get_vehicle_price_as_decimal(self, vehicule):
        """Méthode utilitaire pour obtenir le prix comme Decimal"""
        prix = vehicule.prix_par_jour
        
        try:
            if isinstance(prix, Decimal128):
                return prix.to_decimal()
            elif isinstance(prix, Decimal):
                return prix
            elif isinstance(prix, (int, float)):
                return Decimal(str(prix))
            elif isinstance(prix, str):
                return Decimal(prix)
            else:
                # Tentative de conversion générique
                return Decimal(str(prix))
        except (TypeError, ValueError, decimal.InvalidOperation) as e:
            logger.error(f"Erreur conversion prix véhicule {vehicule.id}: {e}")
            raise serializers.ValidationError(
                f"Prix du véhicule invalide: {prix}"
            )
    
    def validate_vehicule_id(self, value):
        try:
            vehicle = Vehicule.objects.get(id=value)
            if vehicle.statut != 'disponible':
                raise serializers.ValidationError(
                    "Le véhicule n'est pas disponible pour la réservation."
                )
            return vehicle
        except Vehicule.DoesNotExist:
            raise serializers.ValidationError(
                "Le véhicule spécifié n'existe pas."
            )
    
    def validate(self, data):
        date_debut = data.get('date_debut')
        date_fin = data.get('date_fin')
        vehicule = data.get('vehicule_id')
        if date_debut and date_fin and date_fin <= date_debut:
            raise serializers.ValidationError(
                "La date de fin doit être postérieure à la date de début."
            )
        if vehicule and date_debut and date_fin:
            # Vérifier les chevauchements
            overlapping = Reservation.objects.filter(
                vehicule=vehicule,
                statut__in=['confirmee', 'en_attente'],
                date_debut__lt=date_fin,
                date_fin__gt=date_debut
            )
            
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
                
            if overlapping.exists():
                raise serializers.ValidationError(
                    "Le véhicule est déjà réservé pour ces dates."
                )
            # Calcul du montant avec gestion Decimal128
            delta = (date_fin - date_debut).days or 1
            prix = self._get_vehicle_price_as_decimal(vehicule)
            
            montant_total = prix * Decimal(delta)
            # Options supplémentaires
            if data.get('assurance_complete'):
                montant_total += delta * Decimal('15')
            if data.get('conducteur_supplementaire'):
                montant_total += delta * Decimal('8')
            if data.get('gps'):
                montant_total += delta * Decimal('5')
            if data.get('siege_enfant'):
                montant_total += delta * Decimal('3')
            data['montant_total'] = montant_total
            data['statut'] = 'en_attente'
        return data
    
    def create(self, validated_data):
        vehicule = validated_data.pop('vehicule_id')
        user = self.context['request'].user
        
        reservation = Reservation.objects.create(
            vehicule=vehicule,
            user=user,
            **validated_data
        )
        return reservation
    
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value.lower())
        except User.DoesNotExist:
            raise serializers.ValidationError("Aucun utilisateur trouvé avec cet email.")
        return value.lower()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, min_length=8, required=True)
    confirm_new_password = serializers.CharField(write_only=True, required=True)
    
    def validate_new_password(self, value):
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({
                'confirm_new_password': 'Les mots de passe ne correspondent pas'
            })
        return data