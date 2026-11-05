from django.db import models


class Score(models.Model):
    class Rating(models.TextChoices):
        EXCELLENT = "excellent", "Excellent"
        GOOD = "good", "Good"
        AVERAGE = "average", "Average"
        NEEDS_IMPROVEMENT = "needs_improvement", "Needs Improvement"
        POOR = "poor", "Poor"

    session = models.OneToOneField("interviews.InterviewSession", on_delete=models.CASCADE, related_name="score")
    communication_score = models.FloatField(default=0)
    confidence_score = models.FloatField(default=0)
    technical_relevance_score = models.FloatField(default=0)
    professionalism_score = models.FloatField(default=0)
    overall_score = models.FloatField(default=0)
    rating = models.CharField(max_length=20, choices=Rating.choices, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def calculate(self):
        self.overall_score = round(
            self.communication_score * 0.30
            + self.confidence_score * 0.25
            + self.technical_relevance_score * 0.30
            + self.professionalism_score * 0.15,
            2,
        )
        s = self.overall_score
        if s >= 90:
            self.rating = self.Rating.EXCELLENT
        elif s >= 75:
            self.rating = self.Rating.GOOD
        elif s >= 60:
            self.rating = self.Rating.AVERAGE
        elif s >= 40:
            self.rating = self.Rating.NEEDS_IMPROVEMENT
        else:
            self.rating = self.Rating.POOR
        return self.overall_score

    def __str__(self):
        return f"Score {self.overall_score} ({self.rating})"


class Feedback(models.Model):
    session = models.OneToOneField("interviews.InterviewSession", on_delete=models.CASCADE, related_name="feedback")
    strengths = models.JSONField(default=list, blank=True)
    weaknesses = models.JSONField(default=list, blank=True)
    suggestions = models.JSONField(default=list, blank=True)
    practice_recommendations = models.JSONField(default=list, blank=True)
    learning_resources = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for session {self.session_id}"