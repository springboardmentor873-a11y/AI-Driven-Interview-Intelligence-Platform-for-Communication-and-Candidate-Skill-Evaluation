from rest_framework import serializers

from apps.resumes.models import Resume

from .models import Difficulty, InterviewType

MAX_QUESTIONS = 20


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
