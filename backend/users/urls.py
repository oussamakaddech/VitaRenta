# backend/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    AssignUserToAgencyView,  EcoScoreViewSet, FeedbackViewSet, IOTDataViewSet, LoginView, LogoutView, PasswordResetConfirmView, PasswordResetRequestView, SignUpView,  UserProfileView, UserStatsView,
    UserPhotoUploadView, VehiculeViewSet, AgenceViewSet, ReservationViewSet,
    UserViewSet, UpdateAgenceView, DemandForecastView, RecommendationView,
    MaintenancePredictionViewSet, EcoChallengeViewSet, UserEcoChallengeViewSet, 
    EcoChallengeProgressViewSet, EcoChallengeRewardViewSet
)
from .test_views import test_simple_view, active_challenges_simple
from .mongo_views import simple_mongo_test, active_challenges_mongo

# Router configuration
router = DefaultRouter()
router.register(r'vehicules', VehiculeViewSet, basename='vehicule')
router.register(r'agences', AgenceViewSet, basename='agence')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'users', UserViewSet, basename='user')
router.register(r'iot-data', IOTDataViewSet)
router.register(r'eco-score', EcoScoreViewSet)
router.register(r'maintenance-prediction', MaintenancePredictionViewSet)
router.register(r'feedback', FeedbackViewSet)
router.register(r'user-eco-challenges', UserEcoChallengeViewSet, basename='user-eco-challenges')
router.register(r'eco-challenge-progress', EcoChallengeProgressViewSet, basename='eco-challenge-progress')
router.register(r'eco-challenge-rewards', EcoChallengeRewardViewSet, basename='eco-challenge-rewards')
router.register(r'user-eco-challenges', UserEcoChallengeViewSet, basename='user-eco-challenge')
router.register(r'eco-challenges', EcoChallengeViewSet, basename='eco-challenge')
# urls.py - Ajouts pour points et coupons
urlpatterns = [
    # Authentication routes
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('inscription/', SignUpView.as_view(), name='signup'),
    path('iot-data/generate_test_data/', IOTDataViewSet.as_view({'post': 'generate_test_data'}), name='generate_test_data'),
    path('update-agence/', UpdateAgenceView.as_view(), name='update-agence'),
    path('assign_user_to_agency/', AssignUserToAgencyView.as_view(), name='assign_user_to_agence'),

    # JWT routes
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # User-related routes
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/photo/', UserPhotoUploadView.as_view(), name='user-photo-upload'),
    path('profile/stats/', UserStatsView.as_view(), name='user-stats'),
    path('update-agence/', UpdateAgenceView.as_view(), name='update-agence'),
    
    # Analytics routes
    path('demand-forecast/', DemandForecastView.as_view(), name='demand-forecast'),
    path('recommendations/', RecommendationView.as_view(), name='recommendations'),
    
    # API routes pour les stats (ajout pour corriger le problème des stats)
    path('api/vehicules/stats/', VehiculeViewSet.as_view({'get': 'stats'}), name='vehicule-stats'),
    path('api/reservations/stats/', ReservationViewSet.as_view({'get': 'stats'}), name='reservation-stats'),
    path('api/users/stats/', UserViewSet.as_view({'get': 'stats'}), name='user-stats'),
    
    # Routes pour les données IoT
    path('api/iot-data/check_data_status/', IOTDataViewSet.as_view({'get': 'check_data_status'}), name='iot-data-check-status'),
    path('api/iot-data/generate_test_data/', IOTDataViewSet.as_view({'post': 'generate_test_data'}), name='iot-data-generate-test-data'),
    path('api/iot-data/test_prediction_request/', IOTDataViewSet.as_view({'post': 'test_prediction_request'}), name='iot-data-test-prediction'),
    # Ajouter ces routes dans urlpatterns
    path('api/user-eco-challenges/join_challenge/', UserEcoChallengeViewSet.as_view({'post': 'join_challenge'}), name='join-challenge'),
    path('api/eco-challenge-progress/update/', EcoChallengeProgressViewSet.as_view({'post': 'create'}), name='update-progress'),
    # Corriger la route join_challenge dans urlpatterns :
path('api/user-eco-challenges/join_challenge/', UserEcoChallengeViewSet.as_view({'post': 'join_challenge'}), name='join-challenge'),

    # Routes pour l'éco-score
    path('api/eco-score/calculate_eco_score/', EcoScoreViewSet.as_view({'post': 'calculate_eco_score'}), name='eco-score-calculate'),
    path('api/eco-score/distribution/', EcoScoreViewSet.as_view({'get': 'distribution'}), name='eco-score-distribution'),
    
    # Routes pour la réinitialisation du mot de passe
    path('password-reset-request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),  
    path('api/eco-challenges/available/', EcoChallengeViewSet.as_view({'get': 'available'}), name='challenges-available'),
    path('api/eco-challenges/featured/', EcoChallengeViewSet.as_view({'get': 'featured'}), name='challenges-featured'),
    path('api/eco-challenges/analytics/', EcoChallengeViewSet.as_view({'get': 'analytics'}), name='challenges-analytics'),
    path('api/eco-challenges/bulk-action/', EcoChallengeViewSet.as_view({'post': 'bulk_action'}), name='challenges-bulk-action'),
    
    # Routes pour les défis utilisateur
    path('api/user-eco-challenges/join/', UserEcoChallengeViewSet.as_view({'post': 'join_challenge'}), name='join-challenge'),
    path('api/user-eco-challenges/my-rewards/', EcoChallengeRewardViewSet.as_view({'get': 'my_rewards'}), name='my-rewards'),
    
    # Router routes (doit être en dernier pour éviter les conflits)
    path('api/', include(router.urls)),
    path('', include(router.urls)),  # Maintien de la compatibilité
]

# Configuration pour le développement
try:
    from django.conf import settings
    if settings.DEBUG:
        from django.conf.urls.static import static
        # Servir les fichiers média en développement
        urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
        urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
except ImportError:
    pass