from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


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
        PAUSED = "PAUSED", "Paused"
        COMPLETED = "COMPLETED", "Completed"
        ABANDONED = "ABANDONED", "Abandoned"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interviews",
    )

    resume = models.ForeignKey(
        "accounts.Resume",
        on_delete=models.SET_NULL,
        related_name="interviews",
        null=True,
        blank=True,
    )

    target_role = models.CharField(max_length=120, default="General")

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

    generation_source = models.CharField(max_length=16, blank=True, default="")

    domain = models.CharField(max_length=60, blank=True, default="")

    time_limit_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optional time limit in seconds. Null means no limit.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    paused_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    elapsed_seconds = models.PositiveIntegerField(default=0)

    recording = models.FileField(
        upload_to="interviews/",
        null=True,
        blank=True,
    )

    def __str__(self):
        return (
            f"{self.candidate.username} - "
            f"{self.get_interview_type_display()}"
        )


class Question(models.Model):
    class Style(models.TextChoices):
        CONCEPTUAL = "CONCEPTUAL", "Conceptual"
        PRACTICAL = "PRACTICAL", "Practical"
        SCENARIO = "SCENARIO", "Scenario"
        PROBLEM_SOLVING = "PROBLEM_SOLVING", "Problem Solving"

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

    topic = models.CharField(max_length=100, blank=True)

    question_style = models.CharField(
        max_length=20,
        choices=Style.choices,
        default=Style.CONCEPTUAL,
    )

    relevance_explanation = models.TextField(blank=True, default="")

    difficulty = models.CharField(
        max_length=10,
        choices=Interview.Difficulty.choices,
        default=Interview.Difficulty.MEDIUM,
    )

    question_type = models.CharField(
        max_length=20,
        choices=[
            ("TECHNICAL", "Technical"),
            ("PRACTICAL", "Practical"),
        ],
        default="TECHNICAL",
    )

    expected_criteria = models.JSONField(blank=True, default=list)

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

    evaluation = models.JSONField(blank=True, null=True)

    evaluation_source = models.CharField(max_length=16, blank=True, default="")

    submitted_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"Answer for Question {self.question.order}"


@receiver(post_delete, sender=Interview)
def delete_interview_recording(sender, instance, **kwargs):
    if instance.recording:
        instance.recording.delete(save=False)