from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class User(AbstractUser):
    ROLES = [
        ('candidate', 'Candidate'),
        ('recruiter', 'Recruiter'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLES, default='candidate')

    def __str__(self):
        return f"{self.username} ({self.role})"


class CandidateProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='candidate_profile'
    )
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)
    target_role = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"CandidateProfile: {self.user.username}"


class RecruiterProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='recruiter_profile'
    )
    company_name = models.CharField(max_length=150, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RecruiterProfile: {self.user.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.role == 'candidate':
            CandidateProfile.objects.get_or_create(user=instance)
        elif instance.role == 'recruiter':
            RecruiterProfile.objects.get_or_create(user=instance)
