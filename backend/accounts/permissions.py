from rest_framework.permissions import BasePermission


class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == 'candidate')


class IsRecruiter(BasePermission):
    """Recruiters and admins."""
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role in ('recruiter', 'admin'))


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role == 'admin')