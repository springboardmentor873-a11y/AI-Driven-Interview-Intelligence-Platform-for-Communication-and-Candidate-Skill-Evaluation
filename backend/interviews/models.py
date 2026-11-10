from django.conf import settings
from django.db import models

CATEGORIES = [('hr', 'HR'), ('technical', 'Technical'), ('behavioral', 'Behavioral'), ('aptitude', 'Aptitude')]
DIFFICULTIES = [('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')]


class InterviewTemplate(models.Model):
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    domain = models.CharField(max_length=100, blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTIES, default='medium')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='templates')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class InterviewSession(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created'
        IN_PROGRESS = 'in_progress'
        COMPLETED = 'completed'
        ASSESSED = 'assessed'
        CANCELLED = 'cancelled'
        ABANDONED = 'abandoned'

    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='interview_sessions')
    template = models.ForeignKey(InterviewTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    category = models.CharField(max_length=20, choices=CATEGORIES, default='technical')
    domain = models.CharField(max_length=100, blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTIES, default='medium')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Session {self.pk} - {self.candidate} - {self.status}'


class InterviewQuestion(models.Model):
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORIES)
    order_no = models.PositiveIntegerField()
    evaluation_rubric = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['order_no']
        unique_together = ('session', 'order_no')


class Answer(models.Model):
    question = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name='answer')
    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answers')
    audio_file = models.FileField(upload_to='private_audio/', null=True, blank=True)
    transcript = models.TextField(blank=True)
    duration_seconds = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class Assessment(models.Model):
    session = models.OneToOneField(InterviewSession, on_delete=models.CASCADE, related_name='assessment')
    communication = models.FloatField(default=0)
    confidence_indicator = models.FloatField(default=0)
    technical_relevance = models.FloatField(default=0)
    professionalism = models.FloatField(default=0)
    overall_score = models.FloatField(default=0)
    feedback = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)