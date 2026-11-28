"""Reading and changing the AI settings an admin controls.

The effective value of each setting is the admin's override when there is one, otherwise the server default from
the environment. The database is read on every call (a single small query, once per AI call), so a change applies
at once on every server process with no cache to go stale.
"""
from django.conf import settings
from django.utils import timezone

from .models import SystemSettings

# API name -> (model field, kind). "text" and "number" fields reset to the server default when set to blank or null.
FIELDS = {
    "enabled": "ai_enabled",
    "model": "gemini_model",
    "fallback_model": "gemini_fallback_model",
    "timeout_seconds": "gemini_timeout_seconds",
    "review_rate_per_hour": "ai_review_rate_per_hour",
}


def _row():
    return SystemSettings.objects.filter(pk=1).first()


def _defaults():
    return {
        "model": settings.GEMINI_MODEL,
        "fallback_model": getattr(settings, "GEMINI_FALLBACK_MODEL", "") or "",
        "timeout_seconds": int(getattr(settings, "GEMINI_TIMEOUT_SECONDS", 30)),
        "review_rate": settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}).get("ai_review", "30/hour"),
    }


def ai_config():
    """What the AI module should use right now."""
    row, default = _row(), _defaults()
    return {
        "enabled": True if row is None else row.ai_enabled,
        "model": (row and row.gemini_model) or default["model"],
        "fallback_model": (row and row.gemini_fallback_model) or default["fallback_model"],
        "timeout_seconds": (row and row.gemini_timeout_seconds) or default["timeout_seconds"],
    }


def review_rate_override():
    """The admin's AI reviews-per-hour limit for one user, or None to keep the server default."""
    row = _row()
    return row.ai_review_rate_per_hour if row else None


def describe_ai():
    """Everything the admin settings page shows."""
    row, default = _row(), _defaults()
    config = ai_config()
    override = row.ai_review_rate_per_hour if row else None
    return {
        "key_configured": bool(getattr(settings, "GEMINI_API_KEY", "")),  # the key itself is never sent anywhere
        "enabled": config["enabled"],
        "model": {"override": row.gemini_model if row else "", "default": default["model"], "effective": config["model"]},
        "fallback_model": {"override": row.gemini_fallback_model if row else "", "default": default["fallback_model"], "effective": config["fallback_model"]},
        "timeout_seconds": {"override": row.gemini_timeout_seconds if row else None, "default": default["timeout_seconds"], "effective": config["timeout_seconds"]},
        "review_rate_per_hour": {"override": override, "default": default["review_rate"], "effective": f"{override}/hour" if override else default["review_rate"]},
        "updated_at": row.updated_at.isoformat() if row else None,
        "updated_by": ({"id": row.updated_by_id, "email": row.updated_by.email} if row and row.updated_by_id else None),
    }


def update_ai(admin, values):
    """Apply validated changes and return what changed as {name: {"from": old, "to": new}}. Blank or None resets to the default."""
    row = SystemSettings.objects.filter(pk=1).first() or SystemSettings()
    changes = {}
    for name, field in FIELDS.items():
        if name not in values:
            continue
        new = values[name]
        if name != "enabled" and new in ("", None):
            new = "" if field in ("gemini_model", "gemini_fallback_model") else None
        old = getattr(row, field)
        if new != old:
            changes[name] = {"from": old, "to": new}
            setattr(row, field, new)
    if changes:
        row.updated_by = admin
        row.updated_at = timezone.now()
        row.save()
    return changes
