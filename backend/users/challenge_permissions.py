from rest_framework.permissions import BasePermission

class IsAdminOrAgencyForChallenges(BasePermission):
    """
    Permission pour permettre aux admins et agences de gérer les défis.
    Les clients peuvent seulement voir et participer.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Les admins ont tous les droits
        if request.user.role == 'admin':
            return True
        
        # Les agences peuvent créer/modifier/supprimer des défis
        if request.user.role == 'agence':
            return True
        
        # Les clients peuvent seulement lire (GET)
        if request.user.role == 'client':
            return request.method in ['GET', 'HEAD', 'OPTIONS']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Les admins ont tous les droits
        if request.user.role == 'admin':
            return True
        
        # Les agences peuvent modifier leurs propres défis ou les défis généraux
        if request.user.role == 'agence':
            return True
        
        # Les clients peuvent seulement lire
        if request.user.role == 'client':
            return request.method in ['GET', 'HEAD', 'OPTIONS']
        
        return False

class IsOwnerOrAdminOrAgency(BasePermission):
    """
    Permission pour les défis utilisateur - propriétaire, admin ou agence
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Les admins et agences ont tous les droits
        if request.user.role in ['admin', 'agence']:
            return True
        
        # L'utilisateur propriétaire peut modifier ses propres défis
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False

class CanParticipateInChallenges(BasePermission):
    """
    Permission pour participer aux défis - tous les utilisateurs authentifiés
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['client', 'agence', 'admin']
