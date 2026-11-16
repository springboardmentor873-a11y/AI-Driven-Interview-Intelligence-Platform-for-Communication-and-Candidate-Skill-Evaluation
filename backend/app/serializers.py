from .models import User


def iso(dt):
    return dt.isoformat() if dt else None


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "is_active": u.is_active,
            "auth_provider": u.auth_provider, "has_password": bool(u.hashed_password), "created_at": iso(u.created_at), "last_login": iso(u.last_login)}
