# backend/views.py
from datetime import timedelta
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
from django.db.models import Sum, Count, Q, Avg
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
import logging
import os
from django.conf import settings
from rest_framework.decorators import action
from .models import User, Vehicule, Agence, Reservation
from .serializers import (
    LoginSerializer, SignUpSerializer, UserSerializer, UserProfileSerializer,
    UserUpdateSerializer, VehiculeSerializer, AgenceSerializer, ReservationSerializer
)
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
            total_depense = reservations.aggregate(total=Sum('montant_total'))['total'] or 0
            if isinstance(total_depense, Decimal128):
                total_depense = float(total_depense.to_decimal())
            budget_journalier = float(user.budget_journalier.to_decimal()) if isinstance(user.budget_journalier, Decimal128) else float(user.budget_journalier or 0)

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

            # Compute prix_moyen
            avg_price = queryset.aggregate(avg_price=Avg('prix_par_jour'))['avg_price']
            logger.debug(f"Stats - Raw avg_price: {avg_price}, type: {type(avg_price)}")
            prix_moyen = 0.0
            if avg_price is not None:
                if isinstance(avg_price, Decimal128):
                    prix_moyen = float(avg_price.to_decimal())
                elif isinstance(avg_price, (int, float)):
                    prix_moyen = float(avg_price)
                else:
                    logger.warning(f"Stats - Unexpected avg_price type: {type(avg_price)}")
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
                'revenus_total': float(reservations.aggregate(total=Sum('montant_total'))['total'] or 0),
                'moyenne_prix_par_jour': float(vehicles.aggregate(avg_price=Avg('prix_par_jour'))['avg_price'] or 0)
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

class ReservationViewSet(ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [IsAuthenticated, IsClientOrAgencyOrAdmin]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        params = self.request.query_params

        if user.role == 'client':
            queryset = queryset.filter(user=user)
        elif user.role == 'agence' and user.agence:
            queryset = queryset.filter(vehicule__agence=user.agence)

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
        try:
            user = self.request.user
            if user.role == 'client':
                serializer.save(user=user)
            else:
                serializer.save()
            reservation = serializer.instance
            vehicle = reservation.vehicule
            vehicle.statut = 'loue'
            vehicle.save()
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
        try:
            vehicle = instance.vehicule
            vehicle.statut = 'disponible'
            vehicle.save()
            logger.info(f"Réservation supprimée: ID {instance.id} par {self.request.user.email}")
            instance.delete()
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

            if (self.request.user.role == 'agence' and 
                reservation.vehicule.agence != self.request.user.agence):
                return Response({
                    'error': "Vous n'êtes pas autorisé à modifier cette réservation"
                }, status=status.HTTP_403_FORBIDDEN)

            reservation.statut = new_status
            if new_status == 'annulee' or new_status == 'terminee':
                reservation.vehicule.statut = 'disponible'
            elif new_status == 'confirmee':
                reservation.vehicule.statut = 'loue'
            reservation.vehicule.save()
            reservation.save()
            
            logger.info(f"Statut de la réservation {reservation.id} mis à jour à '{new_status}' par {self.request.user.email}")
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
            stats = {
                'total': queryset.count(),
                'en_attente': queryset.filter(statut='en_attente').count(),
                'confirmees': queryset.filter(statut='confirmee').count(),
                'terminees': queryset.filter(statut='terminee').count(),
                'annulees': queryset.filter(statut='annulee').count(),
                'revenus_total': float(queryset.aggregate(total=Sum('montant_total'))['total'] or 0),
                'moyenne_duree': float(queryset.aggregate(
                    avg_duration=Avg('date_fin') - Avg('date_debut')
                )['avg_duration'].days if queryset.exists() else 0)
            }
            logger.info(f"Statistiques des réservations récupérées pour {request.user.email}")
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques des réservations: {str(e)}")
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
            stats = {
                'total_users': queryset.count(),
                'active_users': queryset.filter(is_active=True).count(),
                'inactive_users': queryset.filter(is_active=False).count(),
                'by_role': dict(queryset.values('role').annotate(count=Count('id')).values_list('role', 'count')),
                'membre_depuis_moyen': queryset.aggregate(
                    avg_days=Avg(timezone.now() - F('date_joined'))
                )['avg_days'].days if queryset.exists() else 0
            }
            logger.info(f"Statistiques des utilisateurs récupérées pour {request.user.email}")
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques des utilisateurs: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DemandForecastView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrAgency]
    authentication_classes = [JSONWebTokenAuthentication]

    def get(self, request):
        try:
            location = request.query_params.get('location', 'Tunis')
            carburant = request.query_params.get('carburant', 'électrique')
            date = request.query_params.get('date')
            
            if not date:
                logger.error(f"Prédiction de la demande échouée : date manquante pour {request.user.email}")
                return Response({"error": "Date requise"}, status=status.HTTP_400_BAD_REQUEST)

            holidays = [
                "2025-01-01", "2025-01-14", "2025-03-20", "2025-04-09",
                "2025-05-01", "2025-07-25", "2025-08-13", "2025-10-15",
                "2025-03-30", "2025-03-31", "2025-04-01",
                "2025-06-06", "2025-06-07", "2025-06-26"
            ]
            is_holiday = 1 if date in holidays else 0
            is_family_event = 1 if date in ["2025-03-30", "2025-03-31", "2025-04-01", "2025-06-06", "2025-06-07"] else 0
            is_rainy = 0
            taux_occupation = 0.5
            
            csv_path = os.path.join(settings.BASE_DIR, 'data', 'demand_forecast_dataset_2025.csv')
            if not os.path.exists(csv_path):
                logger.error(f"Fichier CSV non trouvé : {csv_path}")
                return Response({"error": "Données historiques non disponibles"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            context = [is_rainy, is_family_event, is_holiday, taux_occupation]
            predicted_demand = ensemble_predict_demand(csv_path, location, carburant, context)
            
            if predicted_demand == 0:
                logger.warning(f"Aucune prédiction pour {location} - {carburant}")
                return Response({"error": f"Aucune donnée pour {location} - {carburant}"}, status=status.HTTP_404_NOT_FOUND)

            logger.info(f"Prédiction réussie pour {location} - {carburant} le {date} : {predicted_demand} réservations")
            return Response({
                "location": location,
                "carburant": carburant,
                "date": date,
                "predicted_demand": predicted_demand
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Erreur lors de la prédiction de la demande pour {request.user.email}: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



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