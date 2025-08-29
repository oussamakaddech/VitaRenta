from venv import logger
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from .models import Agence, Reservation, Vehicule, EcoChallenge, UserEcoChallenge, User

class IsAdminUser(permissions.BasePermission):
    """
    Permet l'accès complet aux utilisateurs avec le rôle 'admin' uniquement.
    """
    message = "Seuls les administrateurs ont accès à cette fonctionnalité."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'admin'
        )

    def has_object_permission(self, request, view, obj):
        return True

class IsAgencyUser(permissions.BasePermission):
    """
    Permet aux utilisateurs d'agence d'avoir un accès complet comme les admins:
    - Gérer toutes les agences (CRUD).
    - Gérer tous les véhicules (CRUD).
    - Gérer toutes les réservations.
    """
    message = "Accès réservé aux agences."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and 
            request.user.role == 'agence'
        )

    def has_object_permission(self, request, view, obj):
        # Les agences ont maintenant un accès complet à toutes les ressources
        return True

class IsClientUser(permissions.BasePermission):
    """
    Permet aux clients de:
    - Voir les véhicules (lecture seule).
    - Créer et voir leurs propres réservations.
    """
    message = "Fonctionnalité réservée aux clients."
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and 
                hasattr(request.user, 'role') and request.user.role == 'client'):
            return False
        
        # Méthodes de lecture autorisées
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Création de réservation autorisée
        if (hasattr(view, '__class__') and 
            view.__class__.__name__ == 'ReservationViewSet' and 
            hasattr(view, 'action') and view.action == 'create'):
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and 
                hasattr(request.user, 'role') and request.user.role == 'client'):
            return False
            
        # Lecture des véhicules autorisée
        if isinstance(obj, Vehicule) and request.method in permissions.SAFE_METHODS:
            return True
            
        # Accès aux propres réservations
        if isinstance(obj, Reservation):
            return obj.user and obj.user.id == request.user.id
            
        return False

class IsAdminOrAgency(permissions.BasePermission):
    """
    Permet l'accès aux admins ou aux utilisateurs d'agence:
    - Les admins et les utilisateurs d'agence ont un accès complet.
    """
    message = "Accès réservé aux administrateurs et agences."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and
            hasattr(request.user, 'role') and 
            request.user.role in ['admin', 'agence']
        )

    def has_object_permission(self, request, view, obj):
        return True

class IsClientOrAgencyOrAdmin(permissions.BasePermission):
    """
    Permet:
    - Aux clients de créer et voir leurs propres réservations.
    - Aux agences et admins d'effectuer toutes les actions.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Admins et agences ont tous les droits
        if hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']:
            return True
            
        # Clients peuvent créer, lister et récupérer des réservations
        if (hasattr(request.user, 'role') and request.user.role == 'client' and
            hasattr(view, '__class__') and view.__class__.__name__ == 'ReservationViewSet' and
            hasattr(view, 'action') and view.action in ['create', 'list', 'retrieve']):
            return True
            
        return False

    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']:
            return True
            
        if hasattr(request.user, 'role') and request.user.role == 'client':
            if isinstance(obj, Reservation):
                return obj.user and obj.user.id == request.user.id
                
        return False

class IsAdminOrAgencyOrClientReadOnly(permissions.BasePermission):
    """
    Permet:
    - Aux admins et agences d'effectuer toutes les actions.
    - Aux clients et utilisateurs non authentifiés de seulement voir (lecture seule).
    """
    def has_permission(self, request, view):
        # Accès en lecture pour tous (y compris non authentifiés)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Pour les opérations d'écriture, exiger authentification et rôle admin/agence
        if not (request.user and request.user.is_authenticated):
            return False
            
        return hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']

    def has_object_permission(self, request, view, obj):
        # Accès en lecture pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Pour les opérations d'écriture, exiger rôle admin/agence
        if not (request.user and request.user.is_authenticated):
            return False
            
        return hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']

# ============================================================================
# NOUVELLES PERMISSIONS POUR LES DÉFIS ÉCO-RESPONSABLES
# ============================================================================

class IsAdminOrAgencyForChallenges(permissions.BasePermission):
    """
    Permission avancée pour la gestion complète des défis éco-responsables
    - Admins: accès complet à tous les défis
    - Agences: peuvent créer et gérer leurs propres défis
    - Clients: peuvent seulement voir et participer
    """
    message = "Vous n'avez pas les permissions pour gérer les défis."
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Actions spéciales qui nécessitent des permissions particulières
        special_actions = ['bulk_action', 'duplicate', 'export_data', 'analytics']
        
        if hasattr(view, 'action') and view.action in special_actions:
            return hasattr(request.user, 'role') and request.user.role in ['admin', 'agence']
        
        # Les admins ont tous les droits
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        
        # Les agences peuvent créer/modifier/supprimer des défis
        if hasattr(request.user, 'role') and request.user.role == 'agence':
            return True
        
        # Les clients peuvent seulement lire et participer
        if hasattr(request.user, 'role') and request.user.role == 'client':
            safe_actions = ['list', 'retrieve', 'available', 'featured', 'participants']
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
            if hasattr(obj, 'created_by'):
                return obj.created_by == request.user or obj.created_by is None
            return True
        
        # Les clients peuvent seulement lire
        if hasattr(request.user, 'role') and request.user.role == 'client':
            return request.method in permissions.SAFE_METHODS
        
        return request.method in permissions.SAFE_METHODS

class CanParticipateInChallenges(permissions.BasePermission):
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

class IsOwnerOrAdminOrAgency(permissions.BasePermission):
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

# ============================================================================
# NOUVELLES PERMISSIONS POUR L'ADMINISTRATION
# ============================================================================

class IsAdminOnly(permissions.BasePermission):
    """Permission pour les admins uniquement - VERSION CORRIGÉE"""
    message = "Seuls les administrateurs peuvent effectuer cette action."
    
    def has_permission(self, request, view):
        # Debug logging
        logger.debug(f"IsAdminOnly - User: {request.user}")
        logger.debug(f"IsAdminOnly - Authenticated: {request.user.is_authenticated}")
        logger.debug(f"IsAdminOnly - Role: {getattr(request.user, 'role', 'NO_ROLE')}")
        
        if not request.user or not request.user.is_authenticated:
            logger.warning("IsAdminOnly - Utilisateur non authentifié")
            return False
            
        if not hasattr(request.user, 'role'):
            logger.warning(f"IsAdminOnly - Utilisateur {request.user.email} sans rôle")
            return False
            
        is_admin = request.user.role == 'admin'
        logger.debug(f"IsAdminOnly - Is admin: {is_admin}")
        
        return is_admin


class CanManageUsers(permissions.BasePermission):
    """
    Permission pour gérer les utilisateurs (admin seulement)
    """
    message = "Seuls les administrateurs peuvent gérer les utilisateurs."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role == 'admin'
        )
    
    def has_object_permission(self, request, view, obj):
        # Admin peut gérer tous les utilisateurs
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        
        # Empêcher l'auto-suppression accidentelle
        if hasattr(view, 'action') and view.action == 'destroy':
            return obj != request.user
        
        return False

class CanAddPoints(permissions.BasePermission):
    """
    Permission pour ajouter des points (admin seulement)
    """
    message = "Seuls les administrateurs peuvent ajouter des points."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role == 'admin'
        )

class CanViewAllUserChallenges(permissions.BasePermission):
    """
    Permission pour voir tous les défis utilisateur (admin et agence)
    """
    message = "Permission insuffisante pour voir tous les défis utilisateur."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )

class CanViewPlatformStats(permissions.BasePermission):
    """
    Permission pour voir les statistiques de la plateforme
    """
    message = "Permission insuffisante pour voir les statistiques globales."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )

class IsAdminOrOwnerUser(permissions.BasePermission):
    """
    Permission pour admin ou propriétaire de l'objet User
    """
    message = "Vous ne pouvez accéder qu'à vos propres données utilisateur."
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin a tous les droits
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        
        # Utilisateur peut seulement voir/modifier ses propres données
        if isinstance(obj, User):
            return obj == request.user
        
        return False

# ============================================================================
# PERMISSIONS COMPOSÉES POUR DIFFÉRENTS CAS D'USAGE
# ============================================================================

class ReadOnlyOrOwner(permissions.BasePermission):
    """
    Permission lecture seule pour tous, écriture pour le propriétaire
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Vérifier si l'utilisateur est le propriétaire
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False

class AdminOrAgencyOrOwner(permissions.BasePermission):
    """
    Permission pour admin, agence ou propriétaire
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
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

class CanManageChallengeData(permissions.BasePermission):
    """
    Permission pour gérer les données avancées des défis
    """
    message = "Permission insuffisante pour gérer les données des défis."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )

class CanViewAnalytics(permissions.BasePermission):
    """
    Permission pour voir les analytics avancées
    """
    message = "Permission insuffisante pour voir les analytics."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )

# ============================================================================
# PERMISSIONS SPÉCIALES POUR LES FONCTIONNALITÉS AVANCÉES
# ============================================================================

class CanExportData(permissions.BasePermission):
    """Permission pour exporter des données"""
    message = "Permission insuffisante pour exporter des données."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )

class CanPerformBulkActions(permissions.BasePermission):
    """Permission pour effectuer des actions en lot"""
    message = "Permission insuffisante pour les actions en lot."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )

class CanManageRewards(permissions.BasePermission):
    """Permission pour gérer les récompenses"""
    message = "Permission insuffisante pour gérer les récompenses."
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['admin', 'agence']
        )
    
    def has_object_permission(self, request, view, obj):
        # Admin peut gérer toutes les récompenses
        if hasattr(request.user, 'role') and request.user.role == 'admin':
            return True
        
        # Agence peut gérer les récompenses de ses utilisateurs
        if hasattr(request.user, 'role') and request.user.role == 'agence':
            if hasattr(obj, 'user') and hasattr(obj.user, 'agence'):
                return obj.user.agence == request.user.agence
        
        # Utilisateur peut voir ses propres récompenses
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False
