from django.db import models
from django.conf import settings
from resumes.models import Resume


class InterviewSession(models.Model):
    INTERVIEW_TYPES = [
        ('technical', 'Technical Interview'),
        ('hr', 'HR Interview'),
        ('behavioral', 'Behavioral Interview'),
        ('aptitude', 'Aptitude Interview'),
        ('mixed', 'Comprehensive / Mixed'),
    ]

    DIFFICULTY_LEVELS = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    STATUS_CHOICES = [
        ('setup', 'Setup / Ready'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interview_sessions'
    )
    resume = models.ForeignKey(
        Resume,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interviews'
    )
    target_role = models.CharField(max_length=150, default='Software Engineer')
    interview_type = models.CharField(max_length=30, choices=INTERVIEW_TYPES, default='technical')
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_LEVELS, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='setup')
    total_questions = models.PositiveIntegerField(default=5)
    time_limit_per_question = models.PositiveIntegerField(
        default=120,
        help_text="Time limit in seconds per question"
    )
    current_question_index = models.PositiveIntegerField(default=0)
    recording_file = models.FileField(upload_to='interviews/recordings/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Interview #{self.id} ({self.target_role} - {self.interview_type}) - {self.candidate.username}"


class InterviewQuestion(models.Model):
    QUESTION_STATUS = [
        ('unanswered', 'Unanswered'),
        ('answering', 'Currently Answering'),
        ('answered', 'Answered'),
        ('skipped', 'Skipped'),
    ]

    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_text = models.TextField()
    question_type = models.CharField(max_length=30, default='technical')
    difficulty = models.CharField(max_length=20, default='medium')
    order = models.PositiveIntegerField(default=1)
    expected_answer_points = models.JSONField(
        default=list,
        blank=True,
        help_text="Key concepts and rubric points expected in response"
    )

    candidate_answer = models.TextField(blank=True)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=QUESTION_STATUS, default='unanswered')

    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order} for Session #{self.session_id}: {self.question_text[:50]}..."
