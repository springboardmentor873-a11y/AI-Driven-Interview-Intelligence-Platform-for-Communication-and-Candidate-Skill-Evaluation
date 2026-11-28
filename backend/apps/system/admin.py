from django.contrib import admin

from .models import AICall, AuditLog, SystemSettings


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ("__str__", "ai_enabled", "gemini_model", "updated_at", "updated_by")


class ReadOnlyAdmin(admin.ModelAdmin):
    """Logs are history: they can be read here but not changed."""

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "action", "actor_email", "target")
    list_filter = ("action",)


@admin.register(AICall)
class AICallAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "purpose", "model", "ok", "attempts", "latency_ms", "error_kind")
    list_filter = ("ok", "purpose", "error_kind")
