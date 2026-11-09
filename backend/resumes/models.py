from django.db import models
from django.conf import settings


class Resume(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to='resumes/')
    text = models.TextField(blank=True)
    skills = models.JSONField(default=dict, blank=True)  # filled in Milestone 2
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Resume #{self.id} - {self.user.username}"
