from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from rest_framework.throttling import UserRateThrottle
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet
from django.db.models import Q, Count, Sum
import logging
from .models import Vehicule, Reservation
from .serializers import VehiculeSerializer, ReservationSerializer
from django.db import transaction
from django.db.models import Q, Count, Sum
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from .models import User, Vehicule, Agence, Reservation
from .serializers import (
    LoginSerializer, SignUpSerializer, UserSerializer, UserProfileSerializer,
    UserUpdateSerializer, VehiculeSerializer, AgenceSerializer, ReservationSerializer
)
from core.utils import send_welcome_email
import logging
import os
from django.conf import settings

logger = logging.getLogger(__name__)
class UpdateAgenceView(APIView):
    permission_classes = [IsAuthenticated]  # Exiger l'authentification

    def patch(self, request):
        user = request.user
        agence_id = request.data.get('agence_id')

        # Vérifier l'authentification
        if not user.is_authenticated:
            logger.error("Utilisateur non authentifié pour la requête PATCH /api/users/update_agence/")
            return Response({"error": "Authentification requise"}, status=status.HTTP_401_UNAUTHORIZED)

        # Valider l'entrée
        if not agence_id:
            logger.error("Aucun agence_id fourni dans la requête")
            return Response({"error": "agence_id requis"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Vérifier l'existence de l'agence
            agence = Agence.objects.get(id=agence_id)
            logger.info(f"Agence trouvée: {agence.nom} (id={agence_id})")

            # Mettre à jour dans une transaction
            with transaction.atomic():
                user.agence_id = str(agence_id)  # Convertir en chaîne pour compatibilité
                logger.info(f"Avant sauvegarde: user.email={user.email}, user.agence_id={user.agence_id}")
                user.save()
                logger.info(f"Après sauvegarde: user.email={user.email}, user.agence_id={user.agence_id}")

            # Vérifier la persistance dans la base de données
            updated_user = User.objects.get(id=user.id)
            if updated_user.agence_id != str(agence_id):
                logger.error(f"Échec de la mise à jour: user.agence_id={updated_user.agence_id}, attendu={agence_id}")
                return Response({"error": "Échec de l'assignation de l'agence"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            logger.info(f"Agence {agence.nom} assignée à l'utilisateur {user.email}")
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

        except Agence.DoesNotExist:
            logger.error(f"Agence avec id={agence_id} non trouvée")
            return Response({"error": "Agence non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur lors de l'assignation de l'agence: {str(e)}")
            return Response({"error": f"Erreur serveur: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class LoginThrottle(UserRateThrottle):
    scope = 'login'

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = []  # Suppression des limitations

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'errors': serializer.errors,
                'message': 'Données invalides'
            }, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email')
        password = serializer.validated_data.get('mot_de_passe')

        if not email or not password:
            guest_user = User.objects.create(
                username=f"guest_{timezone.now().timestamp()}",
                email=email or '',
                nom='Visiteur',
                role='visiteur',
                is_active=True
            )
            token, created = Token.objects.get_or_create(user=guest_user)
            return Response({
                'access': token.key,
                'user': UserSerializer(guest_user).data,
                'message': 'Accès libre accordé',
                'token_created': True,
                'guest_mode': True
            }, status=status.HTTP_200_OK)

        try:
            user = User.objects.get(email=email.lower())
        except User.DoesNotExist:
            logger.warning(f"Tentative de connexion avec email inexistant: {email}")
            return Response({
                'error': 'Email ou mot de passe incorrect'
            }, status=status.HTTP_401_UNAUTHORIZED)

        authenticated_user = authenticate(request, username=email, password=password)

        if authenticated_user:
            token, created = Token.objects.get_or_create(user=user)
            logger.info(f"Connexion réussie pour {email}")
            return Response({
                'access': token.key,
                'user': UserSerializer(user).data,
                'message': 'Connexion réussie',
                'token_created': created,
                'guest_mode': False
            }, status=status.HTTP_200_OK)
        else:
            logger.warning(f"Tentative de connexion échouée pour {email}")
            return Response({
                'error': 'Email ou mot de passe incorrect'
            }, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Token '):
                token_key = auth_header.split(' ')[1]
                Token.objects.filter(key=token_key).delete()
                logger.info(f"Déconnexion réussie")
            return Response({
                'message': 'Déconnexion réussie'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion: {e}")
            return Response({
                'message': 'Déconnexion effectuée'
            }, status=status.HTTP_200_OK)

class SignUpView(APIView):
    permission_classes = [AllowAny]

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
                token, created = Token.objects.get_or_create(user=user)
                try:
                    if user.email:
                        send_welcome_email(user)
                except Exception as e:
                    logger.error(f"Erreur envoi email pour {user.email}: {e}")
                logger.info(f"Nouveau compte créé: {user.email or user.username}")
                return Response({
                    'message': 'Inscription réussie !',
                    'access': token.key,
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Erreur lors de l'inscription: {e}")
            return Response({
                'error': 'Erreur lors de la création du compte'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Token '):
                token_key = auth_header.split(' ')[1]
                try:
                    token = Token.objects.get(key=token_key)
                    user = token.user
                    serializer = UserProfileSerializer(user)
                    return Response(serializer.data, status=status.HTTP_200_OK)
                except Token.DoesNotExist:
                    pass

            default_profile = {
                'id': 0,
                'email': '',
                'nom': 'Visiteur',
                'full_name': 'Visiteur',
                'telephone': '',
                'preference_carburant': '',
                'preference_carburant_display': '',
                'role': 'visiteur',
                'date_joined': timezone.now().isoformat(),
                'last_login': None,
                'is_active': True,
                'photo_url': '',
                'budget_journalier': 50,
                'agence': None
            }
            return Response(default_profile, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du profil: {e}")
            return Response({
                'error': 'Erreur interne du serveur'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Token '):
                token_key = auth_header.split(' ')[1]
                try:
                    token = Token.objects.get(key=token_key)
                    user = token.user
                    serializer = UserUpdateSerializer(user, data=request.data, partial=True)
                    if serializer.is_valid():
                        with transaction.atomic():
                            updated_user = serializer.save()
                            logger.info(f"Profil mis à jour pour l'utilisateur {user.email}")
                            response_serializer = UserProfileSerializer(updated_user)
                            return Response(response_serializer.data, status=status.HTTP_200_OK)
                    else:
                        return Response({
                            'errors': serializer.errors,
                            'message': 'Données invalides'
                        }, status=status.HTTP_400_BAD_REQUEST)
                except Token.DoesNotExist:
                    pass

            return Response({
                'message': 'Connectez-vous pour modifier votre profil'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du profil: {e}")
            return Response({
                'error': 'Erreur lors de la mise à jour du profil'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserPhotoUploadView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Token '):
                token_key = auth_header.split(' ')[1]
                try:
                    token = Token.objects.get(key=token_key)
                    user = token.user

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
                    filename = f"{user.id}.{file_extension}"
                    file_path = os.path.join(upload_dir, filename)

                    with open(file_path, 'wb') as f:
                        for chunk in photo.chunks():
                            f.write(chunk)

                    photo_url = f"{settings.MEDIA_URL}profile_photos/{filename}"
                    user.photo_url = photo_url
                    user.save()

                    return Response({
                        'message': 'Photo uploadée avec succès',
                        'photo_url': photo_url
                    }, status=status.HTTP_200_OK)
                except Token.DoesNotExist:
                    pass

            return Response({
                'message': 'Connectez-vous pour uploader une photo'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Erreur lors de l'upload de photo: {e}")
            return Response({
                'error': 'Erreur lors de l\'upload de la photo'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Token '):
                token_key = auth_header.split(' ')[1]
                try:
                    token = Token.objects.get(key=token_key)
                    user = token.user

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
                    return Response({
                        'stats': stats,
                        'message': 'Statistiques récupérées avec succès'
                    }, status=status.HTTP_200_OK)
                except Token.DoesNotExist:
                    pass

            default_stats = {
                'total_reservations': 0,
                'reservations_actives': 0,
                'reservations_terminees': 0,
                'reservations_annulees': 0,
                'total_depense': 0,
                'vehicule_prefere': 'Non défini',
                'membre_depuis': timezone.now().strftime('%Y-%m-%d'),
                'derniere_connexion': 'Jamais',
                'agence_associee': None,
                'compte_actif': True,
                'budget_journalier': 50
            }
            return Response({
                'stats': default_stats,
                'message': 'Statistiques par défaut - Connectez-vous pour voir vos données'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques: {e}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class IsAdminOrAgency(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'agence']

class VehiculeViewSet(ModelViewSet):
    queryset = Vehicule.objects.all()
    serializer_class = VehiculeSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

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

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        try:
            serializer.save()
            logger.info(f"Véhicule créé: {serializer.validated_data['marque']} {serializer.validated_data['modele']}")
        except Exception as e:
            logger.error(f"Erreur lors de la création du véhicule: {e}")
            raise

    def perform_update(self, serializer):
        try:
            vehicle = serializer.save()
            logger.info(f"Véhicule mis à jour: {vehicle.marque} {vehicle.modele}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour du véhicule: {e}")
            raise

    def perform_destroy(self, instance):
        try:
            logger.info(f"Véhicule supprimé: {instance.marque} {instance.modele}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression du véhicule: {e}")
            raise

    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            queryset = self.get_queryset()
            stats = {
                'total': queryset.count(),
                'disponibles': queryset.filter(statut='disponible').count(),
                'loues': queryset.filter(statut='loué').count(),
                'maintenance': queryset.filter(statut='maintenance').count(),
                'hors_service': queryset.filter(statut='hors_service').count(),
                'par_carburant': dict(queryset.values('carburant').annotate(count=Count('id')).values_list('carburant', 'count')),
                'par_type': dict(queryset.values('type').annotate(count=Count('id')).values_list('type', 'count')),
                'prix_moyen': float(queryset.aggregate(avg_price=Sum('prix_par_jour'))['avg_price'] or 0)
            }
            return Response(stats)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques véhicules: {e}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AgenceViewSet(ModelViewSet):
    queryset = Agence.objects.all()
    serializer_class = AgenceSerializer
    permission_classes = [IsAdminOrAgency]
    authentication_classes = [TokenAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user

        if user.is_authenticated and user.role == 'agence':
            try:
                if user.agence and Agence.objects.filter(id=user.agence.id).exists():
                    queryset = queryset.filter(id=user.agence.id)
                else:
                    if user.agence:  # Clear invalid reference
                        logger.warning(f"Utilisateur {user.email} a une référence d'agence invalide, mise à jour vers None")
                        user.agence = None
                        user.save()
                    logger.info(f"Utilisateur {user.email} sans agence valide, retourne toutes les agences")
            except Agence.DoesNotExist:
                logger.warning(f"Utilisateur {user.email} a une référence d'agence invalide, mise à jour vers None")
                user.agence = None
                user.save()
                logger.info(f"Utilisateur {user.email} sans agence valide, retourne toutes les agences")
        else:
            logger.info(f"Utilisateur {user.email if user.is_authenticated else 'anonyme'} voit toutes les agences")

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
                logger.info(f"Agence créée: {agence.nom} par {user.email if user.is_authenticated else 'accès libre'}")
                return agence
        except Exception as e:
            logger.error(f"Erreur lors de la création d'agence: {str(e)}")
            raise

    def perform_update(self, serializer):
        try:
            agence = serializer.save()
            logger.info(f"Agence mise à jour: {agence.nom}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de l'agence: {e}")
            raise

    def perform_destroy(self, instance):
        try:
            if Vehicule.objects.filter(agence_id=instance.id).exists():
                raise ValidationError("Impossible de supprimer l'agence : des véhicules y sont associés.")
            if User.objects.filter(agence=instance).exists():
                User.objects.filter(agence=instance).update(agence=None)
                logger.info(f"Suppression des références d'agence pour les utilisateurs associés à {instance.nom}")
            logger.info(f"Agence supprimée: {instance.nom}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'agence: {e}")
            raise

    @action(detail=True, methods=['get'])
    def statistiques(self, request, pk=None):
        try:
            agence = get_object_or_404(Agence, id=pk)
            vehicles = Vehicule.objects.filter(agence_id=agence.id)
            reservations = Reservation.objects.filter(vehicule_id__in=vehicles.values('id'))
            stats = {
                'total_vehicules': vehicles.count(),
                'vehicules_disponibles': vehicles.filter(statut='disponible').count(),
                'vehicules_loues': vehicles.filter(statut='loué').count(),
                'vehicules_maintenance': vehicles.filter(statut='maintenance').count(),
                'vehicules_hors_service': vehicles.filter(statut='hors_service').count(),
                'total_reservations': reservations.count(),
                'reservations_actives': reservations.filter(statut='confirmee').count(),
                'reservations_terminees': reservations.filter(statut='terminee').count(),
                'reservations_annulees': reservations.filter(statut='annulee').count(),
                'revenus_total': float(reservations.aggregate(total=Sum('montant_total'))['total'] or 0),
                'revenus_mois': float(reservations.filter(
                    created_at__month=timezone.now().month,
                    created_at__year=timezone.now().year
                ).aggregate(total=Sum('montant_total'))['total'] or 0),
                'utilisateurs_associes': User.objects.filter(agence=agence).count()
            }
            return Response({
                'stats': stats,
                'message': 'Statistiques récupérées avec succès'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques pour l'agence {pk}: {e}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrAgency]
    authentication_classes = [TokenAuthentication]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        user = self.request.user

        if user.is_authenticated and user.role == 'agence':
            try:
                if user.agence and Agence.objects.filter(id=user.agence.id).exists():
                    queryset = queryset.filter(agence=user.agence)
                else:
                    logger.info(f"Utilisateur {user.email} sans agence valide, retourne tous les utilisateurs")
            except Agence.DoesNotExist:
                logger.warning(f"Utilisateur {user.email} a une référence d'agence invalide")
                # Return all users instead of empty queryset

        if params.get('role'):
            queryset = queryset.filter(role=params.get('role'))
        if params.get('email'):
            queryset = queryset.filter(email__icontains=params.get('email'))
        if params.get('nom'):
            queryset = queryset.filter(nom__icontains=params.get('nom'))
        if params.get('search'):
            search_term = params.get('search')
            queryset = queryset.filter(
                Q(nom__icontains=search_term) |
                Q(email__icontains=search_term) |
                Q(telephone__icontains=search_term)
            )

        return queryset.order_by('-date_joined')

    def perform_create(self, serializer):
        try:
            user = serializer.save()
            logger.info(f"Utilisateur créé: {user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la création de l'utilisateur: {e}")
            raise

    def perform_update(self, serializer):
        try:
            user = serializer.save()
            logger.info(f"Utilisateur mis à jour: {user.email}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de l'utilisateur: {e}")
            raise

    def perform_destroy(self, instance):
        try:
            logger.info(f"Utilisateur supprimé: {instance.email}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'utilisateur: {e}")
            raise

    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            queryset = self.get_queryset()
            stats = {
                'total': queryset.count(),
                'par_role': dict(queryset.values('role').annotate(count=Count('id')).values_list('role', 'count')),
                'actifs': queryset.filter(is_active=True).count(),
                'inactifs': queryset.filter(is_active=False).count(),
                'avec_agence': queryset.filter(agence__isnull=False).count(),
                'sans_agence': queryset.filter(agence__isnull=True).count()
            }
            return Response(stats)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques utilisateurs: {e}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'], url_path='update_agence')
    def update_agence(self, request):
        try:
            user = self.request.user
            if not user.is_authenticated:
                return Response({
                    'error': 'Vous devez être connecté pour effectuer cette action'
                }, status=status.HTTP_401_UNAUTHORIZED)

            if user.role not in ['admin', 'agence']:
                return Response({
                    'error': 'Seuls les utilisateurs admin ou agence peuvent assigner une agence'
                }, status=status.HTTP_403_FORBIDDEN)

            agence_id = request.data.get('agence_id')
            if not agence_id:
                return Response({
                    'error': 'L\'ID de l\'agence est requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                agence = Agence.objects.get(id=agence_id)
            except Agence.DoesNotExist:
                return Response({
                    'error': 'Agence introuvable'
                }, status=status.HTTP_404_NOT_FOUND)

            user.agence = agence
            user.save()
            logger.info(f"Agence {agence.nom} assignée à l'utilisateur {user.email}")
            return Response({
                'message': 'Agence assignée avec succès',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Erreur lors de l'assignation de l'agence: {e}")
            return Response({
                'error': 'Erreur lors de l\'assignation de l\'agence'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReservationViewSet(ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        if params.get('statut'):
            queryset = queryset.filter(statut=params.get('statut'))
        if params.get('vehicule_id'):
            queryset = queryset.filter(vehicule_id=params.get('vehicule_id'))
        if params.get('user_id'):
            queryset = queryset.filter(user_id=params.get('user_id'))
        if params.get('date_debut'):
            queryset = queryset.filter(date_debut__gte=params.get('date_debut'))
        if params.get('date_fin'):
            queryset = queryset.filter(date_fin__lte=params.get('date_fin'))

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        try:
            user = self.request.user
            if user.is_authenticated:
                serializer.save(user_id=user.id)
            else:
                serializer.save(user_id=None)  # Allow null user_id for unauthenticated users
            logger.info(f"Réservation créée: {serializer.instance.id}")
            return serializer.instance
        except Exception as e:
            logger.error(f"Erreur lors de la création de la réservation: {e}")
            raise

    def perform_update(self, serializer):
        try:
            reservation = serializer.save()
            logger.info(f"Réservation mise à jour: {reservation.id}")
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour de la réservation: {e}")
            raise

    def perform_destroy(self, instance):
        try:
            logger.info(f"Réservation supprimée: {instance.id}")
            instance.delete()
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de la réservation: {e}")
            raise

    @action(detail=False, methods=['get'])
    def stats(self, request):
        try:
            queryset = self.get_queryset()
            stats = {
                'total': queryset.count(),
                'par_statut': dict(queryset.values('statut').annotate(count=Count('id')).values_list('statut', 'count')),
                'revenus_total': float(queryset.aggregate(total=Sum('montant_total'))['total'] or 0),
                'revenus_mois': float(queryset.filter(
                    created_at__month=timezone.now().month,
                    created_at__year=timezone.now().year
                ).aggregate(total=Sum('montant_total'))['total'] or 0)
            }
            return Response(stats)
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des statistiques réservations: {e}")
            return Response({
                'error': 'Erreur lors de la récupération des statistiques'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def my_reservations(self, request):
        try:
            user = self.request.user
            if user.is_authenticated:
                queryset = Reservation.objects.filter(user_id=user.id)
                serializer = self.get_serializer(queryset, many=True)
                return Response(serializer.data)
            return Response({
                'message': 'Connectez-vous pour voir vos réservations',
                'reservations': []
            })
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des réservations: {e}")
            return Response({
                'error': 'Erreur lors de la récupération des réservations'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)