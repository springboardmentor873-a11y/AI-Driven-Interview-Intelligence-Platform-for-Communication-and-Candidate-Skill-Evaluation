import uuid

from django.conf import settings
from django.db import models


def resume_path(instance, filename):
    # server-generated name; never trust the uploaded filename
    return f'private_resumes/{uuid.uuid4().hex}.pdf'


class Resume(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resumes')
    file = models.FileField(upload_to=resume_path)
    original_name = models.CharField(max_length=255, blank=True)
    extracted_text = models.TextField(blank=True)
    parsed_data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, default='uploaded')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.original_name} ({self.owner})'