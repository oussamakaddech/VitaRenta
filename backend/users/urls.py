# users/urls.py (unchanged)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView, LogoutView, SignUpView, UserProfileView, UserStatsView,
    UserPhotoUploadView, VehiculeViewSet, AgenceViewSet, ReservationViewSet, UserViewSet
)

router = DefaultRouter()
router.register(r'vehicules', VehiculeViewSet, basename='vehicule')
router.register(r'agences', AgenceViewSet, basename='agence')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('inscription/', SignUpView.as_view(), name='signup'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/photo/', UserPhotoUploadView.as_view(), name='user-photo-upload'),
    path('profile/stats/', UserStatsView.as_view(), name='user-stats'),
    path('', include(router.urls)),
]