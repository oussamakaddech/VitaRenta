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
from .permissions import IsAdminUser, IsAgencyUser, IsClientUser, IsOwner, IsClientOrAgencyOrAdmin, IsVehicleAccessible, IsAdminOrAgency
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

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
            # Check if user is locked out
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
                # Reset login attempts on success
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
                # Increment login attempts on failure
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
            stats = {
                'total_reservations': reservations.count(),
                'reservations_actives': reservations.filter(statut='confirmee').count(),
                'reservations_terminees': reservations.filter(statut='terminee').count(),
                'reservations_annulees': reservations.filter(statut='annulee').count(),
                'total_depense': float(reservations.aggregate(total=Sum('montant_total'))['total'] or 0),
                'vehicule_prefere': user.preference_carburant or 'Non défini',
                'membre_depuis': user.date_joined.strftime('%Y-%m-%d'),
                'derniere_connexion': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Jamais',
                'agence_associee': AgenceSerializer(user.agence).data if user.agence else None,
                'compte_actif': user.is_active,
                'budget_journalier': float(user.budget_journalier) if user.budget_journalier else 0
            }
            logger.info(f"Statistiques récupérées pour l'utilisateur {user.email}")
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques pour {request.user.email}: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VehiculeViewSet(ModelViewSet):
    queryset = Vehicule.objects.all()
    serializer_class = VehiculeSerializer
    permission_classes = [IsVehicleAccessible]
    authentication_classes = [JWTAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user

        if user.is_authenticated and user.role == 'agence' and user.agence:
            queryset = queryset.filter(agence=user.agence)

        if params.get('carburant'):
            queryset = queryset.filter(carburant=params.get('carburant'))
        if params.get('statut'):
            queryset = queryset.filter(statut=params.get('statut'))
        if params.get('type'):
            queryset = queryset.filter(type=params.get('type'))
        if params.get('agence_id'):
            queryset = queryset.filter(agence_id=params.get('agence_id'))
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(marque__icontains=search_term) |
                Q(modele__icontains=search_term) |
                Q(type__icontains=search_term) |
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

        return queryset.order_by('-created_at').select_related('agence')

    def perform_create(self, serializer):
        try:
            user = self.request.user
            if user.role == 'agence' and user.agence:
                serializer.save(agence=user.agence)
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
            stats = {
                'total': queryset.count(),
                'disponibles': queryset.filter(statut='disponible').count(),
                'loues': queryset.filter(statut='loue').count(),
                'maintenance': queryset.filter(statut='maintenance').count(),
                'hors_service': queryset.filter(statut='hors_service').count(),
                'par_carburant': dict(queryset.values('carburant').annotate(count=Count('id')).values_list('carburant', 'count')),
                'par_type': dict(queryset.values('type').annotate(count=Count('id')).values_list('type', 'count')),
                'prix_moyen': float(queryset.aggregate(avg_price=Avg('prix_par_jour'))['avg_price'] or 0)
            }
            logger.info(f"Statistiques véhicules récupérées pour {request.user.email if request.user.is_authenticated else 'utilisateur anonyme'}")
            return Response(stats)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques véhicules: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
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
            # Update vehicle status
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
            # Update vehicle status back to available
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

            # Check if user has permission to update this reservation
            if (self.request.user.role == 'agence' and 
                reservation.vehicule.agence != self.request.user.agence):
                return Response({
                    'error': "Vous n'êtes pas autorisé à modifier cette réservation"
                }, status=status.HTTP_403_FORBIDDEN)

            reservation.statut = new_status
            # Update vehicle status based on reservation status
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
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du statut de la réservation {pk}: {str(e)}")
            return Response({
                'error': 'Erreur lors de la mise à jour du statut'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
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
        if params.get('search'):
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