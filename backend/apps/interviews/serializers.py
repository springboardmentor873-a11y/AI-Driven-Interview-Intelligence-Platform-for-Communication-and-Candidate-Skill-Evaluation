from rest_framework import serializers

from apps.resumes.models import Resume

from . import speech_analysis
from .models import Answer, Difficulty, InterviewSession, InterviewTemplate, InterviewType, Question

MAX_QUESTIONS = 20
MIN_SECONDS_PER_QUESTION = 30
MAX_SECONDS_PER_QUESTION = 600
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
        attrs["template"] = None
        return attrs


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ("id", "order", "text", "category", "time_limit_seconds")
        read_only_fields = fields


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ("transcript", "duration_seconds", "analysis", "submitted_at")
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
    template_title = serializers.CharField(source="template.title", default="", read_only=True)
    question_total = serializers.SerializerMethodField()
    answered_count = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()
    has_video = serializers.SerializerMethodField()
    has_audio = serializers.SerializerMethodField()
    speech_summary = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = (
            "id", "interview_type", "difficulty", "domain", "status", "question_source",
            "resume", "resume_name", "template", "template_title", "question_total", "answered_count",
            "created_at", "started_at", "ended_at", "has_video", "has_audio", "questions", "speech_summary",
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

    def get_has_video(self, obj):
        return bool(obj.video_file)

    def get_has_audio(self, obj):
        return bool(obj.audio_file)

    def get_speech_summary(self, obj):
        if not self.context.get("include_questions") or obj.status not in FINISHED_STATUSES:
            return None
        analyses = Answer.objects.filter(question__session=obj).values_list("analysis", flat=True)
        return speech_analysis.summarize(analyses)

    def get_questions(self, obj):
        if not self.context.get("include_questions") or obj.status not in FINISHED_STATUSES:
            return None
        return ReviewQuestionSerializer(obj.questions.select_related("answer"), many=True).data


class CreateSessionSerializer(GenerateQuestionsSerializer):
    """Same options as the question preview, or just a template_id.

    With a template the recruiter's settings win over anything else in the
    request; the resume is still the candidate's own.
    """

    interview_type = serializers.ChoiceField(choices=InterviewType.choices, required=False)
    template_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        template_id = attrs.get("template_id")
        if template_id:
            template = InterviewTemplate.objects.filter(id=template_id, is_published=True).first()
            if template is None:
                raise serializers.ValidationError({"template_id": "Template not found."})
            attrs.update(
                interview_type=template.interview_type, difficulty=template.difficulty,
                domain=template.domain, question_count=template.question_count,
            )
        elif not attrs.get("interview_type"):
            raise serializers.ValidationError({"interview_type": "This field is required."})
        attrs = super().validate(attrs)
        attrs["template"] = template if template_id else None
        return attrs


class AttentionSerializer(serializers.Serializer):
    """Eye-contact summary measured in the browser for one answer."""

    tracked_seconds = serializers.FloatField(min_value=0, max_value=3700)
    face_visible_pct = serializers.FloatField(min_value=0, max_value=100)
    eye_contact_pct = serializers.FloatField(min_value=0, max_value=100)
    look_away_events = serializers.IntegerField(min_value=0, max_value=1000)
    longest_look_away_seconds = serializers.FloatField(min_value=0, max_value=3700)

    def validate(self, attrs):
        # Eye contact needs a visible face, and nothing can last longer than the measurement
        if attrs["eye_contact_pct"] > attrs["face_visible_pct"] + 0.5:
            raise serializers.ValidationError("Eye contact cannot be more than the time the face was visible.")
        if attrs["longest_look_away_seconds"] > attrs["tracked_seconds"] + 0.5:
            raise serializers.ValidationError("A look away cannot be longer than the measured time.")
        return attrs


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    transcript = serializers.CharField(required=False, allow_blank=True, max_length=10000, default="")
    duration_seconds = serializers.IntegerField(min_value=0, max_value=3600, default=0)
    # "speech" = recognised from the microphone in the browser, "typed" = the candidate typed it
    transcript_source = serializers.ChoiceField(choices=("speech", "typed"), default="speech")
    # The browser's average confidence (0 to 1) for the words it recognised, when it reports one
    speech_confidence = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=1, default=None)

    attention = AttentionSerializer(required=False, allow_null=True, default=None)

    def validate_transcript(self, value):
        return " ".join(value.split())  # one clean line of text, whatever the browser sent

    def validate(self, attrs):
        attention = attrs.get("attention")
        # The measurement is for this answer, so it cannot be much longer than the time spent on it
        if attention and attention["tracked_seconds"] > attrs.get("duration_seconds", 0) + 5:
            raise serializers.ValidationError({"attention": "The eye-contact measurement is longer than the answer."})
        return attrs


class TemplateSerializer(serializers.ModelSerializer):
    """What a recruiter sees and edits."""

    session_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = InterviewTemplate
        fields = (
            "id", "title", "description", "interview_type", "difficulty", "domain",
            "duration_minutes", "question_count", "is_published", "session_count", "created_at",
        )
        read_only_fields = ("id", "session_count", "created_at")
        extra_kwargs = {
            "title": {"max_length": 200},
            "description": {"max_length": 2000},
            "duration_minutes": {"min_value": 5, "max_value": 180},
            "question_count": {"min_value": 1, "max_value": MAX_QUESTIONS},
        }

    def validate_title(self, value):
        value = " ".join(value.split())
        if not value:
            raise serializers.ValidationError("Give the template a title.")
        return value

    def validate_domain(self, value):
        return " ".join(value.split())

    def validate(self, attrs):
        # Each question needs at least 30 seconds, otherwise the interview cannot fit its duration
        minutes = attrs.get("duration_minutes", getattr(self.instance, "duration_minutes", 30))
        count = attrs.get("question_count", getattr(self.instance, "question_count", 10))
        if minutes * 60 < count * MIN_SECONDS_PER_QUESTION:
            raise serializers.ValidationError(
                {"duration_minutes": f"{count} questions need at least "
                                     f"{-(-count * MIN_SECONDS_PER_QUESTION // 60)} minutes."}
            )
        return attrs


class CandidateTemplateSerializer(serializers.ModelSerializer):
    """What a candidate sees when choosing a template: no recruiter statistics."""

    recruiter_name = serializers.SerializerMethodField()

    class Meta:
        model = InterviewTemplate
        fields = (
            "id", "title", "description", "interview_type", "difficulty", "domain",
            "duration_minutes", "question_count", "recruiter_name",
        )
        read_only_fields = fields

    def get_recruiter_name(self, obj):
        return obj.created_by.get_full_name().strip() or "Recruiter"
