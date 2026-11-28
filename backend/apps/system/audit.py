from .models import AuditLog


def record(actor, action, target="", details=None):
    """Write one audit entry. `details` must hold plain JSON and never a secret."""
    return AuditLog.objects.create(
        actor=actor if actor and actor.pk else None, actor_email=getattr(actor, "email", "") or "",
        action=action, target=target, details=details or {},
    )
