from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    role = None

    def has_permission(self, request, _view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role == self.role
        )


class IsCandidate(HasRole):
    role = "CANDIDATE"


class IsRecruiter(HasRole):
    role = "RECRUITER"


class IsPlatformAdmin(HasRole):
    role = "ADMIN"


class IsRecruiterOrAdmin(BasePermission):
    def has_permission(self, request, _view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.role in ("RECRUITER", "ADMIN")
        )
