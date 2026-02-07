from rest_framework import permissions


class IsServer(permissions.BasePermission):
    def has_permission(self, request, view):
        # Assumes Profile is related to User as `user.profile`
        return (
            hasattr(request.user, "profile") and request.user.profile.role == "server"
        )
