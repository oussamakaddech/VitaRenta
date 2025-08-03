from datetime import timedelta
import datetime
import secrets
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
import logging
import os
from .permissions import IsAdminOrAgency 
from django.conf import settings
from rest_framework.decorators import action
from .models import User, Vehicule, Agence, Reservation
from .serializers import (
    LoginSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer, SignUpSerializer, UserSerializer, UserProfileSerializer,
    UserUpdateSerializer, VehiculeSerializer, AgenceSerializer, ReservationSerializer
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
    permission_classes = [AllowAny]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user

        logger.debug(f"get_queryset - User: {user.email if user.is_authenticated else 'anonymous'}, Role: {user.role if user.is_authenticated else 'none'}")
        if user.is_authenticated and user.role == 'agence' and user.agence:
            logger.debug(f"Filtering queryset by agence: {user.agence.id}")
            queryset = queryset.filter(agence=user.agence)
        elif user.is_authenticated and user.role == 'agence' and not user.agence:
            logger.warning(f"Agency user {user.email} has no associated agence")
            queryset = queryset.none()  # Return empty queryset for agency users without an agency

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
            if user.role == 'agence' and user.agence:
                serializer.save(agence=user.agence)
            else:
                serializer.save()
            logger.info(f"Véhicule créé: {serializer.validated_data['marque']} {serializer.validated_data['modele']} par {user.email}")
        except BulkWriteError as e:
            if 'E11000 duplicate key error' in str(e):
                logger.error(f"Erreur de clé en double lors de la création du véhicule pour {user.email}: {str(e)}")
                return Response({
                    'error': 'Un véhicule avec cette immatriculation existe déjà.'
                }, status=status.HTTP_400_BAD_REQUEST)
            logger.error(f"Erreur lors de la création du véhicule: {str(e)}")
            raise
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
            logger.debug(f"Stats - Queryset size: {queryset.count()}")
            
            # Compute individual stats with error handling
            total = queryset.count()
            logger.debug(f"Stats - Total vehicles: {total}")
            
            disponibles = queryset.filter(statut='disponible').count()
            logger.debug(f"Stats - Disponibles: {disponibles}")
            
            loues = queryset.filter(statut='loue').count()
            logger.debug(f"Stats - Loués: {loues}")
            
            maintenance = queryset.filter(statut='maintenance').count()
            logger.debug(f"Stats - Maintenance: {maintenance}")
            
            hors_service = queryset.filter(statut='hors_service').count()
            logger.debug(f"Stats - Hors service: {hors_service}")
            
            # Compute par_carburant
            par_carburant_query = queryset.values('carburant').annotate(count=Count('id')).values_list('carburant', 'count')
            par_carburant = dict(par_carburant_query)
            logger.debug(f"Stats - Par carburant: {par_carburant}")
            
            # Compute prix_moyen - CORRECTION: Gérer correctement Decimal128
            prix_moyen = 0.0
            try:
                # Utiliser une approche différente pour éviter la conversion Decimal128
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
            
            logger.debug(f"Stats - Prix moyen: {prix_moyen}")
            
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
    permission_classes = [IsAdminOrAgency]
    authentication_classes = [JWTAuthentication]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user
        
        if user.is_authenticated and user.role == 'agence' and user.agence:
            queryset = queryset.filter(id=user.agence.id)
        
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
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdminOrAgency])
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
                parsed_date = datetime.datetime.strptime(date, '%Y-%m-%d')
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
            
            # Create context for prediction
            is_holiday = 1 if date in holidays else 0
            is_family_event = 1 if date in family_events else 0
            is_rainy = 0  # Default value, could be enhanced with weather API
            taux_occupation = 0.5  # Default occupancy rate
            
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
                
                context = [is_rainy, current_is_family_event, current_is_holiday, taux_occupation]
                
                # Get prediction
                try:
                    predicted_demand = ensemble_predict_demand(csv_path, location, carburant, context)
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