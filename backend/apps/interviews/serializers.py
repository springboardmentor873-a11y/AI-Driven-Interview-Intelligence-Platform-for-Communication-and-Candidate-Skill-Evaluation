from rest_framework import serializers

from apps.resumes.models import Resume

from .models import Answer, Difficulty, InterviewSession, InterviewType, Question

MAX_QUESTIONS = 20
FINISHED_STATUSES = (InterviewSession.Status.COMPLETED, InterviewSession.Status.CANCELLED)


class GenerateQuestionsSerializer(serializers.Serializer):
    interview_type = serializers.ChoiceField(choices=InterviewType.choices)
    difficulty = serializers.ChoiceField(choices=Difficulty.choices, default=Difficulty.MEDIUM)
    domain = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    question_count = serializers.IntegerField(min_value=1, max_value=MAX_QUESTIONS, default=10)
    resume_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_domain(self, value):
        return " ".join(value.split())

    def validate(self, attrs):
        user = self.context["request"].user
        resume_id = attrs.get("resume_id")
        if resume_id:
            resume = Resume.objects.filter(user=user, id=resume_id).first()
            if resume is None:
                raise serializers.ValidationError({"resume_id": "Resume not found."})
        else:  # default to the primary resume; none is fine (generic questions)
            resume = Resume.objects.filter(user=user, is_primary=True).first()
        attrs["resume"] = resume
        return attrs


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ("id", "order", "text", "category", "time_limit_seconds")
        read_only_fields = fields


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ("transcript", "duration_seconds", "submitted_at")
        read_only_fields = fields


class ReviewQuestionSerializer(QuestionSerializer):
    """A question together with the candidate's answer, for finished interviews."""

    answer = serializers.SerializerMethodField()

    class Meta(QuestionSerializer.Meta):
        fields = QuestionSerializer.Meta.fields + ("answer",)
        read_only_fields = fields

    def get_answer(self, obj):
        answer = getattr(obj, "answer", None)
        return AnswerSerializer(answer).data if answer else None


class SessionSerializer(serializers.ModelSerializer):
    """Summary used in the history list and as the detail view.

    Question text stays hidden until the interview is over: during the
    interview the room asks for one question at a time (next-question).
    """

    resume_name = serializers.CharField(source="resume.original_name", default="", read_only=True)
    question_total = serializers.SerializerMethodField()
    answered_count = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = (
            "id", "interview_type", "difficulty", "domain", "status", "question_source",
            "resume", "resume_name", "question_total", "answered_count",
            "created_at", "started_at", "ended_at", "questions",
        )
        read_only_fields = fields

    def get_question_total(self, obj):
        if hasattr(obj, "question_total"):
            return obj.question_total
        return obj.questions.count()

    def get_answered_count(self, obj):
        if hasattr(obj, "answered_total"):
            return obj.answered_total
        return Answer.objects.filter(question__session=obj).count()

    def get_questions(self, obj):
        if not self.context.get("include_questions") or obj.status not in FINISHED_STATUSES:
            return None
        return ReviewQuestionSerializer(obj.questions.select_related("answer"), many=True).data


class CreateSessionSerializer(GenerateQuestionsSerializer):
    """Same options as the question preview; the questions are saved with the session."""


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    transcript = serializers.CharField(required=False, allow_blank=True, max_length=10000, default="")
    duration_seconds = serializers.IntegerField(min_value=0, max_value=3600, default=0)
