from datetime import timedelta
import datetime
import random
import secrets
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db import transaction
from django.utils.encoding import force_str
from django.db.models import Sum, Count, Q, Avg, F
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
import logging
import os
# ❌ INCORRECT - Évitez cette importation
# import datetime

# ✅ CORRECT - Utilisez une de ces méthodes :

# Méthode 1 : Import direct de la classe
from datetime import datetime, date, timedelta

# Méthode 2 : Import du module complet
import datetime as dt

# Méthode 3 : Import spécifique
from datetime import datetime

from generate_eco_score_dataset import FUEL_TYPES
from .permissions import IsAdminOrAgency, IsAdminOrAgencyOrClientReadOnly
from .challenge_permissions import IsAdminOrAgencyForChallenges, IsOwnerOrAdminOrAgency, CanParticipateInChallenges
from django.conf import settings
from rest_framework.decorators import action
from .models import  EcoScore, Feedback, IOTData, User, Vehicule, Agence, Reservation, EcoChallenge, UserEcoChallenge, EcoChallengeProgress, EcoChallengeReward, ChallengeStatus, EcoChallengeType, RewardType
from .serializers import (
     AdvancedEcoChallengeSerializer, EcoChallengeBulkSerializer, FeedbackSerializer, LoginSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer, SignUpSerializer, UserSerializer, UserProfileSerializer,
    UserUpdateSerializer, VehiculeSerializer, AgenceSerializer, ReservationSerializer, EcoChallengeSerializer, UserEcoChallengeSerializer, 
    EcoChallengeProgressSerializer,ChallengeAnalyticsSerializer, CreateUserChallengeSerializer, EcoChallengeRewardSerializer
)
from rest_framework.permissions import BasePermission
from .permissions import IsAdminUser, IsAgencyUser, IsClientUser, IsAdminOrAgency, IsClientOrAgencyOrAdmin
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from .demand_forecast import ensemble_predict_demand, train_arima_model, train_xgboost_model, predict_demand
from .recommendation_system import RecommendationEngine
from rest_framework_jwt.authentication import JSONWebTokenAuthentication
from bson.decimal128 import Decimal128
from pymongo.errors import BulkWriteError  # Added for error handling
import traceback
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from urllib.parse import unquote
from decimal import Decimal
from bson.decimal128 import Decimal128
from pymongo.errors import BulkWriteError  # Added for error handling
import traceback
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from urllib.parse import unquote
from decimal import Decimal
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
import secrets
import base64
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
Sequential = keras.models.Sequential
load_model = keras.models.load_model
from keras.layers import LSTM, Dense, Dropout 
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
import joblib
import os
from .models import IOTData, EcoScore, MaintenancePrediction
from .serializers import IOTDataSerializer, EcoScoreSerializer, MaintenancePredictionSerializer
logger = logging.getLogger(__name__)

class UpdateAgenceView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAgency]
    authentication_classes = [JWTAuthentication]
    
    def patch(self, request):
        user = request.user
        agence_id = request.data.get('agence_id')
        if not agence_id:
            logger.error(f"Utilisateur {user.email} a tenté de mettre à jour l'agence sans fournir agence_id")
            return Response({"error": "agence_id requis"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            agence = Agence.objects.get(id=agence_id)
            with transaction.atomic():
                user.agence = agence
                user.save()
                logger.info(f"Agence {agence.nom} assignée à l'utilisateur {user.email}")
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)
        except Agence.DoesNotExist:
            logger.error(f"Agence avec id={agence_id} non trouvée pour l'utilisateur {user.email}")
            return Response({"error": "Agence non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur lors de l'assignation de l'agence pour {user.email}: {str(e)}")
            return Response({"error": f"Erreur serveur: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'errors': serializer.errors,
                'message': 'Données invalides'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data.get('email').lower().strip()
        password = serializer.validated_data.get('mot_de_passe')
        
        try:
            user = User.objects.get(email=email)
            if (hasattr(user, 'login_attempts') and 
                hasattr(user, 'last_login_attempt') and
                user.login_attempts >= 5 and
                user.last_login_attempt and
                timezone.now() - user.last_login_attempt < timedelta(minutes=1)):
                logger.warning(f"Tentative de connexion bloquée pour {email}")
                return Response({
                    'error': 'Trop de tentatives. Compte bloqué pendant 1 minute.',
                    'blocked_until': (user.last_login_attempt + timedelta(minutes=1)).isoformat(),
                    'attempts_remaining': 0
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            authenticated_user = authenticate(request, username=email, password=password)
            if authenticated_user:
                if hasattr(user, 'login_attempts'):
                    user.login_attempts = 0
                    user.last_login_attempt = None
                    user.save()
                
                refresh = RefreshToken.for_user(user)
                logger.info(f"Connexion réussie pour {email}")
                return Response({
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': UserSerializer(user).data,
                    'message': 'Connexion réussie'
                }, status=status.HTTP_200_OK)
            else:
                if hasattr(user, 'login_attempts'):
                    user.login_attempts = (user.login_attempts or 0) + 1
                    user.last_login_attempt = timezone.now()
                    user.save()
                    attempts_remaining = 5 - user.login_attempts
                    logger.warning(f"Tentative de connexion échouée pour {email}, tentatives restantes: {attempts_remaining}")
                    return Response({
                        'error': 'Email ou mot de passe incorrect',
                        'attempts_remaining': max(0, attempts_remaining)
                    }, status=status.HTTP_401_UNAUTHORIZED)
                else:
                    logger.warning(f"Tentative de connexion échouée pour {email} (pas de suivi des tentatives)")
                    return Response({
                        'error': 'Email ou mot de passe incorrect'
                    }, status=status.HTTP_401_UNAUTHORIZED)
        
        except User.DoesNotExist:
            logger.warning(f"Tentative de connexion avec email inexistant: {email}")
            return Response({
                'error': 'Email ou mot de passe incorrect'
            }, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({"error": "Refresh token requis"}, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info(f"Déconnexion réussie pour {request.user.email}")
            return Response({"message": "Déconnexion réussie"}, status=status.HTTP_200_OK)
        except TokenError as e:
            logger.error(f"Erreur lors de la déconnexion pour {request.user.email}: {str(e)}")
            return Response({"error": "Token invalide"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion: {str(e)}")
            return Response({"error": "Erreur serveur"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SignUpView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'errors': serializer.errors,
                'message': 'Données invalides'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                user = serializer.save()
                refresh = RefreshToken.for_user(user)
                logger.info(f"Nouveau compte créé: {user.email}")
                return Response({
                    'message': 'Inscription réussie !',
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Erreur lors de l'inscription: {str(e)}")
            return Response({
                'error': 'Erreur lors de la création du compte'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        try:
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du profil pour {request.user.email}: {str(e)}")
            return Response({
                'error': 'Erreur interne du serveur'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request):
        try:
            serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                with transaction.atomic():
                    updated_user = serializer.save()
                    logger.info(f"Profil mis à jour pour l'utilisateur {request.user.email}")
                    return Response(UserProfileSerializer(updated_user).data, status=status.HTTP_200_OK)
            return Response({
                'errors': serializer.errors,
                'message': 'Données invalides'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du profil pour {request.user.email}: {str(e)}")
            return Response({
                'error': 'Erreur lors de la mise à jour du profil'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserPhotoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request):
        try:
            if 'photo' not in request.FILES:
                return Response({
                    'error': 'Aucune photo fournie'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            photo = request.FILES['photo']
            allowed_types = ['image/jpeg', 'image/png', 'image/gif']
            if photo.content_type not in allowed_types:
                return Response({
                    'error': 'Type de fichier non autorisé. Utilisez JPEG, PNG ou GIF.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if photo.size > 5 * 1024 * 1024:
                return Response({
                    'error': 'La photo ne doit pas dépasser 5MB'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'profile_photos')
            os.makedirs(upload_dir, exist_ok=True)
            file_extension = photo.name.split('.')[-1]
            filename = f"{request.user.id}.{file_extension}"
            file_path = os.path.join(upload_dir, filename)
            
            with open(file_path, 'wb') as f:
                for chunk in photo.chunks():
                    f.write(chunk)
            
            photo_url = f"{settings.MEDIA_URL}profile_photos/{filename}"
            request.user.photo_url = photo_url
            request.user.save()
            
            logger.info(f"Photo uploadée pour l'utilisateur {request.user.email}")
            return Response({
                'message': 'Photo uploadée avec succès',
                'photo_url': photo_url
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de l'upload de photo pour {request.user.email}: {str(e)}")
            return Response({
                'error': 'Erreur lors de l\'upload de la photo'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserStatsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        try:
            user = request.user
            reservations = Reservation.objects.filter(user_id=user.id)
            
            # Gérer correctement Decimal128 pour le total des dépenses
            total_depense = 0
            for reservation in reservations:
                if reservation.montant_total:
                    if isinstance(reservation.montant_total, Decimal128):
                        total_depense += float(reservation.montant_total.to_decimal())
                    else:
                        total_depense += float(reservation.montant_total or 0)
            
            # Gérer correctement Decimal128 pour le budget journalier
            budget_journalier = 0
            if user.budget_journalier:
                if isinstance(user.budget_journalier, Decimal128):
                    budget_journalier = float(user.budget_journalier.to_decimal())
                else:
                    budget_journalier = float(user.budget_journalier or 0)
            
            stats = {
                'total_reservations': reservations.count(),
                'reservations_actives': reservations.filter(statut='confirmee').count(),
                'reservations_terminees': reservations.filter(statut='terminee').count(),
                'reservations_annulees': reservations.filter(statut='annulee').count(),
                'total_depense': total_depense,
                'vehicule_prefere': user.preference_carburant or 'Non défini',
                'membre_depuis': user.date_joined.strftime('%Y-%m-%d'),
                'derniere_connexion': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Jamais',
                'agence_associee': AgenceSerializer(user.agence).data if user.agence else None,
                'compte_actif': user.is_active,
                'budget_journalier': budget_journalier,
            }
            
            logger.info(f"Statistiques récupérées pour l'utilisateur {user.email}")
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques pour {request.user.email}: {str(e)}")
            return Response({
                'error': f'Erreur lors de la récupération des statistiques: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VehiculeViewSet(ModelViewSet):
    queryset = Vehicule.objects.all()
    serializer_class = VehiculeSerializer
    permission_classes = [AllowAny]  # À remplacer par IsAdminOrAgency pour plus de sécurité
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user
        logger.debug(f"get_queryset - User: {user.email if user.is_authenticated else 'anonymous'}, Role: {user.role if user.is_authenticated else 'none'}")
        
        # Les agences voient maintenant tous les véhicules, pas seulement ceux de leur agence
        if user.is_authenticated and user.role == 'agence' and not user.agence:
            logger.warning(f"Agency user {user.email} has no associated agence")
            queryset = queryset.none()  # Return empty queryset for agency users without an agency
        
        # Filtres de recherche
        if params.get('carburant'):
            queryset = queryset.filter(carburant=params.get('carburant'))
        if params.get('statut'):
            queryset = queryset.filter(statut=params.get('statut'))
        if params.get('agence_id'):
            queryset = queryset.filter(agence_id=params.get('agence_id'))
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(marque__icontains=search_term) |
                Q(modele__icontains=search_term) |
                Q(immatriculation__icontains=search_term)
            )
        if params.get('prix_min'):
            queryset = queryset.filter(prix_par_jour__gte=params.get('prix_min'))
        if params.get('prix_max'):
            queryset = queryset.filter(prix_par_jour__lte=params.get('prix_max'))
        if params.get('places_min'):
            queryset = queryset.filter(nombre_places__gte=params.get('places_min'))
        if params.get('transmission'):
            queryset = queryset.filter(transmission=params.get('transmission'))
        if params.get('marque'):
            queryset = queryset.filter(marque__icontains=params.get('marque'))
        if params.get('localisation'):
            queryset = queryset.filter(localisation__icontains=params.get('localisation'))
        
        logger.debug(f"get_queryset - Final queryset size: {queryset.count()}")
        return queryset.order_by('-created_at').select_related('agence')
    
    def perform_create(self, serializer):
        try:
            user = self.request.user
            # Les agences peuvent maintenant créer des véhicules pour n'importe quelle agence
            if user.role == 'agence' and user.agence:
                serializer.save()
            else:
                serializer.save()
            logger.info(f"Véhicule créé: {serializer.validated_data['marque']} {serializer.validated_data['modele']} par {user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la création du véhicule: {str(e)}")
            raise
    
    def perform_update(self, serializer):
        try:
            vehicle = serializer.save()
            logger.info(f"Véhicule mis à jour: {vehicle.marque} {vehicle.modele} par {self.request.user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du véhicule: {str(e)}")
            raise
    
    def perform_destroy(self, instance):
        try:
            logger.info(f"Véhicule supprimé: {instance.marque} {instance.modele} par {self.request.user.email}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du véhicule: {str(e)}")
            raise
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            queryset = self.get_queryset()
            
            # Calcul des statistiques
            total = queryset.count()
            disponibles = queryset.filter(statut='disponible').count()
            loues = queryset.filter(statut='loué').count()
            maintenance = queryset.filter(statut='maintenance').count()
            hors_service = queryset.filter(statut='hors_service').count()
            
            # Calcul par type de carburant
            par_carburant = dict(
                queryset.values('carburant')
                .annotate(count=Count('id'))
                .values_list('carburant', 'count')
            )
            
            # Calcul du prix moyen
            prix_moyen = 0.0
            try:
                prix_values = queryset.values_list('prix_par_jour', flat=True).exclude(prix_par_jour__isnull=True)
                if prix_values:
                    total_prix = 0
                    count = 0
                    for prix in prix_values:
                        try:
                            if isinstance(prix, Decimal128):
                                total_prix += float(prix.to_decimal())
                            elif isinstance(prix, (int, float, Decimal)):
                                total_prix += float(prix)
                            count += 1
                        except (TypeError, ValueError, AttributeError):
                            continue
                    
                    if count > 0:
                        prix_moyen = total_prix / count
            except Exception as e:
                logger.error(f"Erreur lors du calcul du prix moyen: {str(e)}")
                prix_moyen = 0.0
            
            stats = {
                'total': total,
                'disponibles': disponibles,
                'loues': loues,
                'maintenance': maintenance,
                'hors_service': hors_service,
                'par_carburant': par_carburant,
                'prix_moyen': prix_moyen
            }
            
            logger.info(f"Statistiques véhicules récupérées pour {request.user.email if request.user.is_authenticated else 'utilisateur anonyme'}")
            return Response(stats)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques véhicules: {str(e)}", exc_info=True)
            return Response({
                'error': f'Erreur lors de la récupération des statistiques: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AgenceViewSet(ModelViewSet):
    queryset = Agence.objects.all()
    serializer_class = AgenceSerializer
    permission_classes = [IsAdminOrAgencyOrClientReadOnly]
    authentication_classes = [JWTAuthentication]
    
    def get_permissions(self):
        """
        Override get_permissions to handle different permissions for different actions
        """
        if self.action in ['list', 'retrieve']:
            # Allow anyone to view agencies
            permission_classes = [AllowAny]
        elif self.action == 'active_only':
            # Allow authenticated users to see active agencies
            permission_classes = [IsAuthenticated]
        else:
            # Require admin or agency role for write operations
            permission_classes = [IsAdminOrAgency]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user
        
        # If user is an agency user, restrict to their own agency
        if user.is_authenticated and user.role == 'agence' and user.agence:
            queryset = queryset.filter(id=user.agence.id)
        
        # Handle active filter parameter
        if params.get('active'):
            active_param = params.get('active').lower()
            if active_param == 'true':
                # Due to MongoDB/djongo compatibility issues with boolean filters,
                # we'll handle this in Python rather than at the database level
                all_agencies = list(queryset)
                active_agencies = [agency for agency in all_agencies if agency.active]
                # Return a queryset-like object with the filtered results
                return self.queryset.filter(id__in=[agency.id for agency in active_agencies])
            elif active_param == 'false':
                all_agencies = list(queryset)
                inactive_agencies = [agency for agency in all_agencies if not agency.active]
                return self.queryset.filter(id__in=[agency.id for agency in inactive_agencies])
        
        # Other filter parameters
        if params.get('nom'):
            queryset = queryset.filter(nom__icontains=params.get('nom'))
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(nom__icontains=search_term) |
                Q(adresse__icontains=search_term) |
                Q(ville__icontains=search_term) |
                Q(code_postal__icontains=search_term)
            )
        
        return queryset.order_by('-date_creation')
    
    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                agence = serializer.save()
                user = self.request.user
                if user.is_authenticated and not user.agence and user.role in ['agence', 'admin']:
                    user.agence = agence
                    user.save()
                    logger.info(f"Utilisateur {user.email} associé à l'agence {agence.nom}")
                logger.info(f"Agence créée: {agence.nom} par {user.email if user.is_authenticated else 'anonyme'}")
                return agence
        except Exception as e:
            logger.error(f"Erreur lors de la création d'agence: {str(e)}")
            raise
    
    def perform_update(self, serializer):
        try:
            agence = serializer.save()
            logger.info(f"Agence mise à jour: {agence.nom} par {self.request.user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de l'agence: {str(e)}")
            raise
    
    def perform_destroy(self, instance):
        try:
            if Vehicule.objects.filter(agence=instance).exists():
                raise ValidationError("Impossible de supprimer l'agence : des véhicules y sont associés.")
            
            if User.objects.filter(agence=instance).exists():
                User.objects.filter(agence=instance).update(agence=None)
                logger.info(f"Suppression des références d'agence pour les utilisateurs associés à {instance.nom}")
            
            logger.info(f"Agence supprimée: {instance.nom} par {self.request.user.email}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'agence: {str(e)}")
            raise
    
    @action(detail=True, methods=['get'])
    def statistiques(self, request, pk=None):
        try:
            agence = get_object_or_404(Agence, id=pk)
            vehicles = Vehicule.objects.filter(agence=agence)
            reservations = Reservation.objects.filter(vehicule__in=vehicles)
            
            # Calculer le revenu total en gérant correctement Decimal128
            revenus_total = 0.0
            for reservation in reservations:
                if reservation.montant_total:
                    if isinstance(reservation.montant_total, Decimal128):
                        revenus_total += float(reservation.montant_total.to_decimal())
                    else:
                        revenus_total += float(reservation.montant_total or 0)
            
            # Calculer le prix moyen en gérant correctement Decimal128
            moyenne_prix_par_jour = 0.0
            prix_values = vehicles.values_list('prix_par_jour', flat=True).exclude(prix_par_jour__isnull=True)
            if prix_values:
                total_prix = 0
                count = 0
                for prix in prix_values:
                    try:
                        if isinstance(prix, Decimal128):
                            total_prix += float(prix.to_decimal())
                        elif isinstance(prix, (int, float, Decimal)):
                            total_prix += float(prix)
                        count += 1
                    except (TypeError, ValueError, AttributeError):
                        continue
                
                if count > 0:
                    moyenne_prix_par_jour = total_prix / count
            
            stats = {
                'total_vehicules': vehicles.count(),
                'vehicules_disponibles': vehicles.filter(statut='disponible').count(),
                'vehicules_loues': vehicles.filter(statut='loue').count(),
                'vehicules_maintenance': vehicles.filter(statut='maintenance').count(),
                'vehicules_hors_service': vehicles.filter(statut='hors_service').count(),
                'total_reservations': reservations.count(),
                'reservations_actives': reservations.filter(statut='confirmee').count(),
                'reservations_terminees': reservations.filter(statut='terminee').count(),
                'reservations_annulees': reservations.filter(statut='annulee').count(),
                'revenus_total': revenus_total,
                'moyenne_prix_par_jour': moyenne_prix_par_jour
            }
            
            logger.info(f"Statistiques récupérées pour l'agence {agence.nom} par {request.user.email}")
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques pour l'agence {pk}: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def active_only(self, request):
        """
        Endpoint accessible à tous les utilisateurs authentifiés pour récupérer 
        les agences actives. Utile pour les clients qui doivent voir les agences 
        disponibles pour effectuer des réservations.
        """
        try:
            # Due to MongoDB/djongo compatibility issues with boolean filters,
            # we'll handle this in Python rather than at the database level
            all_agencies = list(self.queryset.all())
            active_agencies = [agency for agency in all_agencies if agency.active]
            
            serializer = self.get_serializer(active_agencies, many=True)
            
            logger.info(f"Liste des agences actives récupérée par {request.user.email} (rôle: {request.user.role})")
            return Response({
                'agences': serializer.data,
                'count': len(active_agencies),
                'message': 'Agences actives récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des agences actives: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des agences actives'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IsClientOrAgence(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['client', 'agence']

class ReservationViewSet(ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [AllowAny]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user.is_authenticated:
            return queryset.none()
        
        if getattr(user, 'role', None) == 'client':
            queryset = queryset.filter(user=user)
        elif getattr(user, 'role', None) == 'agence' and getattr(user, 'agence', None):
            queryset = queryset.filter(vehicule__agence=user.agence)
        
        params = self.request.query_params
        if params.get('statut'):
            queryset = queryset.filter(statut=params.get('statut'))
        if params.get('vehicule_id'):
            queryset = queryset.filter(vehicule_id=params.get('vehicule_id'))
        if params.get('date_debut'):
            try:
                date_debut = timezone.datetime.fromisoformat(params.get('date_debut'))
                queryset = queryset.filter(date_debut__gte=date_debut)
            except ValueError:
                pass
        if params.get('date_fin'):
            try:
                date_fin = timezone.datetime.fromisoformat(params.get('date_fin'))
                queryset = queryset.filter(date_fin__lte=date_fin)
            except ValueError:
                pass
        
        return queryset.order_by('-created_at').select_related('user', 'vehicule__agence')
    
    def perform_create(self, serializer):
        """Éviter la double sauvegarde du véhicule"""
        user = self.request.user
        
        try:
            # Sauvegarder la réservation
            reservation = serializer.save()
            
            # Mettre à jour le véhicule SANS appeler save()
            # car cela déclenche clean() qui cause l'erreur Decimal128
            vehicle = reservation.vehicule
            
            # Méthode 1 : Mise à jour directe en base
            Vehicule.objects.filter(id=vehicle.id).update(statut='loué')
            
            logger.info(f"Réservation créée: ID {reservation.id} pour {user.email}")
            
        except Exception as e:
            logger.error(f"Erreur lors de la création de la réservation: {str(e)}")
            raise
    
    def perform_update(self, serializer):
        try:
            reservation = serializer.save()
            logger.info(f"Réservation mise à jour: ID {reservation.id} par {self.request.user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de la réservation: {str(e)}")
            raise
    
    def perform_destroy(self, instance):
        """Correction similaire pour la suppression"""
        try:
            vehicle_id = instance.vehicule.id
            
            # Supprimer la réservation d'abord
            logger.info(f"Réservation supprimée: ID {instance.id} par {self.request.user.email}")
            instance.delete()
            
            # Puis mettre à jour le véhicule sans déclencher clean()
            Vehicule.objects.filter(id=vehicle_id).update(statut='disponible')
            
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de la réservation: {str(e)}")
            raise
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        try:
            reservation = get_object_or_404(Reservation, id=pk)
            new_status = request.data.get('statut')
            valid_statuses = ['en_attente', 'confirmee', 'terminee', 'annulee']
            
            if new_status not in valid_statuses:
                return Response({
                    'error': f"Statut invalide. Choisissez parmi: {', '.join(valid_statuses)}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if (getattr(request.user, 'role', None) == 'agence' and
                    reservation.vehicule.agence != request.user.agence):
                return Response({
                    'error': "Vous n'êtes pas autorisé à modifier cette réservation"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Mettre à jour le statut de la réservation
            reservation.statut = new_status
            reservation.save()
            
            # Mettre à jour le véhicule sans déclencher clean()
            vehicle_id = reservation.vehicule.id
            if new_status in ['annulee', 'terminee']:
                Vehicule.objects.filter(id=vehicle_id).update(statut='disponible')
            elif new_status == 'confirmee':
                Vehicule.objects.filter(id=vehicle_id).update(statut='loué')
            
            logger.info(f"Statut de la réservation {reservation.id} mis à jour à '{new_status}' par {request.user.email}")
            return Response({
                'message': 'Statut de la réservation mis à jour',
                'reservation': ReservationSerializer(reservation).data
            })
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du statut de la réservation pour {pk}: {str(e)}")
            return Response({
                'error': 'Erreur lors de la mise à jour du statut'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsAdminOrAgency])
    def stats(self, request):
        try:
            queryset = self.get_queryset()
            
            # Corrigé : Calcul de la durée moyenne
            total_duration = 0
            count = 0
            for reservation in queryset:
                if reservation.date_debut and reservation.date_fin:
                    duration = (reservation.date_fin - reservation.date_debut).days
                    total_duration += duration
                    count += 1
            
            average_duration = total_duration / count if count > 0 else 0
            
            # Corrigé : Calcul du revenu total en gérant Decimal128
            revenus_total = 0.0
            montant_values = queryset.values_list('montant_total', flat=True).exclude(montant_total__isnull=True)
            if montant_values:
                for montant in montant_values:
                    try:
                        if isinstance(montant, Decimal128):
                            revenus_total += float(montant.to_decimal())
                        elif isinstance(montant, (int, float, Decimal)):
                            revenus_total += float(montant)
                    except (TypeError, ValueError, AttributeError):
                        continue
            
            stats = {
                'total': queryset.count(),
                'en_attente': queryset.filter(statut='en_attente').count(),
                'confirmees': queryset.filter(statut='confirmee').count(),
                'terminees': queryset.filter(statut='terminee').count(),
                'annulees': queryset.filter(statut='annulee').count(),
                'revenus_total': revenus_total,
                'moyenne_duree': float(average_duration)
            }
            
            logger.info(f"Statistiques des réservations récupérées pour {request.user.email}")
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    authentication_classes = [JWTAuthentication]
    @action(detail=False, methods=['get'])
    def agency_users_without_agency(self, request):
        """Récupère les utilisateurs de rôle 'agence' sans agence assignée"""
        try:
            users = User.objects.filter(role='agence', agence__isnull=True)
            serializer = self.get_serializer(users, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({
                'error': f"Erreur lors de la récupération des utilisateurs: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        
        if params.get('role'):
            queryset = queryset.filter(role=params.get('role'))
        elif params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(email__icontains=search_term) |
                Q(nom__icontains=search_term) |
                Q(telephone__icontains=search_term)
            )
        if params.get('is_active'):
            is_active = params.get('is_active').lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        if params.get('agence_id'):
            queryset = queryset.filter(agence_id=params.get('agence_id'))
        
        return queryset.order_by('-date_joined')
    
    def perform_create(self, serializer):
        try:
            user = serializer.save()
            logger.info(f"Utilisateur créé: {user.email} par {self.request.user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la création de l'utilisateur: {str(e)}")
            raise
    
    def perform_update(self, serializer):
        try:
            user = serializer.save()
            logger.info(f"Utilisateur mis à jour: {user.email} par {self.request.user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de l'utilisateur: {str(e)}")
            raise
    
    def perform_destroy(self, instance):
        try:
            if instance.id == self.request.user.id:
                raise ValidationError("Vous ne pouvez pas supprimer votre propre compte.")
            
            logger.info(f"Utilisateur supprimé: {instance.email} par {self.request.user.email}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'utilisateur: {str(e)}")
            raise
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdminUser])
    def toggle_active(self, request, pk=None):
        try:
            user = get_object_or_404(User, id=pk)
            
            if user.id == request.user.id:
                return Response({
                    'error': 'Vous ne pouvez pas modifier votre propre statut actif'
                }, status=status.HTTP_403_FORBIDDEN)
            
            user.is_active = not user.is_active
            user.save()
            
            status_text = 'activé' if user.is_active else 'désactivé'
            logger.info(f"Utilisateur {user.email} {status_text} par {request.user.email}")
            
            return Response({
                'message': f"Utilisateur {status_text} avec succès",
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la modification du statut actif de l'utilisateur {pk}: {str(e)}")
            return Response({
                'error': 'Erreur lors de la modification du statut'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            queryset = self.get_queryset()
            
            # Aggregate basic stats
            stats = queryset.aggregate(
                total_users=Count('id'),
                active_users=Count('id', filter=Q(is_active=True)),
                inactive_users=Count('id', filter=Q(is_active=False))
            )
            
            # Handle null values
            for key in ['total_users', 'active_users', 'inactive_users']:
                stats[key] = stats[key] or 0
            
            # Role distribution
            try:
                stats['by_role'] = dict(
                    queryset.values('role')
                    .annotate(count=Count('id'))
                    .values_list('role', 'count')
                )
            except Exception as e:
                logger.warning(f"Error calculating role distribution: {str(e)}")
                stats['by_role'] = {}
            
            # Average membership duration
            try:
                avg_days = queryset.filter(date_joined__isnull=False).aggregate(
                    avg_days=Avg(timezone.now() - F('date_joined'))
                )['avg_days']
                stats['membre_depuis_moyen'] = round(avg_days.days, 2) if avg_days else 0.0
            except Exception as e:
                logger.warning(f"Error calculating average membership duration: {str(e)}")
                stats['membre_depuis_moyen'] = 0.0
            
            # Activity rate
            stats['taux_activite'] = round((stats['active_users'] / stats['total_users'] * 100), 2) if stats['total_users'] > 0 else 0.0
            
            logger.info(f"User statistics retrieved for {request.user.email}")
            return Response({
                'stats': stats,
                'message': 'User statistics retrieved successfully',
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving user statistics: {str(e)}", exc_info=True)
            return Response({
                'error': f'Error retrieving statistics: {str(e)}',
                'stats': {
                    'total_users': 0,
                    'active_users': 0,
                    'inactive_users': 0,
                    'by_role': {},
                    'membre_depuis_moyen': 0.0,
                    'taux_activite': 0.0
                },
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
from datetime import datetime
        
class DemandForecastView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [JSONWebTokenAuthentication]
    
    def get(self, request):
        try:
            # Log the raw request for debugging
            logger.info(f"Raw request params: {request.query_params}")
            
            # Extract and decode parameters from request
            location = force_str(unquote(request.query_params.get('location', 'Tunis')))
            carburant = force_str(unquote(request.query_params.get('carburant', 'électrique')))
            date = force_str(unquote(request.query_params.get('date', '')))
            
            logger.info(f"Decoded params - Location: {location}, Carburant: {carburant}, Date: {date}")
            
            # Validate required parameters
            if not date:
                logger.error(f"Demand prediction failed: missing date for user {getattr(request.user, 'email', 'anonymous')}")
                return Response(
                    {"error": "Date requise (format: AAAA-MM-JJ)"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate date format
            try:
                parsed_date = datetime.strptime(date, '%Y-%m-%d')

            except ValueError as ve:
                logger.error(f"Invalid date format: {date}, error: {str(ve)}")
                return Response(
                    {"error": "Format de date invalide. Utilisez AAAA-MM-JJ."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate location and fuel type
            valid_locations = ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Djerba']
            valid_fuels = ['essence', 'diesel', 'électrique', 'hybride']
            
            if location not in valid_locations:
                logger.error(f"Invalid location: {location}")
                return Response(
                    {"error": f"Localisation invalide. Choisissez parmi: {', '.join(valid_locations)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if carburant not in valid_fuels:
                logger.error(f"Invalid fuel type: {carburant}")
                return Response(
                    {"error": f"Type de carburant invalide. Choisissez parmi: {', '.join(valid_fuels)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check user permissions for location access
            if hasattr(request.user, 'role') and request.user.role == 'agence':
                if hasattr(request.user, 'agence') and request.user.agence:
                    user_location = getattr(request.user.agence, 'ville', None)
                    if user_location and user_location != location:
                        return Response(
                            {"error": "Accès limité à votre localisation d'agence"}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
            
            # Define holidays and special events for 2025
            holidays = [
                "2025-01-01", "2025-01-14", "2025-03-20", "2025-04-09",
                "2025-05-01", "2025-07-25", "2025-08-13", "2025-10-15"
            ]
            
            family_events = [
                "2025-03-30", "2025-03-31", "2025-04-01",  # Eid al-Fitr
                "2025-06-06", "2025-06-07", "2025-06-26"   # Eid al-Adha and related
            ]
            
            # Check if CSV file exists
            csv_path = os.path.join(settings.BASE_DIR, 'data', 'demand_forecast_dataset_2025.csv')
            logger.info(f"Looking for CSV file at: {csv_path}")
            
            if not os.path.exists(csv_path):
                logger.error(f"CSV file not found: {csv_path}")
                return Response(
                    {"error": "Données historiques non disponibles"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generate forecast for multiple periods (7 days)
            forecast_data = []
            base_date = parsed_date
            
            logger.info(f"Starting forecast generation for {location} - {carburant}")
            
            for i in range(7):
                current_date = base_date + timedelta(days=i)
                current_date_str = current_date.strftime('%Y-%m-%d')
                
                # Update context for current date
                current_is_holiday = 1 if current_date_str in holidays else 0
                current_is_family_event = 1 if current_date_str in family_events else 0
                
                # Get weather data for this date (simplified)
                is_rainy = 0  # Default value, could be enhanced with weather API
                taux_occupation = 0.5  # Default occupancy rate
                
                # Create context array
                context = [is_rainy, current_is_family_event, current_is_holiday, taux_occupation]
                
                # Get prediction for this specific date
                try:
                    predicted_demand = ensemble_predict_demand(
                        csv_path, 
                        location, 
                        carburant, 
                        context, 
                        current_date_str
                    )
                    logger.info(f"Prediction for {current_date_str}: {predicted_demand}")
                except Exception as pred_error:
                    logger.error(f"Error in ensemble_predict_demand: {str(pred_error)}")
                    predicted_demand = 0
                
                if predicted_demand is None or predicted_demand < 0:
                    predicted_demand = 0
                
                forecast_data.append({
                    "period": current_date_str,
                    "demand": max(0, round(float(predicted_demand), 2)),
                    "vehicle_type": carburant,
                    "location": location
                })
            
            # Check if we have any valid predictions
            if not forecast_data or all(item["demand"] == 0 for item in forecast_data):
                logger.warning(f"No predictions available for {location} - {carburant}")
                return Response(
                    {"error": f"Aucune donnée disponible pour {location} - {carburant}"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            logger.info(f"Successful prediction for {location} - {carburant} starting {date}")
            
            total_predicted = sum(item["demand"] for item in forecast_data)
            average_daily = total_predicted / len(forecast_data) if forecast_data else 0
            
            return Response({
                "location": location,
                "carburant": carburant,
                "start_date": date,
                "forecast": forecast_data,
                "total_predicted": round(total_predicted, 2),
                "average_daily": round(average_daily, 2)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            user_email = getattr(request.user, 'email', 'anonymous') if hasattr(request, 'user') else 'anonymous'
            error_traceback = traceback.format_exc()
            logger.error(f"Error during demand prediction for user {user_email}: {str(e)}")
            logger.error(f"Full traceback: {error_traceback}")
            
            return Response(
                {"error": "Une erreur interne est survenue. Veuillez réessayer."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RecommendationView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def get(self, request):
        try:
            if not request.user.is_authenticated:
                logger.error("User is not authenticated")
                return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
            user_email = request.user.email
            user_id = str(request.user.id)
            logger.info(f"Processing recommendation request for user: {user_email} (ID: {user_id})")
            
            try:
                n_items = int(request.query_params.get('n_items', 5))
                if n_items < 1 or n_items > 20:
                    return Response({"error": "n_items must be between 1 and 20"}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({"error": "n_items must be a valid integer"}, status=status.HTTP_400_BAD_REQUEST)
                
            type_vehicule = request.query_params.get('type_vehicule', None)
            marque = request.query_params.get('marque', None)
            logger.info(f"Request parameters: n_items={n_items}, type_vehicule={type_vehicule}, marque={marque}")
            
            csv_path = getattr(settings, 'DATASETS', {}).get('recommendation')
            if not csv_path:
                csv_path = os.path.join(settings.BASE_DIR, 'data', 'recommendation_dataset_cars_2025.csv')
            
            if not os.path.exists(csv_path):
                logger.warning(f"Recommendation dataset not found at: {csv_path}, proceeding with defaults")
            
            try:
                logger.info("Initializing recommendation engine...")
                engine = RecommendationEngine()
                logger.info("Recommendation engine initialized successfully")
            except Exception as engine_error:
                logger.error(f"Failed to initialize recommendation engine: {str(engine_error)}")
                return Response({"error": "Recommendation service temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            try:
                def get_recommendations_safe():
                    try:
                        return engine.recommend_vehicles(
                            user_id=user_id,
                            n_items=n_items,
                            csv_path=csv_path,
                            type_vehicule=type_vehicule,
                            marque_filter=marque
                        )
                    except Exception as e:
                        logger.error(f"Error in recommend_vehicles: {str(e)}")
                        return []
                
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(get_recommendations_safe)
                    try:
                        recommendations = future.result(timeout=45)
                        logger.info(f"Received {len(recommendations)} raw recommendations")
                    except FuturesTimeoutError:
                        logger.error(f"Recommendation generation timeout for user {user_email}")
                        return Response({
                            "error": "Recommendation generation is taking too long. Please try again.",
                            "recommendations": []
                        }, status=status.HTTP_408_REQUEST_TIMEOUT)
                    
            except Exception as rec_error:
                logger.error(f"Error getting recommendations for user {user_email}: {str(rec_error)}")
                return Response({
                    "recommendations": [],
                    "error": "Could not generate personalized recommendations"
                }, status=status.HTTP_200_OK)
            
            if not recommendations:
                logger.warning(f"No recommendations found for user {user_email}")
                return Response({
                    "recommendations": [],
                    "message": "No recommendations available at this time. Please check vehicle availability or try different filters."
                }, status=status.HTTP_200_OK)
            
            recommendations_data = []
            for vehicle in recommendations:
                try:
                    if not vehicle.get('id') or vehicle.get('marque') in ['unknown', 'aaaaaaaa', '', None]:
                        logger.warning(f"Skipping vehicle without valid id or marque: {vehicle}")
                        continue
                    
                    eco_score = engine.calculate_eco_score(
                        vehicle.get("emissionsCO2", 120), 
                        vehicle.get("carburant", "essence")
                    )
                    
                    vehicle_data = {
                        "id": str(vehicle.get("id", "")),
                        "marque": str(vehicle.get("marque", "Unknown")),
                        "modele": str(vehicle.get("modele", "Unknown")),
                        "carburant": str(vehicle.get("carburant", "essence")),
                        "prix_par_jour": float(vehicle.get("prix_par_jour", 0)),
                        "localisation": str(vehicle.get("localisation", "Tunis")),
                        "type_vehicule": str(vehicle.get("type_vehicule", "berline")),
                        "eco_score": float(eco_score) if eco_score is not None else 0.5
                    }
                    
                    if vehicle_data["prix_par_jour"] > 0:
                        recommendations_data.append(vehicle_data)
                    else:
                        logger.warning(f"Skipping vehicle with invalid price: {vehicle.get('id')}")
                except Exception as format_error:
                    logger.warning(f"Error formatting vehicle {vehicle.get('id', 'unknown')}: {str(format_error)}")
                    continue
            
            logger.info(f"Successfully formatted {len(recommendations_data)} recommendations for {user_email}")
            
            if not recommendations_data:
                return Response({
                    "recommendations": [],
                    "message": "No valid recommendations available. Please check vehicle availability or try different filters."
                }, status=status.HTTP_200_OK)
                
            return Response({
                "recommendations": recommendations_data,
                "count": len(recommendations_data),
                "message": f"Found {len(recommendations_data)} recommendations"
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Unexpected error in RecommendationView for {user_email}: {str(e)}")
            return Response({
                "recommendations": [],
                "error": "An unexpected error occurred"
            }, status=status.HTTP_200_OK)
        


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'errors': serializer.errors,
                'message': 'Données invalides'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data.get('email')
        try:
            user = User.objects.get(email=email)
            user.reset_password_token()
            
            # Créer le lien de réinitialisation
            uid = urlsafe_base64_encode(force_bytes(user.id))
            token = user.password_reset_token
            reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            
            # Envoyer l'email
            subject = "Réinitialisation de votre mot de passe"
            message = f"""Bonjour {user.nom},

Veuillez cliquer sur le lien suivant pour réinitialiser votre mot de passe:
{reset_link}

Ce lien expire dans 1 heure.

Cordialement,
L'équipe VitaRenta"""
            
            # Utiliser l'adresse email vérifiée de MailerSend
            from_email = f"VitaRenta <{settings.DEFAULT_FROM_EMAIL}>"
            
            send_mail(
                subject,
                message,
                from_email,
                [user.email],
                fail_silently=False,
            )
            
            logger.info(f"Email de réinitialisation envoyé à {email}")
            return Response({
                'message': 'Email de réinitialisation envoyé avec succès'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            logger.warning(f"Tentative de réinitialisation avec email inexistant: {email}")
            return Response({
                'message': 'Si cet email existe, un lien de réinitialisation a été envoyé'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email de réinitialisation: {str(e)}")
            return Response({
                'error': 'Erreur lors de l\'envoi de l\'email'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'errors': serializer.errors,
                'message': 'Données invalides'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uid = serializer.validated_data.get('uid')
        token = serializer.validated_data.get('token')
        new_password = serializer.validated_data.get('new_password')
        
        try:
            # Décoder l'UID pour obtenir l'ID utilisateur
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(id=user_id)
            
            # Vérifier le token et sa validité
            if (user.password_reset_token != token or 
                user.password_reset_expiry < timezone.now()):
                return Response({
                    'error': 'Token invalide ou expiré'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mettre à jour le mot de passe
            user.set_password(new_password)
            user.password_reset_token = None
            user.password_reset_expiry = None
            user.save()
            
            logger.info(f"Mot de passe réinitialisé pour l'utilisateur {user.email}")
            return Response({
                'message': 'Mot de passe réinitialisé avec succès'
            }, status=status.HTTP_200_OK)
            
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({
                'error': 'Lien de réinitialisation invalide'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Erreur lors de la réinitialisation du mot de passe: {str(e)}")
            return Response({
                'error': 'Erreur lors de la réinitialisation du mot de passe'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    
        

FUEL_TYPES = {
    'essence': {
        'base_co2': 120,  # gCO2/km
        'conversion_factor': 9.7,  # kWh/100km équivalent
        'weight_factor': 1.0,
        'production_impact': 8  # gCO2/km équivalent production
    },
    'diesel': {
        'base_co2': 100,
        'conversion_factor': 10.2,
        'weight_factor': 1.1,
        'production_impact': 10
    },
    'électrique': {
        'base_co2': 0,
        'conversion_factor': 1.0,
        'weight_factor': 0.8,
        'production_impact': 50
    },
    'hybride': {
        'base_co2': 90,
        'conversion_factor': 9.7,
        'weight_factor': 0.9,
        'production_impact': 20
    }
}

# views.py
# views.py
import traceback
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

FUEL_TYPES = {
    'essence': {'base_co2': 120, 'conversion_factor': 9.7, 'weight_factor': 1.0, 'production_impact': 8},
    'diesel': {'base_co2': 100, 'conversion_factor': 10.2, 'weight_factor': 1.1, 'production_impact': 10},
    'électrique': {'base_co2': 0, 'conversion_factor': 1.0, 'weight_factor': 0.8, 'production_impact': 50},
    'hybride': {'base_co2': 90, 'conversion_factor': 9.7, 'weight_factor': 0.9, 'production_impact': 20}
}

# views.py
class EcoScoreViewSet(viewsets.ModelViewSet):
    queryset = EcoScore.objects.all()
    serializer_class = EcoScoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def calculate_eco_score(self, request):
        """Calcule l'éco-score pour un véhicule donné"""
        vehicle_id = request.data.get('vehicle_id')
        
        if not vehicle_id:
            logger.error("ID de véhicule manquant dans la requête")
            return Response({'error': 'vehicle_id est requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Récupération du véhicule sans conversion UUID
            vehicle = Vehicule.objects.get(id=vehicle_id)
            logger.info(f"Véhicule trouvé: {vehicle_id}")
            
            # Récupération des données IoT les plus récentes
            iot_data = IOTData.objects.filter(vehicle_id=vehicle_id).order_by('-timestamp').first()
            if not iot_data:
                logger.warning(f"Aucune donnée IoT trouvée pour le véhicule: {vehicle_id}")
                return Response({'error': 'Aucune donnée IoT disponible'}, status=status.HTTP_404_NOT_FOUND)
            
            # Configuration du carburant
            fuel_type = vehicle.carburant.lower() if vehicle.carburant else 'essence'
            fuel_data = FUEL_TYPES.get(fuel_type, FUEL_TYPES['essence'])
            logger.info(f"Type de carburant utilisé: {fuel_type}")
            
            # Récupération des valeurs avec gestion des None
            co2_emissions = vehicle.emissionsCO2 if vehicle.emissionsCO2 is not None else fuel_data['base_co2']
            fuel_consumption = iot_data.fuel_consumption if iot_data.fuel_consumption is not None else 0
            
            # Validation des données
            if fuel_consumption < 0:
                fuel_consumption = 0
                logger.warning(f"Consommation de carburant négative pour le véhicule {vehicle_id}, mise à 0")
            
            # Calcul de l'éco-score
            total_co2 = co2_emissions + fuel_data['production_impact']
            energy_consumption = fuel_consumption * fuel_data['conversion_factor']
            
            # Score basé sur les émissions et la consommation
            co2_impact = min(50, total_co2 * 0.4)
            energy_impact = min(50, energy_consumption * 0.6)
            eco_score = max(0, min(100, 100 - (co2_impact + energy_impact) * fuel_data['weight_factor']))
            
            # Utiliser une transaction pour garantir l'atomicité
            with transaction.atomic():
                # Supprimer tous les scores existants pour ce véhicule
                deleted_count = EcoScore.objects.filter(vehicle_id=vehicle_id).delete()[0]
                if deleted_count > 0:
                    logger.info(f"Supprimé {deleted_count} éco-scores existants pour le véhicule {vehicle_id}")
                
                # Créer un nouveau score
                eco_score_obj = EcoScore.objects.create(
                    vehicle_id=vehicle_id,
                    score=round(eco_score, 1),
                    co2_emissions=total_co2,
                    energy_consumption=round(energy_consumption, 2),
                    last_updated=timezone.now()
                )
            
            logger.info(f"Eco-score créé: {eco_score_obj.score} pour le véhicule: {vehicle_id}")
            
            # Mettre à jour automatiquement les défis de l'utilisateur si connecté
            if request.user.is_authenticated:
                self._update_user_challenges(request.user, vehicle_id, eco_score_obj.score)
            
            # Préparer manuellement la réponse pour éviter les problèmes de sérialisation
            response_data = {
                'id': str(eco_score_obj.id),
                'vehicle_id': str(eco_score_obj.vehicle.id),
                'score': eco_score_obj.score,
                'co2_emissions': eco_score_obj.co2_emissions,
                'energy_consumption': eco_score_obj.energy_consumption,
                'last_updated': eco_score_obj.last_updated.isoformat()
            }
            
            return Response(response_data)
            
        except Vehicule.DoesNotExist:
            logger.error(f"Véhicule non trouvé: {vehicle_id}")
            return Response({'error': 'Véhicule non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception(f"Erreur lors du calcul de l'éco-score pour le véhicule: {vehicle_id}")
            error_data = {'error': str(e)}
            if settings.DEBUG:
                error_data['traceback'] = traceback.format_exc()
            return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _update_user_challenges(self, user, vehicle_id, eco_score):
        """Met à jour automatiquement les défis de l'utilisateur basé sur l'éco-score"""
        try:
            # Version synchrone temporaire (remplacer par Celery plus tard)
            self._sync_update_challenges(user, vehicle_id, eco_score)
            
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour automatique des défis: {e}")
    
    def _sync_update_challenges(self, user, vehicle_id, eco_score):
        """Version synchrone de la mise à jour des défis"""
        try:
            from decimal import Decimal
            
            active_challenges = UserEcoChallenge.objects.filter(
                user=user,
                status=ChallengeStatus.ACTIVE
            )
            
            for user_challenge in active_challenges:
                challenge_type = user_challenge.challenge.type
                progress_value = Decimal('0.00')
                
                # Déterminer la valeur de progression selon le type de défi
                if challenge_type == EcoChallengeType.ECO_SCORE and eco_score:
                    # Pour les défis d'éco-score, on compte les jours avec un score > seuil
                    if eco_score >= 85:  # Seuil configurable
                        progress_value = Decimal('1.00')  # Un jour réussi
                
                if progress_value > 0:
                    # Créer un enregistrement de progression
                    EcoChallengeProgress.objects.create(
                        user_challenge=user_challenge,
                        value=progress_value,
                        eco_score=eco_score,
                        vehicle_id=vehicle_id
                    )
                    
                    # Mettre à jour la progression totale
                    total_progress = EcoChallengeProgress.objects.filter(
                        user_challenge=user_challenge
                    ).aggregate(total=Sum('value'))['total'] or Decimal('0.00')
                    
                    user_challenge.progress = total_progress
                    user_challenge.save()  # Déclenche la vérification de completion
                    
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour synchrone des défis: {e}")
    
    @action(detail=False, methods=['get'])
    def distribution(self, request):
        """Retourne la distribution des scores éco"""
        try:
            scores = EcoScore.objects.values_list('score', flat=True)
            if not scores:
                logger.warning("Aucune donnée d'éco-score disponible")
                return Response({'error': 'Aucune donnée disponible'}, status=status.HTTP_404_NOT_FOUND)
            
            # Distribution simplifiée
            ranges = [
                {'range': '0-20', 'count': len([s for s in scores if 0 <= s < 20])},
                {'range': '20-40', 'count': len([s for s in scores if 20 <= s < 40])},
                {'range': '40-60', 'count': len([s for s in scores if 40 <= s < 60])},
                {'range': '60-80', 'count': len([s for s in scores if 60 <= s < 80])},
                {'range': '80-100', 'count': len([s for s in scores if 80 <= s <= 100])}
            ]
            
            logger.info("Distribution des éco-scores récupérée")
            return Response(ranges)
            
        except Exception as e:
            logger.exception("Erreur lors de la récupération de la distribution des éco-scores")
            error_data = {'error': str(e)}
            if settings.DEBUG:
                error_data['traceback'] = traceback.format_exc()
            return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IOTDataViewSet(viewsets.ModelViewSet):
    """ViewSet pour les données IoT et maintenance prédictive"""
    queryset = IOTData.objects.all()
    serializer_class = IOTDataSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def predict_maintenance(self, request):
        """
        Prédiction de maintenance basée sur les données réelles du véhicule
        """
        try:
            vehicle_id = request.data.get('vehicle_id')
            days_ahead = int(request.data.get('days_ahead', 30))
            
            if not vehicle_id:
                return Response({'error': 'vehicle_id requis'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérification du véhicule
            try:
                vehicle = Vehicule.objects.get(id=vehicle_id)
            except Vehicule.DoesNotExist:
                return Response({'error': 'Véhicule non trouvé'}, status=status.HTTP_404_NOT_FOUND)
            
            # Récupération des données IoT récentes spécifiques à ce véhicule
            iot_data = IOTData.objects.filter(vehicle_id=vehicle_id).order_by('-timestamp')[:100]
            
            if len(iot_data) < 10:
                return Response({'error': 'Pas assez de données pour la prédiction'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
            
            # Calcul des tendances spécifiques au véhicule
            recent_temp = [data.temperature for data in iot_data[:10]]
            recent_vibration = [data.vibration for data in iot_data[:10]]
            recent_battery = [data.battery_health for data in iot_data[:10]]
            
            avg_temp = sum(recent_temp) / len(recent_temp)
            avg_vibration = sum(recent_vibration) / len(recent_vibration)
            avg_battery = sum(recent_battery) / len(recent_battery)
            
            # Calcul des tendances (comparaison entre données récentes et plus anciennes)
            older_temp = [data.temperature for data in iot_data[10:20]]
            older_vibration = [data.vibration for data in iot_data[10:20]]
            older_battery = [data.battery_health for data in iot_data[10:20]]
            
            avg_older_temp = sum(older_temp) / len(older_temp) if older_temp else avg_temp
            avg_older_vibration = sum(older_vibration) / len(older_vibration) if older_vibration else avg_vibration
            avg_older_battery = sum(older_battery) / len(older_battery) if older_battery else avg_battery
            
            # Calcul des tendances (pourcentage de changement)
            temp_trend = (avg_temp - avg_older_temp) / avg_older_temp if avg_older_temp != 0 else 0
            vibration_trend = (avg_vibration - avg_older_vibration) / avg_older_vibration if avg_older_vibration != 0 else 0
            battery_trend = (avg_battery - avg_older_battery) / avg_older_battery if avg_older_battery != 0 else 0
            
            # Seuils personnalisés en fonction du type de véhicule
            if vehicle.carburant == 'électrique':
                temp_threshold = 80  # Les véhicules électriques ont des seuils de température plus bas
                vibration_threshold = 1.5
                battery_threshold = 70
            elif vehicle.carburant == 'diesel':
                temp_threshold = 95  # Les diesels peuvent supporter des températures plus élevées
                vibration_threshold = 2.5
                battery_threshold = 60
            else:  # essence ou hybride
                temp_threshold = 90
                vibration_threshold = 2.0
                battery_threshold = 65
            
            # Calculer un score de risque pour chaque paramètre
            temp_risk = max(0, (avg_temp - temp_threshold) / temp_threshold) if avg_temp > temp_threshold else 0
            vibration_risk = max(0, (avg_vibration - vibration_threshold) / vibration_threshold) if avg_vibration > vibration_threshold else 0
            battery_risk = max(0, (battery_threshold - avg_battery) / battery_threshold) if avg_battery < battery_threshold else 0
            
            # Pondérer les risques en fonction des tendances
            if temp_trend > 0.1:
                temp_risk *= (1 + temp_trend)
            if vibration_trend > 0.15:
                vibration_risk *= (1 + vibration_trend)
            if battery_trend < -0.05:
                battery_risk *= (1 - battery_trend)
            
            # Déterminer le type de panne en fonction du risque le plus élevé
            if temp_risk > vibration_risk and temp_risk > battery_risk:
                failure_type = 'Surchauffe moteur'
                confidence = min(1.0, temp_risk)
                recommendation = f'Vérifiez le système de refroidissement. Température actuelle: {avg_temp:.1f}°C (seuil: {temp_threshold}°C)'
            elif vibration_risk > battery_risk:
                failure_type = 'Problème de vibration'
                confidence = min(1.0, vibration_risk)
                recommendation = f'Contrôlez les supports moteur et l\'équilibrage des roues. Vibration actuelle: {avg_vibration:.2f} m/s² (seuil: {vibration_threshold} m/s²)'
            elif battery_risk > 0:
                failure_type = 'Batterie faible'
                confidence = min(1.0, battery_risk)
                recommendation = f'Testez la batterie et envisagez son remplacement. Niveau actuel: {avg_battery:.1f}% (seuil: {battery_threshold}%)'
            else:
                failure_type = 'Maintenance préventive'
                confidence = 0.2
                recommendation = 'Effectuez un contrôle de routine'
            
            # Date prédite en fonction de la confiance et des jours à venir
            if confidence > 0.7:
                predicted_days = days_ahead * 0.5  # Proche si le risque est élevé
            elif confidence > 0.4:
                predicted_days = days_ahead * 0.8
            else:
                predicted_days = days_ahead * 1.2  # Plus loin si le risque est faible
                
            predicted_date = timezone.now() + timedelta(days=int(predicted_days))
            
            # Sauvegarde de la prédiction
            try:
                MaintenancePrediction.objects.create(
                    vehicle_id=vehicle_id,
                    failure_type=failure_type,
                    confidence=confidence,
                    predicted_failure_date=predicted_date,
                    recommendation=recommendation
                )
            except Exception:
                pass  # Ignorer les erreurs de sauvegarde
            
            return Response({
                'vehicle_id': vehicle_id,
                'failure_type': failure_type,
                'confidence': round(confidence, 2),
                'predicted_failure_date': predicted_date.isoformat(),
                'recommendation': recommendation,
                'data_points_used': len(iot_data),
                'trends': {
                    'temperature': {
                        'current': round(avg_temp, 2),
                        'trend': round(temp_trend, 4),
                        'threshold': temp_threshold,
                        'risk': round(temp_risk, 2)
                    },
                    'vibration': {
                        'current': round(avg_vibration, 2),
                        'trend': round(vibration_trend, 4),
                        'threshold': vibration_threshold,
                        'risk': round(vibration_risk, 2)
                    },
                    'battery': {
                        'current': round(avg_battery, 2),
                        'trend': round(battery_trend, 4),
                        'threshold': battery_threshold,
                        'risk': round(battery_risk, 2)
                    }
                }
            })
            
        except Exception as e:
            return Response({'error': f'Erreur: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def generate_test_data(self, request):
        """Génère des données IoT de test pour un véhicule avec des variations spécifiques"""
        vehicle_id = request.data.get('vehicle_id')
        days = int(request.data.get('days', 30))
        
        if not vehicle_id:
            return Response({'error': 'vehicle_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Vérification du véhicule
            vehicle = Vehicule.objects.get(id=vehicle_id)
            
            # Suppression des anciennes données
            IOTData.objects.filter(vehicle_id=vehicle_id).delete()
            
            # Génération de nouvelles données avec variations spécifiques au véhicule
            new_data = []
            
            # Paramètres de base en fonction du type de véhicule
            if vehicle.carburant == 'électrique':
                base_temp = 65  # Les véhicules électriques ont tendance à moins chauffer
                base_vibration = 1.2  # Moins de vibration
                base_consumption = 0  # Pas de consommation de carburant
                base_battery = 100
            elif vehicle.carburant == 'diesel':
                base_temp = 85  # Les diesels chauffent plus
                base_vibration = 2.0  # Plus de vibration
                base_consumption = 7.0
                base_battery = 95
            else:  # essence ou hybride
                base_temp = 75
                base_vibration = 1.5
                base_consumption = 6.0
                base_battery = 98
            
            base_mileage = random.randint(10000, 50000)
            
            # Choisir un scénario de panne aléatoire pour ce véhicule
            scenarios = ['temp', 'vibration', 'battery', 'none']
            chosen_scenario = random.choice(scenarios)
            
            # Facteurs de dégradation en fonction du scénario
            if chosen_scenario == 'temp':
                temp_degradation_rate = random.uniform(0.01, 0.03)  # Dégradation rapide de la température
                vibration_degradation_rate = random.uniform(0.002, 0.01)
                battery_degradation_rate = random.uniform(0.001, 0.003)
            elif chosen_scenario == 'vibration':
                temp_degradation_rate = random.uniform(0.003, 0.01)
                vibration_degradation_rate = random.uniform(0.01, 0.02)  # Dégradation rapide de la vibration
                battery_degradation_rate = random.uniform(0.001, 0.003)
            elif chosen_scenario == 'battery':
                temp_degradation_rate = random.uniform(0.003, 0.01)
                vibration_degradation_rate = random.uniform(0.002, 0.01)
                battery_degradation_rate = random.uniform(0.005, 0.01)  # Dégradation rapide de la batterie
            else:  # aucun scénario particulier
                temp_degradation_rate = random.uniform(0.002, 0.008)
                vibration_degradation_rate = random.uniform(0.002, 0.008)
                battery_degradation_rate = random.uniform(0.001, 0.004)
            
            for day in range(days):
                # Dégradation progressive
                temp_factor = 1 + (day * temp_degradation_rate)
                vibration_factor = 1 + (day * vibration_degradation_rate)
                battery_factor = 1 - (day * battery_degradation_rate)
                
                for hour in range(0, 24, 2):  # Données toutes les 2 heures
                    timestamp = timezone.now() - timedelta(days=days-day, hours=hour)
                    
                    # Ajouter des variations aléatoires plus importantes pour le scénario choisi
                    if chosen_scenario == 'temp':
                        temp_noise = random.uniform(-2, 8)  # Plus de variation pour la température
                        vibration_noise = random.uniform(-0.3, 0.3)
                        battery_noise = random.uniform(-2, 2)
                    elif chosen_scenario == 'vibration':
                        temp_noise = random.uniform(-3, 3)
                        vibration_noise = random.uniform(-0.2, 0.8)  # Plus de variation pour la vibration
                        battery_noise = random.uniform(-2, 2)
                    elif chosen_scenario == 'battery':
                        temp_noise = random.uniform(-3, 3)
                        vibration_noise = random.uniform(-0.3, 0.3)
                        battery_noise = random.uniform(-4, 1)  # Plus de variation pour la batterie (négative)
                    else:
                        temp_noise = random.uniform(-3, 3)
                        vibration_noise = random.uniform(-0.3, 0.3)
                        battery_noise = random.uniform(-2, 2)
                    
                    # Calcul des valeurs avec dégradation et variations
                    temperature = (base_temp * temp_factor) + temp_noise
                    vibration = (base_vibration * vibration_factor) + vibration_noise
                    fuel_consumption = max(0, (base_consumption + random.uniform(-1, 1)))
                    battery_health = max(0, min(100, (base_battery * battery_factor) + battery_noise))
                    mileage = base_mileage + (day * 50) + (hour * 2)
                    engine_hours = day * 8 + hour
                    
                    new_data.append(IOTData(
                        vehicle_id=vehicle_id,
                        timestamp=timestamp,
                        temperature=round(temperature, 2),
                        vibration=round(max(0, vibration), 2),
                        fuel_consumption=round(fuel_consumption, 2),
                        mileage=round(mileage, 2),
                        engine_hours=round(engine_hours, 2),
                        battery_health=round(battery_health, 2)
                    ))
            
            # Sauvegarde en lot
            IOTData.objects.bulk_create(new_data)
            
            return Response({
                'message': f'Données générées avec succès',
                'vehicle_id': vehicle_id,
                'days': days,
                'data_points': len(new_data),
                'vehicle_type': vehicle.carburant,
                'scenario': chosen_scenario
            })
            
        except Vehicule.DoesNotExist:
            return Response({'error': 'Véhicule non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': f'Erreur: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class MaintenancePredictionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les prédictions de maintenance"""
    queryset = MaintenancePrediction.objects.all()
    serializer_class = MaintenancePredictionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        vehicle_id = self.request.query_params.get('vehicle_id')
        if vehicle_id:
            queryset = queryset.filter(vehicle_id=vehicle_id)
        return queryset.order_by('-prediction_date')
    



class AssignUserToAgencyView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    
    def post(self, request):
        return self._assign_user(request)
    
    def patch(self, request):
        return self._assign_user(request)
    
    def _assign_user(self, request):
        try:
            user_id = request.data.get('user_id')
            agence_id = request.data.get('agence_id')
            
            if not user_id or not agence_id:
                return Response({
                    'error': 'user_id et agence_id sont requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = get_object_or_404(User, id=user_id)
            agence = get_object_or_404(Agence, id=agence_id)
            
            if user.role != 'agence':
                return Response({
                    'error': "L'utilisateur doit avoir le rôle 'agence'"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user.agence = agence
            user.save()
            
            return Response({
                'message': f"Utilisateur {user.email} affecté à l'agence {agence.nom} avec succès",
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f"Erreur lors de l'affectation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
        


from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count
from django.http import Http404
from .models import Feedback
from .serializers import FeedbackSerializer
import traceback
from bson import ObjectId

from bson.objectid import ObjectId
from bson.errors import InvalidId

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().order_by('-created_at')
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques de feedback"""
        try:
            stats = Feedback.objects.aggregate(
                average_rating=Avg('rating'),
                total_count=Count('_id')
            )
            return Response({
                'average_rating': stats.get('average_rating', 0) or 0,
                'total_count': stats.get('total_count', 0) or 0
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def distribution(self, request):
        """Retourne la distribution des notes pour les graphiques"""
        try:
            feedbacks = Feedback.objects.all()
            
            # Calculer la distribution des notes
            distribution = {}
            for rating in [1, 2, 3, 4, 5]:
                count = feedbacks.filter(rating=rating).count()
                distribution[str(rating)] = count
            
            return Response(distribution)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_queryset(self):
        """Personnaliser la requête pour supporter le filtrage et le tri"""
        queryset = super().get_queryset()
        
        # Ne pas filtrer par utilisateur pour les actions de modification/suppression
        if self.action in ['update', 'partial_update', 'destroy']:
            return queryset
        
        # Si l'utilisateur est un client, ne montrer que ses feedbacks pour les autres actions
        if self.request.user.role == 'client':
            queryset = queryset.filter(user=self.request.user)
        
        # Filtrage par note
        rating_filter = self.request.query_params.get('rating')
        if rating_filter and rating_filter != 'all':
            try:
                rating_filter = int(rating_filter)
                queryset = queryset.filter(rating=rating_filter)
            except ValueError:
                pass
        
        # Tri
        sort_by = self.request.query_params.get('sort_by', 'newest')
        if sort_by == 'oldest':
            queryset = queryset.order_by('created_at')
        elif sort_by == 'highest':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort_by == 'lowest':
            queryset = queryset.order_by('rating', 'created_at')
        else:  # newest par défaut
            queryset = queryset.order_by('-created_at')
        
        return queryset
    
    def get_object(self):
        """
        Récupère l'objet en utilisant l'ObjectId correctement
        """
        pk = self.kwargs.get('pk')
        print(f"Recherche du feedback avec pk: {pk}")
        
        if not pk:
            raise Http404("Aucun ID fourni")
        
        try:
            # Vérifier que l'ID est un ObjectId valide
            obj_id = ObjectId(pk)
        except (InvalidId, TypeError):
            raise Http404("ID invalide")
        
        # Pour les actions de modification/suppression, utiliser le queryset sans filtrage utilisateur
        if self.action in ['update', 'partial_update', 'destroy']:
            queryset = Feedback.objects.all()
        else:
            queryset = self.filter_queryset(self.get_queryset())
        
        try:
            obj = queryset.get(_id=obj_id)
            print(f"Feedback trouvé: {obj}")
            return obj
        except Feedback.DoesNotExist:
            print(f"Feedback non trouvé avec l'ID: {pk}")
            print("Queryset utilisé:", queryset.query)
            print("Nombre de feedbacks dans le queryset:", queryset.count())
            raise Http404(f"Aucun feedback trouvé avec l'ID {pk}")
    
    def destroy(self, request, *args, **kwargs):
        """Suppression d'un feedback avec vérification des permissions"""
        try:
            instance = self.get_object()
            
            # Vérifier les permissions
            if instance.user != self.request.user and self.request.user.role != 'admin':
                return Response(
                    {'error': 'Vous n\'êtes pas autorisé à supprimer ce feedback'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Supprimer le feedback
            instance.delete()
            print("Feedback supprimé avec succès")
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Http404 as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Erreur lors de la suppression du feedback: {str(e)}")

# views.py - PARTIE ECOCHALLENGE COMPLETE

# views.py (partial for EcoChallenge and rewards)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.db import transaction
from django.utils import timezone
import logging
from decimal import Decimal
import uuid

logger = logging.getLogger(__name__)

class EcoChallengeViewSet(viewsets.ModelViewSet):
    queryset = EcoChallenge.objects.all()
    permission_classes = [IsAdminOrAgencyForChallenges]

    def get_serializer_class(self):
        if self.action in ['analytics', 'detailed_stats']:
            return ChallengeAnalyticsSerializer
        elif self.action in ['bulk_action']:
            return EcoChallengeBulkSerializer
        elif self.request.user.is_authenticated and self.request.user.role in ['admin', 'agence']:
            return AdvancedEcoChallengeSerializer
        return EcoChallengeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.is_authenticated:
            if user.role == 'agence' and hasattr(user, 'agence'):
                queryset = queryset.filter(Q(created_by=user) | Q(created_by__isnull=True))

        params = self.request.query_params
        if params.get('type'):
            queryset = queryset.filter(type=params.get('type'))
        if params.get('difficulty'):
            queryset = queryset.filter(difficulty=params.get('difficulty'))
        if params.get('is_active') is not None:
            is_active = params.get('is_active').lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        if params.get('featured') is not None:
            featured = params.get('featured').lower() == 'true'
            queryset = queryset.filter(featured=featured)
        if params.get('category'):
            queryset = queryset.filter(category=params.get('category'))
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(Q(title__icontains=search_term) | Q(description__icontains=search_term))

        return queryset.order_by('-featured', '-created_at')

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def available(self, request):
        from .models import ChallengeStatus, UserEcoChallenge
        try:
            now = timezone.now()
            available_challenges = self.get_queryset().filter(is_active=True, valid_from__lte=now).filter(
                Q(valid_until__isnull=True) | Q(valid_until__gt=now)
            )
            # Exclude full challenges
            for challenge in available_challenges:
                if challenge.max_participants:
                    current_participants = UserEcoChallenge.objects.filter(
                        challenge=challenge,
                        status__in=[ChallengeStatus.ACTIVE, ChallengeStatus.COMPLETED]
                    ).count()
                    if current_participants >= challenge.max_participants:
                        available_challenges = available_challenges.exclude(id=challenge.id)
            serializer = self.get_serializer(available_challenges, many=True)
            return Response({
                'challenges': serializer.data,
                'count': len(serializer.data),
                'message': 'Défis disponibles récupérés avec succès'
            })
        except Exception as e:
            logger.error(f"Erreur récupération défis disponibles: {str(e)}")
            return Response({'error': 'Erreur lors de la récupération des défis'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        try:
            featured_challenges = self.get_queryset().filter(featured=True, is_active=True)[:6]
            serializer = self.get_serializer(featured_challenges, many=True)
            return Response({'challenges': serializer.data, 'count': len(serializer.data)})
        except Exception as e:
            logger.error(f"Erreur défis vedettes: {str(e)}")
            return Response({'error': 'Erreur serveur'}, status=500)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from .models import ChallengeStatus, UserEcoChallenge, EcoChallengeProgress, EcoChallengeReward
        try:
            queryset = self.get_queryset()
            total_challenges = queryset.count()
            active_challenges = queryset.filter(is_active=True).count()
            total_participants = UserEcoChallenge.objects.filter(challenge__in=queryset).count()
            completed_participants = UserEcoChallenge.objects.filter(challenge__in=queryset, status=ChallengeStatus.COMPLETED).count()
            completion_rate = (completed_participants / total_participants * 100) if total_participants > 0 else 0
            total_co2_saved = EcoChallengeProgress.objects.filter(user_challenge__challenge__in=queryset, co2_saved__isnull=False).aggregate(total=Sum('co2_saved'))['total'] or 0
            total_points = EcoChallengeReward.objects.filter(challenge__in=queryset).aggregate(total=Sum('points_awarded'))['total'] or 0
            total_credits = EcoChallengeReward.objects.filter(challenge__in=queryset).aggregate(total=Sum('credit_awarded'))['total'] or 0

            challenges_by_category = dict(queryset.values('category').annotate(count=Count('id')).values_list('category', 'count'))
            challenges_by_difficulty = dict(queryset.values('difficulty').annotate(count=Count('id')).values_list('difficulty', 'count'))

            # Monthly trends (last 3 months)
            from datetime import timedelta
            from django.utils import timezone
            monthly_trends = []
            for i in range(3):
                start_date = timezone.now().replace(day=1) - timedelta(days=i*30)
                end_date = start_date + timedelta(days=30)
                month_data = {
                    'month': start_date.strftime('%Y-%m'),
                    'new_challenges': queryset.filter(created_at__range=[start_date, end_date]).count(),
                    'new_participants': UserEcoChallenge.objects.filter(started_at__range=[start_date, end_date], challenge__in=queryset).count()
                }
                monthly_trends.append(month_data)

            # Top performers
            top_performers = UserEcoChallenge.objects.filter(challenge__in=queryset, status=ChallengeStatus.COMPLETED).values('user__nom', 'user__email').annotate(
                completed_challenges=Count('id'),
                total_points=Sum('challenge__reward_points')
            ).order_by('-completed_challenges')[:10]

            analytics_data = {
                'total_challenges': total_challenges,
                'active_challenges': active_challenges,
                'total_participants': total_participants,
                'completion_rate': round(completion_rate, 2),
                'total_co2_saved': float(total_co2_saved),
                'total_points_awarded': total_points,
                'total_credits_awarded': float(total_credits),
                'challenges_by_category': challenges_by_category,
                'challenges_by_difficulty': challenges_by_difficulty,
                'monthly_trends': monthly_trends,
                'top_performers': list(top_performers)
            }
            return Response(analytics_data)
        except Exception as e:
            logger.error(f"Erreur analytics: {str(e)}")
            return Response({'error': 'Erreur lors du calcul des analytics'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserEcoChallengeViewSet(viewsets.ModelViewSet):
    queryset = UserEcoChallenge.objects.all()
    serializer_class = UserEcoChallengeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return self.queryset.select_related('challenge', 'user').filter(user=user)
        return self.queryset.none()

    @action(detail=False, methods=['post'], url_path='join_challenge')
    def join_challenge(self, request):
        import uuid
        from .models import EcoChallenge, UserEcoChallenge, ChallengeStatus

        if not request.user or not request.user.is_authenticated:
            return Response({'detail': 'Authentification requise'}, status=status.HTTP_401_UNAUTHORIZED)

        challenge_id = request.data.get('challenge_id')
        if not challenge_id:
            return Response({'detail': 'challenge_id est requis'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge_uuid = uuid.UUID(str(challenge_id))
        except (ValueError, TypeError) as e:
            return Response({'detail': f'Format d\'ID de défi invalide: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = EcoChallenge.objects.get(id=challenge_uuid)
        except EcoChallenge.DoesNotExist:
            return Response({'detail': 'Défi non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response({'detail': 'Erreur base de données lors de la recherche du défi'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not challenge.is_active:
            return Response({'detail': 'Ce défi n\'est plus actif'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            existing_participation = UserEcoChallenge.objects.filter(user=request.user, challenge=challenge).first()
            if existing_participation:
                if existing_participation.status == ChallengeStatus.ACTIVE:
                    return Response({'detail': 'Vous participez déjà à ce défi'}, status=status.HTTP_409_CONFLICT)
                elif existing_participation.status == ChallengeStatus.COMPLETED:
                    return Response({'detail': 'Vous avez déjà terminé ce défi'}, status=status.HTTP_409_CONFLICT)
        except Exception as e:
            return Response({'detail': 'Erreur lors de la vérification des participations existantes'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with transaction.atomic():
                user_challenge = UserEcoChallenge.objects.create(user=request.user, challenge=challenge, status=ChallengeStatus.ACTIVE, progress=0)
                response_data = {
                    'message': 'Participation enregistrée avec succès',
                    'user_challenge_id': str(user_challenge.id),
                    'status': 'active',
                    'challenge': {
                        'id': str(challenge.id),
                        'title': challenge.title,
                        'target_value': str(challenge.target_value),
                        'duration_days': challenge.duration_days,
                        'reward_points': challenge.reward_points,
                    }
                }
                return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as db_error:
            return Response({
                'detail': 'Erreur lors de la création de la participation',
                'error_type': type(db_error).__name__,
                'error_message': str(db_error)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EcoChallengeProgressViewSet(viewsets.ModelViewSet):
    queryset = EcoChallengeProgress.objects.all()
    serializer_class = EcoChallengeProgressSerializer
    permission_classes = [IsAuthenticated, CanParticipateInChallenges]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'client':
            return self.queryset.filter(user_challenge__user=user)
        elif user.role == 'agence' and hasattr(user, 'agence'):
            return self.queryset.filter(user_challenge__user__agence=user.agence)
        elif user.role == 'admin':
            return self.queryset
        return self.queryset.none()

    def perform_create(self, serializer):
        logger.info("Création d'une entrée de progression")
        try:
            progress_entry = serializer.save()
            user_challenge = progress_entry.user_challenge
            if not user_challenge:
                logger.warning("Pas de défi utilisateur associé")
                return

            def safe_aggregate_sum(queryset, field_name):
                try:
                    entries = list(queryset.values_list(field_name, flat=True))
                    total = Decimal('0.00')
                    for entry_value in entries:
                        if entry_value is not None:
                            if hasattr(entry_value, 'to_decimal'):
                                total += entry_value.to_decimal()
                            elif isinstance(entry_value, (int, float)):
                                total += Decimal(str(entry_value))
                            elif isinstance(entry_value, str):
                                total += Decimal(entry_value)
                            else:
                                total += Decimal(str(entry_value))
                    return total
                except Exception as e:
                    logger.error(f"Erreur lors du calcul de somme: {str(e)}")
                    return Decimal('0.00')

            total_progress = safe_aggregate_sum(EcoChallengeProgress.objects.filter(user_challenge=user_challenge), 'value')
            user_challenge.progress = total_progress
            user_challenge.save()

            if user_challenge.is_completed and user_challenge.status == ChallengeStatus.ACTIVE:
                user_challenge.status = ChallengeStatus.COMPLETED
                user_challenge.completed_at = timezone.now()
                user_challenge.save()
                logger.info(f"Défi complété: {user_challenge.challenge.title}")
                self._create_reward(user_challenge)
        except Exception as e:
            logger.error(f"Erreur lors de la création de progression: {str(e)}")
            raise

    def _create_reward(self, user_challenge):
        try:
            challenge = user_challenge.challenge
            EcoChallengeReward.objects.create(
                user=user_challenge.user,
                user_challenge=user_challenge,
                challenge=challenge,
                title=f"Récompense - {challenge.title}",
                description=f"Félicitations ! Vous avez terminé le défi {challenge.title}",
                reward_type=RewardType.POINTS,
                points=challenge.reward_points,
                points_awarded=challenge.reward_points,
                credit_awarded=challenge.reward_credit_euros,
                badge_awarded=challenge.reward_badge,
                awarded_by=None
            )
            logger.info(f"Récompense créée pour {user_challenge.user.email} - {challenge.title}")
        except Exception as e:
            logger.error(f"Erreur création récompense: {str(e)}")


class EcoChallengeRewardViewSet(viewsets.ModelViewSet):
    queryset = EcoChallengeReward.objects.all()
    serializer_class = EcoChallengeRewardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == 'client':
            queryset = queryset.filter(user=user)
        elif user.role == 'agence' and hasattr(user, 'agence'):
            queryset = queryset.filter(user__agence=user.agence)
        return queryset.select_related('user', 'challenge', 'user_challenge')

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        try:
            reward = self.get_object()
            if reward.user != request.user:
                return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
            if reward.claimed:
                return Response({'error': 'Récompense déjà réclamée'}, status=status.HTTP_400_BAD_REQUEST)

            reward.claimed = True
            reward.claimed_at = timezone.now()
            reward.applied_to_account = True
            reward.save()
            logger.info(f"Récompense réclamée: {reward.title} par {reward.user.email}")
            return Response({'message': 'Récompense réclamée avec succès', 'reward': EcoChallengeRewardSerializer(reward).data})
        except Exception as e:
            logger.error(f"Erreur réclamation récompense: {str(e)}")
            return Response({'error': 'Erreur lors de la réclamation'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def my_rewards(self, request):
        try:
            user = request.user
            rewards = self.get_queryset().filter(user=user).order_by('-awarded_at')
            total_points = rewards.aggregate(total=Sum('points_awarded'))['total'] or 0
            total_credits = rewards.aggregate(total=Sum('credit_awarded'))['total'] or 0
            unclaimed_count = rewards.filter(claimed=False).count()
            serializer = self.get_serializer(rewards, many=True)

            return Response({
                'rewards': serializer.data,
                'stats': {
                    'total_rewards': rewards.count(),
                    'total_points': total_points,
                    'total_credits': float(total_credits),
                    'unclaimed_count': unclaimed_count
                }
            })
        except Exception as e:
            logger.error(f"Erreur mes récompenses: {str(e)}")
            return Response({'error': 'Erreur lors de la récupération des récompenses'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# backend/admin_views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, Avg
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
import logging

from .models import (
    User, UserEcoChallenge, EcoChallenge, EcoChallengeProgress, 
    EcoChallengeReward, PointsHistory, ChallengeStatus
)
from .serializers import (
    UserSerializer, AdminUserSerializer, UserEcoChallengeSerializer,
    AdminPointsHistorySerializer, AdminUserStatsSerializer,
    AdminAddPointsSerializer, AdminAllUsersChallengesSerializer
)
# Ajoutez ces imports après les imports existants dans views.py
from .permissions import IsAdminOnly  # Ajoutez si pas déjà importé

from .permissions import (
    IsAdminOnly, CanManageUsers, CanAddPoints, CanViewAllUserChallenges,
    CanViewPlatformStats, IsAdminOrOwnerUser
)
logger = logging.getLogger(__name__)

# ============================================================================
# VUES ADMINISTRATION - AJOUTÉES À LA FIN DE views.py
# ============================================================================

# ============================================================================
# VUES ADMINISTRATION - INTÉGRÉES DANS views.py
# ============================================================================

class AdminUserViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des utilisateurs par les admins"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        """Permissions dynamiques selon l'action"""
        if self.action in ['list', 'retrieve']:
            # Pour les actions de lecture, vérifier si l'utilisateur est admin
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Pour les autres actions, permission admin stricte
            permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
        
        return [permission() for permission in permission_classes]
    
    def list(self, request):
        """Liste des utilisateurs avec vérification admin"""
        # Vérification manuelle du rôle admin
        if not (request.user.is_authenticated and 
                hasattr(request.user, 'role') and 
                request.user.role == 'admin'):
            return Response({'error': 'Accès réservé aux administrateurs'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'users': serializer.data,
                'count': queryset.count(),
                'message': 'Liste des utilisateurs récupérée avec succès'
            })
            
        except Exception as e:
            logger.error(f"Erreur récupération utilisateurs: {str(e)}")
            return Response({'error': 'Erreur lors de la récupération des utilisateurs'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        """Filtrage et recherche des utilisateurs"""
        queryset = super().get_queryset()
        params = self.request.query_params

        # Filtrage par rôle
        if params.get('role'):
            queryset = queryset.filter(role=params.get('role'))

        # Recherche par nom ou email
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(nom__icontains=search_term) |
                Q(email__icontains=search_term) |
                Q(username__icontains=search_term)
            )

        return queryset.order_by('-date_joined').select_related('agence')

    # Ajoutez les autres actions (stats, challenges, etc.) ici...


class AdminAddPointsView(APIView):
    """✨ Vue pour ajouter des points à un utilisateur (admin uniquement)"""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    
    def post(self, request):
        """Ajouter des points à un utilisateur avec validation complète"""
        user_id = request.data.get('user_id')
        points = request.data.get('points')
        reason = request.data.get('reason', 'Ajout par administrateur')
        source = request.data.get('source', 'admin')
        
        # Validation des données
        if not user_id or not points:
            return Response({'error': 'user_id et points sont requis'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            points = int(points)
            if points <= 0:
                return Response({'error': 'Le nombre de points doit être positif'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            if points > 10000:
                return Response({'error': 'Maximum 10000 points par ajout'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'Le nombre de points doit être un entier valide'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Récupérer l'utilisateur
            user = get_object_or_404(User, id=user_id)
            
            with transaction.atomic():
                # Créer une récompense pour intégration avec le système
                reward = EcoChallengeReward.objects.create(
                    user=user,
                    title=f"Points administrateur - {points} pts",
                    description=reason,
                    reward_type='points',
                    points=points,
                    points_awarded=points,
                    credit_awarded=0,
                    claimed=True,
                    claimed_at=timezone.now(),
                    awarded_by=request.user,
                    applied_to_account=True
                )
            
            logger.info(f"Points ajoutés: {points} à {user.email} par {request.user.email}")
            
            return Response({
                'success': True,
                'message': f'{points} points ajoutés avec succès à {user.email}',
                'reward_id': str(reward.id),
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'nom': user.nom
                },
                'points': points,
                'reason': reason,
                'added_by': request.user.nom,
                'created_at': reward.awarded_at
            })
            
        except Exception as e:
            logger.error(f"Erreur ajout points: {str(e)}")
            return Response({'error': 'Erreur lors de l\'ajout des points'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminAllUsersChallengesView(APIView):
    """🗂️ Vue pour récupérer tous les défis de tous les utilisateurs"""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    
    def get(self, request):
        """Récupérer tous les défis avec filtrage avancé"""
        try:
            queryset = UserEcoChallenge.objects.all().select_related('user', 'challenge')
            
            # Filtres disponibles
            user_id = request.query_params.get('user_id')
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            
            challenge_id = request.query_params.get('challenge_id')
            if challenge_id:
                queryset = queryset.filter(challenge_id=challenge_id)
                
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
                
            user_role = request.query_params.get('user_role')
            if user_role:
                queryset = queryset.filter(user__role=user_role)
            
            # Recherche
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(user__nom__icontains=search) |
                    Q(user__email__icontains=search) |
                    Q(challenge__title__icontains=search)
                )
            
            # Ordre
            queryset = queryset.order_by('-started_at')
            
            # Pagination
            page_size = int(request.query_params.get('page_size', 50))
            page = int(request.query_params.get('page', 1))
            start = (page - 1) * page_size
            end = start + page_size
            
            paginated_challenges = queryset[start:end]
            
            serializer = UserEcoChallengeSerializer(paginated_challenges, many=True)
            
            return Response({
                'user_challenges': serializer.data,
                'count': len(serializer.data),
                'total_count': queryset.count(),
                'page': page,
                'page_size': page_size,
                'filters': {
                    'user_id': user_id,
                    'challenge_id': challenge_id,
                    'status': status_filter,
                    'user_role': user_role,
                    'search': search
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur récupération tous défis utilisateurs: {str(e)}")
            return Response({'error': 'Erreur lors de la récupération des défis'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminPlatformStatsView(APIView):
    """📈 Vue pour les statistiques globales de la plateforme"""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    
    def get(self, request):
        """Récupérer un tableau de bord complet des statistiques"""
        try:
            # Statistiques utilisateurs
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            users_by_role = dict(User.objects.values('role').annotate(count=Count('id')).values_list('role', 'count'))
            
            # Statistiques défis
            total_challenges = EcoChallenge.objects.count()
            active_challenges = EcoChallenge.objects.filter(is_active=True).count()
            featured_challenges = EcoChallenge.objects.filter(featured=True).count()
            
            # Statistiques participations
            total_participations = UserEcoChallenge.objects.count()
            active_participations = UserEcoChallenge.objects.filter(status=ChallengeStatus.ACTIVE).count()
            completed_participations = UserEcoChallenge.objects.filter(status=ChallengeStatus.COMPLETED).count()
            
            # Taux de completion global
            completion_rate = (completed_participations / total_participations * 100) if total_participations > 0 else 0
            
            # Statistiques récompenses
            total_rewards = EcoChallengeReward.objects.count()
            total_points_awarded = EcoChallengeReward.objects.aggregate(total=Sum('points_awarded'))['total'] or 0
            total_credits_awarded = EcoChallengeReward.objects.aggregate(total=Sum('credit_awarded'))['total'] or 0
            
            # Activité récente (7 derniers jours)
            week_ago = timezone.now() - timedelta(days=7)
            new_users_week = User.objects.filter(date_joined__gte=week_ago).count()
            new_participations_week = UserEcoChallenge.objects.filter(started_at__gte=week_ago).count()
            completions_week = UserEcoChallenge.objects.filter(completed_at__gte=week_ago).count()
            
            # Top performers (utilisateurs les plus actifs)
            top_users = User.objects.annotate(
                challenges_count=Count('eco_challenges'),
                points_earned=Sum('eco_rewards__points_awarded')
            ).filter(challenges_count__gt=0).order_by('-challenges_count', '-points_earned')[:10]
            
            top_users_data = []
            for user in top_users:
                top_users_data.append({
                    'id': str(user.id),
                    'nom': user.nom,
                    'email': user.email,
                    'challenges_count': user.challenges_count or 0,
                    'points_earned': user.points_earned or 0,
                    'role': user.role
                })
            
            stats = {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'inactive': total_users - active_users,
                    'by_role': users_by_role,
                    'new_this_week': new_users_week,
                    'activity_rate': round((active_users / total_users * 100) if total_users > 0 else 0, 2),
                },
                'challenges': {
                    'total': total_challenges,
                    'active': active_challenges,
                    'featured': featured_challenges,
                    'total_participations': total_participations,
                    'active_participations': active_participations,
                    'completed_participations': completed_participations,
                    'completion_rate': round(completion_rate, 2),
                    'new_participations_week': new_participations_week,
                    'completions_week': completions_week,
                },
                'rewards': {
                    'total_rewards': total_rewards,
                    'total_points_awarded': total_points_awarded,
                    'total_credits_awarded': float(total_credits_awarded),
                    'admin_rewards': EcoChallengeReward.objects.filter(awarded_by__isnull=False).count(),
                },
                'activity': {
                    'new_users_week': new_users_week,
                    'new_participations_week': new_participations_week,
                    'completions_week': completions_week,
                },
                'top_performers': top_users_data,
                'generated_at': timezone.now().isoformat()
            }
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Erreur statistiques plateforme: {str(e)}")
            return Response({'error': 'Erreur lors de la récupération des statistiques'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminManualProgressView(APIView):
    """⚡ Vue pour mettre à jour manuellement la progression"""
    
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    
    def post(self, request):
        """Mettre à jour la progression d'un défi utilisateur"""
        user_challenge_id = request.data.get('user_challenge_id')
        progress_value = request.data.get('progress_value')
        unit = request.data.get('unit', 'unité')
        reason = request.data.get('reason', 'Mise à jour par administrateur')
        
        if not user_challenge_id or progress_value is None:
            return Response({'error': 'user_challenge_id et progress_value sont requis'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            progress_value = float(progress_value)
            if progress_value < 0:
                return Response({'error': 'La valeur de progression ne peut pas être négative'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({'error': 'La valeur de progression doit être un nombre valide'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Récupérer le défi utilisateur
            user_challenge = get_object_or_404(UserEcoChallenge, id=user_challenge_id)
            
            with transaction.atomic():
                # Créer une entrée de progression
                progress_entry = EcoChallengeProgress.objects.create(
                    user_challenge=user_challenge,
                    value=progress_value,
                    recorded_at=timezone.now()
                )
                
                # Mettre à jour la progression totale
                total_progress = EcoChallengeProgress.objects.filter(
                    user_challenge=user_challenge
                ).aggregate(total=Sum('value'))['total'] or 0
                
                user_challenge.progress = total_progress
                
                # Vérifier si le défi est complété
                if user_challenge.is_completed and user_challenge.status == ChallengeStatus.ACTIVE:
                    user_challenge.status = ChallengeStatus.COMPLETED
                    user_challenge.completed_at = timezone.now()
                    
                    # Créer une récompense automatique
                    EcoChallengeReward.objects.create(
                        user=user_challenge.user,
                        user_challenge=user_challenge,
                        challenge=user_challenge.challenge,
                        title=f"Défi complété - {user_challenge.challenge.title}",
                        description=f"Félicitations ! Défi complété via intervention admin: {reason}",
                        reward_type='points',
                        points=user_challenge.challenge.reward_points,
                        points_awarded=user_challenge.challenge.reward_points,
                        credit_awarded=user_challenge.challenge.reward_credit_euros,
                        awarded_by=request.user
                    )
                
                user_challenge.save()
            
            logger.info(f"Progression mise à jour par admin: {progress_value} pour défi {user_challenge_id}")
            
            return Response({
                'success': True,
                'message': 'Progression mise à jour avec succès',
                'user_challenge_id': str(user_challenge.id),
                'new_progress': float(user_challenge.progress),
                'progress_percentage': user_challenge.progress_percentage,
                'status': user_challenge.status,
                'completed': user_challenge.status == ChallengeStatus.COMPLETED,
                'user': {
                    'nom': user_challenge.user.nom,
                    'email': user_challenge.user.email
                },
                'challenge': {
                    'title': user_challenge.challenge.title,
                    'target_value': float(user_challenge.challenge.target_value)
                }
            })
            
        except Exception as e:
            logger.error(f"Erreur mise à jour progression: {str(e)}")
            return Response({'error': 'Erreur lors de la mise à jour de la progression'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
