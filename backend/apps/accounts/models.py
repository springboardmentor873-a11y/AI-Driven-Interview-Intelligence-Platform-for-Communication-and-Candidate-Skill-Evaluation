from django.contrib.auth.models import AbstractUser
from django.db import models


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