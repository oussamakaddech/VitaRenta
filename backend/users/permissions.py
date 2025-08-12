# backend/users/permissions.py
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from .models import Agence, Reservation, Vehicule

class IsAdminUser(permissions.BasePermission):
    """
    Allows full access to users with the 'admin' role only.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

    def has_object_permission(self, request, view, obj):
        return True

class IsAgencyUser(permissions.BasePermission):
    """
    Allows agency users to have full access like admins:
    - Manage all agencies (CRUD).
    - Manage all vehicles (CRUD).
    - Manage all reservations.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'agence'):
            return False
        return True

    def has_object_permission(self, request, view, obj):
        # Les agences ont maintenant un accès complet à toutes les ressources
        return True

class IsClientUser(permissions.BasePermission):
    """
    Allows clients to:
    - View vehicles (read-only).
    - Create and view their own reservations.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'client'):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if view.__class__.__name__ == 'ReservationViewSet' and view.action == 'create':
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and request.user.role == 'client'):
            return False
        if isinstance(obj, Vehicule) and request.method in permissions.SAFE_METHODS:
            return True
        if isinstance(obj, Reservation):
            return obj.user and obj.user.id == request.user.id
        return False

class IsAdminOrAgency(permissions.BasePermission):
    """
    Allows access to admins or agency users:
    - Admins and agency users have full access to all agencies, vehicles, and reservations.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ['admin', 'agence']

    def has_object_permission(self, request, view, obj):
        return True

class IsClientOrAgencyOrAdmin(permissions.BasePermission):
    """
    Allows:
    - Clients to create and view their own reservations.
    - Agency users and admins to perform all actions.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in ['admin', 'agence']:
            return True
        if request.user.role == 'client' and view.__class__.__name__ == 'ReservationViewSet' and view.action in ['create', 'list', 'retrieve']:
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role in ['admin', 'agence']:
            return True
        if request.user.role == 'client':
            if isinstance(obj, Reservation):
                return obj.user and obj.user.id == request.user.id
            return False
        return False