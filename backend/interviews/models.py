import uuid

from django.conf import settings
from django.db import models

CATEGORIES = [('hr', 'HR'), ('technical', 'Technical'), ('behavioral', 'Behavioral'), ('aptitude', 'Aptitude')]
DIFFICULTIES = [('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')]
QUESTION_SOURCES = [('ai', 'AI'), ('bank', 'Question bank')]


def answer_audio_path(instance, filename):
    # server-generated name; never trust the uploaded filename
    return f'private_audio/{uuid.uuid4().hex}.webm'


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
    resume = models.ForeignKey(
        'resumes.Resume', null=True, blank=True, on_delete=models.SET_NULL, related_name='interview_sessions'
    )
    num_questions = models.PositiveSmallIntegerField(default=5)
    # Informational only since Stage 3: num_questions x the per-question time.
    # Kept so older interviews (created before per-question timing) still show a number.
    time_limit_minutes = models.PositiveSmallIntegerField(default=15)
    question_source = models.CharField(max_length=10, choices=QUESTION_SOURCES, default='bank')
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
    # When the candidate was allowed to start answering this question (null = not started yet).
    started_at = models.DateTimeField(null=True, blank=True)
    # Set when the candidate presses Skip, or when the time runs out unanswered.
    skipped = models.BooleanField(default=False)

    class Meta:
        ordering = ['order_no']
        unique_together = ('session', 'order_no')


class Answer(models.Model):
    question = models.OneToOneField(InterviewQuestion, on_delete=models.CASCADE, related_name='answer')
    candidate = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='answers')
    audio_file = models.FileField(upload_to=answer_audio_path, null=True, blank=True)
    text_answer = models.TextField(blank=True)
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