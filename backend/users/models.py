from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLES = [('candidate', 'Candidate'), ('recruiter', 'Recruiter'), ('admin', 'Admin')]
    role = models.CharField(max_length=20, choices=ROLES, default='candidate')

    def __str__(self):
        return f"{self.username} ({self.role})"