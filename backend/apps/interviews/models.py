from django.conf import settings
from django.db import models


class InterviewType(models.TextChoices):
    HR = "hr", "HR"
    TECHNICAL = "technical", "Technical"
    BEHAVIORAL = "behavioral", "Behavioral"
    APTITUDE = "aptitude", "Aptitude"


class Difficulty(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class InterviewTemplate(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interview_templates")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    interview_type = models.CharField(max_length=20, choices=InterviewType.choices)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    domain = models.CharField(max_length=100, blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    question_count = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class InterviewSession(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="interview_sessions")
    template = models.ForeignKey(InterviewTemplate, null=True, blank=True, on_delete=models.SET_NULL, related_name="sessions")
    resume = models.ForeignKey("resumes.Resume", null=True, blank=True, on_delete=models.SET_NULL, related_name="sessions")
    interview_type = models.CharField(max_length=20, choices=InterviewType.choices)
    difficulty = models.CharField(max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    domain = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    video_file = models.FileField(upload_to="recordings/video/", null=True, blank=True)
    audio_file = models.FileField(upload_to="recordings/audio/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.interview_type} interview - {self.candidate} ({self.status})"


class Question(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=1)
    time_limit_seconds = models.PositiveIntegerField(default=120)

    class Meta:
        ordering = ["order"]
        unique_together = ("session", "order")

    def __str__(self):
        return f"Q{self.order}: {self.text[:50]}"


class Answer(models.Model):
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name="answer")
    transcript = models.TextField(blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    analysis = models.JSONField(default=dict, blank=True)  # filler words, pace, etc. (Milestone 3)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Answer to Q{self.question.order}"