import uuid

from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


class User(AbstractUser):
    class Role(models.TextChoices):
        CANDIDATE = "CANDIDATE", "Candidate"
        RECRUITER = "RECRUITER", "Recruiter"
        ADMIN = "ADMIN", "Admin"

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CANDIDATE,
    )

    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username


def resume_upload_path(instance, _filename):
    return f"resumes/{instance.owner_id}/{uuid.uuid4()}.pdf"


class Resume(models.Model):
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="resumes",
    )
    file = models.FileField(
        upload_to=resume_upload_path,
        validators=[FileExtensionValidator(["pdf"])],
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Resume {self.pk} for {self.owner.username}"


@receiver(post_delete, sender=Resume)
def delete_resume_file(sender, instance, **kwargs):
    if instance.file:
        instance.file.delete(save=False)