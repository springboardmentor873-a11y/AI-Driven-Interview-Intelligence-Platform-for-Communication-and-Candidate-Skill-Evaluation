from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import InterviewSession


@receiver(post_delete, sender=InterviewSession)
def delete_recordings(sender, instance, **kwargs):
    """Deleting a session (or its user) must not leave recordings behind on disk."""
    for field in (instance.video_file, instance.audio_file):
        if field:
            field.delete(save=False)
