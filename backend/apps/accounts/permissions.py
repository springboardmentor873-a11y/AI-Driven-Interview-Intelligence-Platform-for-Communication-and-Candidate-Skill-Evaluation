from rest_framework.permissions import BasePermission


class IsRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in self.allowed_roles
        )


class IsCandidate(IsRole):
    allowed_roles = ("candidate",)


class IsRecruiter(IsRole):
    allowed_roles = ("recruiter",)


class IsAdmin(IsRole):
    allowed_roles = ("admin",)


class IsRecruiterOrAdmin(IsRole):
    allowed_roles = ("recruiter", "admin")