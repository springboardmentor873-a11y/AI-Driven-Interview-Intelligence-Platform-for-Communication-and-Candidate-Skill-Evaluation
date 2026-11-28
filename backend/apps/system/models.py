from django.conf import settings
from django.db import models


class SystemSettings(models.Model):
    """Settings an admin can change without redeploying. There is only ever one row (pk=1).

    A blank or empty value means "use the server default", which comes from the environment (see config/settings).
    Secrets such as the Gemini API key are never stored here: they stay in the environment.
    """

    ai_enabled = models.BooleanField(default=True)  # off = every AI feature uses its rule-based fallback
    gemini_model = models.CharField(max_length=80, blank=True)
    gemini_fallback_model = models.CharField(max_length=80, blank=True)
    gemini_timeout_seconds = models.PositiveSmallIntegerField(null=True, blank=True)
    ai_review_rate_per_hour = models.PositiveSmallIntegerField(null=True, blank=True)  # per user
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        verbose_name_plural = "system settings"

    def save(self, *args, **kwargs):
        self.pk = 1  # a single row
        super().save(*args, **kwargs)

    def __str__(self):
        return "System settings"


class AuditLog(models.Model):
    """What admins did, kept so it can be reviewed later. Written by the server, never through the API."""

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_entries")
    actor_email = models.EmailField(blank=True)  # kept as text so an entry still reads well if the account is deleted
    action = models.CharField(max_length=40, db_index=True)  # for example user.role_changed
    target = models.CharField(max_length=255, blank=True)  # a readable label, for example the email of the user changed
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.action} by {self.actor_email or 'unknown'}"


class AICall(models.Model):
    """One call to the AI service, as the server saw it (see apps/ai/gemini.py). Holds no prompts or answers."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    purpose = models.CharField(max_length=40, blank=True)  # feedback, questions, speech_review, resume_skills, settings_test
    model = models.CharField(max_length=80, blank=True)
    ok = models.BooleanField(default=True)
    attempts = models.PositiveSmallIntegerField(default=1)
    latency_ms = models.PositiveIntegerField(default=0)  # time for the whole call, retries included
    used_fallback = models.BooleanField(default=False)  # it worked, but only on the backup model
    error_kind = models.CharField(max_length=30, blank=True)  # rate_limited, timeout, server_error, rejected, bad_json, other

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.purpose or 'ai'} {'ok' if self.ok else self.error_kind}"
