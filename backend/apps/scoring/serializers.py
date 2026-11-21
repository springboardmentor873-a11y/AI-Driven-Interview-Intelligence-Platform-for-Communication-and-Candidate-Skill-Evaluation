from rest_framework import serializers

from .models import Score


class ScoreSerializer(serializers.ModelSerializer):
    """A finished interview's scores. A part is null when it could not be measured."""

    communication = serializers.FloatField(source="communication_score", read_only=True)
    confidence = serializers.FloatField(source="confidence_score", read_only=True)
    technical_relevance = serializers.FloatField(source="technical_relevance_score", read_only=True)
    professionalism = serializers.FloatField(source="professionalism_score", read_only=True)
    overall = serializers.FloatField(source="overall_score", read_only=True)
    rating_label = serializers.CharField(source="get_rating_display", read_only=True)
    weights = serializers.SerializerMethodField()
    complete = serializers.SerializerMethodField()
    missing = serializers.SerializerMethodField()
    counts = serializers.SerializerMethodField()
    per_answer = serializers.SerializerMethodField()

    class Meta:
        model = Score
        fields = (
            "communication", "confidence", "technical_relevance", "professionalism", "overall",
            "rating", "rating_label", "weights", "complete", "missing", "counts", "per_answer", "created_at",
        )
        read_only_fields = fields

    def get_weights(self, obj):
        return obj.WEIGHTS

    def get_complete(self, obj):
        return obj.details.get("complete", False)

    def get_missing(self, obj):
        return obj.details.get("missing", [])

    def get_counts(self, obj):
        d = obj.details
        return {key: d.get(key, 0) for key in ("questions_total", "answered", "skipped", "excluded_no_transcript")}

    def get_per_answer(self, obj):
        return obj.details.get("per_answer", [])
