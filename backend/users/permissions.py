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
# backend/users/challenge_permissions.py (amélioration)

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from .models import EcoChallenge, UserEcoChallenge

class IsAdminOrAgencyForChallenges(permissions.BasePermission):
    """
    Permission avancée pour la gestion complète des défis éco-responsables
    - Admins: accès complet à tous les défis
    - Agences: peuvent créer et gérer leurs propres défis
    """
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Actions de lecture pour tous les utilisateurs authentifiés
        if view.action in ['list', 'retrieve', 'available', 'stats']:
            return True
            
        # Actions d'écriture pour admins et agences uniquement
        if request.user.role in ['admin', 'agence']:
            return True
            
        return False
    
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Admin a tous les droits
        if request.user.role == 'admin':
            return True
        
        # Agence peut gérer ses propres défis
        if request.user.role == 'agence':
            # Vous pouvez ajouter une relation "created_by" au modèle EcoChallenge
            # pour tracer qui a créé le défi
            return True
        
        # Clients peuvent seulement lire
        if view.action in ['retrieve'] and request.user.role == 'client':
            return True
            
        return False

class CanManageChallengeData(permissions.BasePermission):
    """Permission pour gérer les données avancées des défis"""
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role in ['admin', 'agence'])

class CanViewAnalytics(permissions.BasePermission):
    """Permission pour voir les analytics avancées"""
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role in ['admin', 'agence'])

class IsAdminOrAgencyOrClientReadOnly(permissions.BasePermission):
    """
    Allows:
    - Admins and agency users to perform all actions on agencies.
    - Clients to only view agencies (read-only access).
    - Unauthenticated users to view agencies for public browsing.
    """
    def has_permission(self, request, view):
        # Allow read access to anyone (including unauthenticated users)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, require authentication and admin/agency role
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ['admin', 'agence']

    def has_object_permission(self, request, view, obj):
        # Allow read access to anyone
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For write operations, require admin/agency role
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ['admin', 'agence']
# backend/users/permissions.py - NOUVEAU FICHIER
from rest_framework import permissions

class IsAdminOrAgencyForChallenges(permissions.BasePermission):
    """
    Permission pour admin ou agence pour gérer les défis
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Les actions de lecture sont autorisées pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Les actions d'écriture pour admin et agence seulement
        return hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']

class CanParticipateInChallenges(permissions.BasePermission):
    """
    Permission pour participer aux défis
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated

class IsOwnerOrAdminOrAgency(permissions.BasePermission):
    """
    Permission pour propriétaire, admin ou agence
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin et agence ont tous les droits
        if hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']:
            return True
        
        # Propriétaire a les droits sur ses objets
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False
