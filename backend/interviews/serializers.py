from django.conf import settings
from rest_framework import serializers

from resumes.models import Resume
from .lifecycle import active_question, question_seconds_left, question_status
from .models import CATEGORIES, DIFFICULTIES, InterviewQuestion, InterviewSession

MAX_AUDIO_SIZE = 10 * 1024 * 1024   # 10 MB
MAX_TEXT_LENGTH = 10000


class InterviewCreateSerializer(serializers.Serializer):
    """Checks what the candidate chose on the 'new interview' page."""
    category = serializers.ChoiceField(choices=[c for c, _ in CATEGORIES])
    domain = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    difficulty = serializers.ChoiceField(choices=[d for d, _ in DIFFICULTIES], default='medium')
    num_questions = serializers.IntegerField(min_value=3, max_value=10, default=5)
    resume = serializers.PrimaryKeyRelatedField(queryset=Resume.objects.none(), required=False, allow_null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request is not None:
            # a candidate can only pick their OWN resume
            self.fields['resume'].queryset = Resume.objects.filter(owner=request.user)


class QuestionSerializer(serializers.ModelSerializer):
    """A question as the browser sees it. The marking rubric is NOT included."""
    answered = serializers.SerializerMethodField()
    answer_text = serializers.SerializerMethodField()
    has_audio = serializers.SerializerMethodField()
    answer_duration_seconds = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    seconds_left = serializers.SerializerMethodField()

    class Meta:
        model = InterviewQuestion
        fields = (
            'id', 'order_no', 'question_text', 'category', 'answered', 'answer_text', 'has_audio',
            'answer_duration_seconds', 'status', 'seconds_left',
        )
        read_only_fields = fields

    def _answer(self, obj):
        return getattr(obj, 'answer', None)

    def get_answered(self, obj):
        return self._answer(obj) is not None

    def get_answer_text(self, obj):
        answer = self._answer(obj)
        return answer.text_answer if answer else ''

    def get_has_audio(self, obj):
        answer = self._answer(obj)
        return bool(answer and answer.audio_file)

    def get_answer_duration_seconds(self, obj):
        # How long the candidate actually spent on this question, for the summary screen.
        answer = self._answer(obj)
        return answer.duration_seconds if answer else None

    def get_status(self, obj):
        return question_status(obj)

    def get_seconds_left(self, obj):
        return question_seconds_left(obj)


class InterviewListSerializer(serializers.ModelSerializer):
    answered_count = serializers.IntegerField(read_only=True)
    resume_name = serializers.CharField(source='resume.original_name', read_only=True, default='')
    question_seconds = serializers.SerializerMethodField()
    active_question_id = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = (
            'id', 'category', 'domain', 'difficulty', 'status', 'num_questions', 'time_limit_minutes',
            'question_source', 'resume', 'resume_name', 'answered_count',
            'question_seconds', 'active_question_id',
            'started_at', 'ended_at', 'created_at',
        )
        read_only_fields = fields

    def get_question_seconds(self, obj):
        return settings.INTERVIEW_QUESTION_SECONDS

    def get_active_question_id(self, obj):
        if obj.status != InterviewSession.Status.IN_PROGRESS:
            return None
        question = active_question(obj)
        return question.pk if question else None


class InterviewDetailSerializer(InterviewListSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    answered_count = serializers.SerializerMethodField()

    class Meta(InterviewListSerializer.Meta):
        fields = InterviewListSerializer.Meta.fields + ('questions',)
        read_only_fields = fields

    def get_answered_count(self, obj):
        return sum(1 for q in obj.questions.all() if getattr(q, 'answer', None) is not None)


# Start of a file for each audio format a browser may record.
def _looks_like_audio(header):
    return (
        header.startswith(b'\x1a\x45\xdf\xa3')      # webm / matroska
        or header.startswith(b'OggS')                # ogg
        or header.startswith(b'RIFF')                # wav
        or header.startswith(b'ID3')                 # mp3
        or header.startswith(b'fLaC')                # flac
        or header[4:8] == b'ftyp'                    # mp4 / m4a
        or header[:2] in (b'\xff\xfb', b'\xff\xf3', b'\xff\xf2')   # mp3 without tag
    )


class AnswerInputSerializer(serializers.Serializer):
    """duration_seconds is NOT accepted here any more - the server works it out
    from the question's own started_at, so the browser's clock cannot be trusted
    or spoofed for it."""
    question_id = serializers.IntegerField()
    text_answer = serializers.CharField(max_length=MAX_TEXT_LENGTH, required=False, allow_blank=True, default='')
    audio_file = serializers.FileField(required=False, allow_null=True)

    def validate_audio_file(self, f):
        if f is None:
            return f
        if f.size > MAX_AUDIO_SIZE:
            raise serializers.ValidationError('Audio is larger than 10 MB.')
        content_type = (f.content_type or '').split(';')[0].strip().lower()
        if not (content_type.startswith('audio/') or content_type == 'video/webm'):
            raise serializers.ValidationError('Only audio recordings are allowed.')
        header = f.read(12)
        f.seek(0)
        if not _looks_like_audio(header):
            raise serializers.ValidationError('This file is not a real audio recording.')
        return f

    def validate(self, data):
        if not data.get('text_answer', '').strip() and not data.get('audio_file'):
            raise serializers.ValidationError('Write an answer or record one.')
        return data
