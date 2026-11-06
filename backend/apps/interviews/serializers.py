from rest_framework import serializers

from .models import Answer, Interview, Question


class InterviewSerializer(serializers.ModelSerializer):
    candidate_username = serializers.CharField(
        source="candidate.username",
        read_only=True,
    )

    class Meta:
        model = Interview
        fields = [
            "id",
            "candidate",
            "candidate_username",
            "interview_type",
            "difficulty",
            "status",
            "total_questions",
            "current_question",
            "created_at",
            "started_at",
            "completed_at",
        ]

        read_only_fields = [
            "id",
            "candidate",
            "status",
            "current_question",
            "created_at",
            "started_at",
            "completed_at",
        ]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "interview",
            "question_text",
            "category",
            "order",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "interview",
            "created_at",
        ]

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = [
            "id",
            "question",
            "answer_text",
            "submitted_at",
        ]

        read_only_fields = [
            "id",
            "question",
            "submitted_at",
        ]