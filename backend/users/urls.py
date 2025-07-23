# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    LoginView, LogoutView, SignUpView, UserProfileView, UserStatsView,
    UserPhotoUploadView, VehiculeViewSet, AgenceViewSet, ReservationViewSet, UserViewSet, UpdateAgenceView
)

router = DefaultRouter()
router.register(r'vehicules', VehiculeViewSet, basename='vehicule')
router.register(r'agences', AgenceViewSet, basename='agence')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    # Authentication routes
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('inscription/', SignUpView.as_view(), name='signup'),
    # JWT routes
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    # User-related routes
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/photo/', UserPhotoUploadView.as_view(), name='user-photo-upload'),
    path('profile/stats/', UserStatsView.as_view(), name='user-stats'),
    path('update_agence/', UpdateAgenceView.as_view(), name='update-agence'),
    # Router routes
    path('', include(router.urls)),
]