from rest_framework import serializers
from .models import InterviewSession, InterviewQuestion
from resumes.models import Resume


class InterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewQuestion
        fields = [
            'id',
            'order',
            'question_text',
            'question_type',
            'difficulty',
            'expected_answer_points',
            'candidate_answer',
            'time_taken_seconds',
            'status',
            'answered_at'
        ]
        read_only_fields = ['order', 'question_text', 'question_type', 'difficulty', 'expected_answer_points', 'answered_at']


class InterviewSessionListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(source='questions.count', read_only=True)
    answered_count = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSession
        fields = [
            'id',
            'target_role',
            'interview_type',
            'difficulty',
            'status',
            'total_questions',
            'question_count',
            'answered_count',
            'created_at',
            'started_at',
            'completed_at'
        ]

    def get_answered_count(self, obj):
        return obj.questions.filter(status__in=['answered', 'skipped']).count()


class InterviewSessionDetailSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewSession
        fields = [
            'id',
            'target_role',
            'interview_type',
            'difficulty',
            'status',
            'total_questions',
            'time_limit_per_question',
            'current_question_index',
            'questions',
            'created_at',
            'started_at',
            'completed_at'
        ]


class CreateInterviewSessionSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField(required=False, allow_null=True)
    target_role = serializers.CharField(max_length=150, default='Software Engineer')
    interview_type = serializers.ChoiceField(choices=InterviewSession.INTERVIEW_TYPES, default='technical')
    difficulty = serializers.ChoiceField(choices=InterviewSession.DIFFICULTY_LEVELS, default='medium')
    total_questions = serializers.IntegerField(default=5, min_value=1, max_value=15)
    time_limit_per_question = serializers.IntegerField(default=120, min_value=30, max_value=600)


class SubmitAnswerSerializer(serializers.Serializer):
    candidate_answer = serializers.CharField(required=False, allow_blank=True)
    time_taken_seconds = serializers.IntegerField(default=0, min_value=0)
    status = serializers.ChoiceField(choices=['answered', 'skipped'], default='answered')
