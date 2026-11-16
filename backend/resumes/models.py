import os
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


def validate_pdf_file(value):
    ext = os.path.splitext(value.name)[1]
    if ext.lower() != '.pdf':
        raise ValidationError('Only PDF files (.pdf) are allowed.')
    # Limit to 5MB (5 * 1024 * 1024 bytes)
    max_size = 5 * 1024 * 1024
    if value.size > max_size:
        raise ValidationError('File size must not exceed 5 MB.')


class Resume(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resumes'
    )
    file = models.FileField(
        upload_to='resumes/',
        validators=[validate_pdf_file]
    )
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    text = models.TextField(blank=True)
    skills = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Resume #{self.id} ({self.file_name or 'unnamed'}) - {self.user.username}"

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = os.path.basename(self.file.name)
        if self.file and not self.file_size:
            try:
                self.file_size = self.file.size
            except Exception:
                pass
        super().save(*args, **kwargs)
