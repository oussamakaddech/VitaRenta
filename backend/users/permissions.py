from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to users with the 'admin' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'

class IsAgencyUser(permissions.BasePermission):
    """
    Allows access only to users with the 'agence' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'agence'

class IsClientUser(permissions.BasePermission):
    """
    Allows access only to users with the 'client' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'client'

class IsReadOnly(permissions.BasePermission):
    """
    Allows read-only access (GET, HEAD, OPTIONS).
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS

class IsOwner(permissions.BasePermission):
    """
    Allows access only to the owner of the object.
    Checks if the request user's ID matches the object's user_id or id.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user_id'):
            return obj.user_id == str(request.user.id)
        if hasattr(obj, 'id'):
            return obj.id == request.user.id
        return False

class IsClientOrAgencyOrAdmin(permissions.BasePermission):
    """
    Allows:
    - Clients to create and view their own reservations.
    - Agents and Admins to perform all actions.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ['admin', 'agence']:
            return True
        if request.user.role == 'client':
            return view.action in ['create', 'list', 'retrieve', 'my_reservations']
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role in ['admin', 'agence']:
            return True
        if request.user.role == 'client':
            return obj.user_id == str(request.user.id)
        return False

class IsVehicleAccessible(permissions.BasePermission):
    """
    Allows:
    - Clients to view vehicles (read-only).
    - Agents to manage vehicles in their agency.
    - Admins to manage all vehicles.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['admin', 'agence']

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.role == 'admin':
            return True
        if request.user.role == 'agence':
            return obj.agence_id == str(request.user.agence_id)
        return False

class IsAdminOrAgency(permissions.BasePermission):
    """
    Allows access to admins or agents, with agents restricted to their own agency.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'agence']

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if request.user.role == 'agence':
            return obj.id == request.user.agence_id
        return False