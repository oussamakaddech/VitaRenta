# backend/users/permissions.py - VERSION FINALE CORRIGÉE

from rest_framework.permissions import BasePermission
from rest_framework import permissions


class IsAdminOrAgencyForChallenges(BasePermission):
    """
    Permission pour permettre aux admins et agences de gérer les défis.
    Les clients peuvent seulement voir et participer.
    """
    
    message = "Vous n'avez pas les permissions nécessaires pour cette action."
    
    def has_permission(self, request, view):
        # Vérifier l'authentification
        if not request.user.is_authenticated:
            return False
        
        # Actions spéciales qui nécessitent des permissions particulières
        special_actions = ['bulk_action', 'duplicate', 'export_data']
        
        # Pour les actions spéciales, seuls admin et agence
        if hasattr(view, 'action') and view.action in special_actions:
            return hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']
        
        # Les admins ont tous les droits
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        
        # Les agences peuvent créer/modifier/supprimer des défis
        if hasattr(request.user, 'role') and request.user.role == 'agence':
            return True
        
        # Les clients peuvent seulement lire (GET) et participer
        if hasattr(request.user, 'role') and request.user.role == 'client':
            # Actions autorisées pour les clients
            safe_actions = ['list', 'retrieve', 'available', 'featured', 'analytics', 'participants']
            
            if hasattr(view, 'action') and view.action in safe_actions:
                return True
            
            # Méthodes de lecture seulement
            return request.method in permissions.SAFE_METHODS
        
        # Fallback pour les utilisateurs sans rôle défini
        return request.method in permissions.SAFE_METHODS
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Les admins ont tous les droits
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        
        # Les agences peuvent modifier leurs propres défis ou les défis généraux
        if hasattr(request.user, 'role') and request.user.role == 'agence':
            # Si le défi a un créateur, vérifier si c'est l'utilisateur ou si c'est un défi général
            if hasattr(obj, 'created_by'):
                return obj.created_by == request.user or obj.created_by is None
            return True
        
        # Les clients peuvent seulement lire
        if hasattr(request.user, 'role') and request.user.role == 'client':
            return request.method in permissions.SAFE_METHODS
        
        return request.method in permissions.SAFE_METHODS


class IsOwnerOrAdminOrAgency(BasePermission):
    """
    Permission pour les défis utilisateur - propriétaire, admin ou agence
    """
    
    message = "Vous ne pouvez accéder qu'à vos propres ressources."
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Les admins et agences ont tous les droits
        if hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']:
            return True
        
        # L'utilisateur propriétaire peut modifier ses propres défis
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class CanParticipateInChallenges(BasePermission):
    """
    Permission pour participer aux défis - tous les utilisateurs authentifiés
    """
    
    message = "Vous devez être connecté pour participer aux défis."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Tous les utilisateurs authentifiés peuvent participer
        if hasattr(request.user, 'role'):
            return request.user.role in ['client', 'agence', 'admin']
        
        return True


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission pour permettre la lecture à tous mais l'écriture seulement au propriétaire
    """
    
    def has_permission(self, request, view):
        # Lecture libre pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
        # Écriture seulement pour les utilisateurs authentifiés
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Permissions de lecture pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Permissions d'écriture seulement pour le propriétaire
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsAdminOnly(BasePermission):
    """
    Permission pour les admins uniquement
    """
    
    message = "Seuls les administrateurs peuvent effectuer cette action."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'admin'
        )


class IsClientOnly(BasePermission):
    """
    Permission pour les clients uniquement
    """
    
    message = "Cette action est réservée aux clients."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'client'
        )


class IsAgencyOnly(BasePermission):
    """
    Permission pour les agences uniquement
    """
    
    message = "Cette action est réservée aux agences."
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'agence'
        )


# Permissions composées pour différents cas d'usage
class ReadOnlyOrOwner(BasePermission):
    """
    Permission lecture seule pour tous, écriture pour le propriétaire
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Vérifier si l'utilisateur est le propriétaire
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class AdminOrAgencyOrOwner(BasePermission):
    """
    Permission pour admin, agence ou propriétaire
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Admin et agence ont tous les droits
        if hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']:
            return True
        
        # Le propriétaire a les droits sur ses objets
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
        
        return False
