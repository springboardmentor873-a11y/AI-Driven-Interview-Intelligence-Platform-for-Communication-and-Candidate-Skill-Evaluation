from django.db import models


class Score(models.Model):
    class Rating(models.TextChoices):
        EXCELLENT = "excellent", "Excellent"
        GOOD = "good", "Good"
        AVERAGE = "average", "Average"
        NEEDS_IMPROVEMENT = "needs_improvement", "Needs Improvement"
        POOR = "poor", "Poor"

    session = models.OneToOneField("interviews.InterviewSession", on_delete=models.CASCADE, related_name="score")
    communication_score = models.FloatField(null=True, blank=True, default=None)
    confidence_score = models.FloatField(null=True, blank=True, default=None)
    technical_relevance_score = models.FloatField(null=True, blank=True, default=None)
    professionalism_score = models.FloatField(null=True, blank=True, default=None)
    overall_score = models.FloatField(null=True, blank=True, default=None)
    rating = models.CharField(max_length=20, choices=Rating.choices, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Share of the overall score for each part (the SRS formula)
    WEIGHTS = {"communication": 0.30, "confidence": 0.25, "technical_relevance": 0.30, "professionalism": 0.15}

    @classmethod
    def combine(cls, parts):
        """Overall score and rating from the four parts (0-100 each, or None if a part could not be measured).

        Parts that are None are left out and the rest are rescaled, so one missing part does not drag the
        overall score towards zero. Returns (None, "") when no part is available.
        """
        present = {name: value for name, value in parts.items() if value is not None}
        total = sum(cls.WEIGHTS[name] for name in present)
        if not total:
            return None, ""
        overall = round(sum(value * cls.WEIGHTS[name] for name, value in present.items()) / total, 1)
        if overall >= 90:
            rating = cls.Rating.EXCELLENT
        elif overall >= 75:
            rating = cls.Rating.GOOD
        elif overall >= 60:
            rating = cls.Rating.AVERAGE
        elif overall >= 40:
            rating = cls.Rating.NEEDS_IMPROVEMENT
        else:
            rating = cls.Rating.POOR
        return overall, rating

    def calculate(self):
        self.overall_score, self.rating = self.combine({
            "communication": self.communication_score,
            "confidence": self.confidence_score,
            "technical_relevance": self.technical_relevance_score,
            "professionalism": self.professionalism_score,
        })
        return self.overall_score

    def __str__(self):
        return f"Score {self.overall_score} ({self.rating})"


class Feedback(models.Model):
    class Source(models.TextChoices):
        AI = "ai", "AI"
        BASIC = "basic", "Basic"  # written from the numbers by rules, because the AI was not available

    session = models.OneToOneField("interviews.InterviewSession", on_delete=models.CASCADE, related_name="feedback")
    summary = models.TextField(blank=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.AI)
    based_on_overall = models.FloatField(null=True, blank=True)  # the overall score this was written for, to spot stale feedback
    strengths = models.JSONField(default=list, blank=True)
    weaknesses = models.JSONField(default=list, blank=True)
    suggestions = models.JSONField(default=list, blank=True)
    practice_recommendations = models.JSONField(default=list, blank=True)
    learning_resources = models.JSONField(default=list, blank=True)  # [{title, type, why, search}], no links: see feedback.py
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for session {self.session_id}"