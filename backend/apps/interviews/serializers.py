from rest_framework import serializers

from apps.accounts.models import Resume

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
            "resume",
            "target_role",
            "domain",
            "interview_type",
            "difficulty",
            "status",
            "total_questions",
            "current_question",
            "created_at",
            "started_at",
            "completed_at",
            "generation_source",
            "paused_at",
            "elapsed_seconds",
            "time_limit_seconds",
            "recording",
        ]

        read_only_fields = [
            "id",
            "candidate",
            "resume",
            "target_role",
            "domain",
            "status",
            "current_question",
            "created_at",
            "started_at",
            "completed_at",
            "generation_source",
            "paused_at",
            "elapsed_seconds",
            "time_limit_seconds",
            "recording",
        ]


class InterviewGenerationSerializer(serializers.Serializer):
    ai_consent = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )
    resume = serializers.PrimaryKeyRelatedField(
        queryset=Resume.objects.all(),
        required=False,
        allow_null=True,
    )
    target_role = serializers.CharField(max_length=120, default="General")
    domain = serializers.CharField(
        max_length=60,
        required=False,
        default="",
        allow_blank=True,
    )
    time_limit_seconds = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=60,
        max_value=7200,
        default=None,
    )
    interview_type = serializers.ChoiceField(
        choices=Interview.InterviewType.choices,
    )
    difficulty = serializers.ChoiceField(
        choices=Interview.Difficulty.choices,
        default=Interview.Difficulty.MEDIUM,
    )
    total_questions = serializers.IntegerField(
        default=5,
        min_value=1,
        max_value=10,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["resume"].queryset = Resume.objects.filter(
                owner=request.user
            )


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = [
            "id",
            "question",
            "answer_text",
            "submitted_at",
            "evaluation",
            "evaluation_source",
        ]

        read_only_fields = [
            "id",
            "question",
            "submitted_at",
            "evaluation",
            "evaluation_source",
        ]

    def validate_answer_text(self, value):
        answer = value.strip()
        if not answer:
            raise serializers.ValidationError(
                "Enter an answer before submitting."
            )
        return answer


class QuestionSerializer(serializers.ModelSerializer):
    answer = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "interview",
            "question_text",
            "category",
            "topic",
            "question_style",
            "difficulty",
            "question_type",
            "expected_criteria",
            "order",
            "created_at",
            "answer",
        ]

        read_only_fields = [
            "id",
            "interview",
            "question_style",
            "created_at",
            "answer",
        ]

    def get_answer(self, question):
        if not hasattr(question, "answer"):
            return None
        return AnswerSerializer(question.answer).data