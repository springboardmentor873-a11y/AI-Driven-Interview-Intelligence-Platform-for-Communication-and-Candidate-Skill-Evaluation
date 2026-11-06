from django.conf import settings
from django.db import models


class Interview(models.Model):
    class InterviewType(models.TextChoices):
        TECHNICAL = "TECHNICAL", "Technical"
        HR = "HR", "HR"
        BEHAVIORAL = "BEHAVIORAL", "Behavioral"
        APTITUDE = "APTITUDE", "Aptitude"

    class Difficulty(models.TextChoices):
        EASY = "EASY", "Easy"
        MEDIUM = "MEDIUM", "Medium"
        HARD = "HARD", "Hard"

    class Status(models.TextChoices):
        CREATED = "CREATED", "Created"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interviews",
    )

    interview_type = models.CharField(
        max_length=20,
        choices=InterviewType.choices,
    )

    difficulty = models.CharField(
        max_length=10,
        choices=Difficulty.choices,
        default=Difficulty.MEDIUM,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.CREATED,
    )

    total_questions = models.PositiveIntegerField(default=5)

    current_question = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return (
            f"{self.candidate.username} - "
            f"{self.get_interview_type_display()}"
        )


class Question(models.Model):
    interview = models.ForeignKey(
        Interview,
        on_delete=models.CASCADE,
        related_name="questions",
    )

    question_text = models.TextField()

    category = models.CharField(
        max_length=100,
        blank=True,
    )

    order = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        unique_together = ["interview", "order"]

    def __str__(self):
        return f"Question {self.order}: {self.question_text[:50]}"


class Answer(models.Model):
    question = models.OneToOneField(
        Question,
        on_delete=models.CASCADE,
        related_name="answer",
    )

    answer_text = models.TextField(blank=True)

    submitted_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"Answer for Question {self.question.order}"