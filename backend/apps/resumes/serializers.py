from rest_framework import serializers

from .models import Resume
from .parsing import parse_resume

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_RESUMES_PER_USER = 5


class ResumeSerializer(serializers.ModelSerializer):
    size = serializers.SerializerMethodField()
    has_text = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = (
            "id", "original_name", "is_primary", "uploaded_at", "size",
            "skills", "technologies", "experience", "education", "summary",
            "parse_source", "has_text",
        )
        read_only_fields = fields

    def get_has_text(self, obj):
        return bool(obj.extracted_text)

    def get_size(self, obj):
        try:
            return obj.file.size
        except (FileNotFoundError, ValueError, OSError):
            return 0


class ResumeUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ("file",)

    def validate_file(self, f):
        if not f.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Only PDF files are allowed.")
        if f.size > MAX_FILE_SIZE:
            raise serializers.ValidationError("File is too large. The limit is 5 MB.")
        header = f.read(5)
        f.seek(0)
        if header != b"%PDF-":
            raise serializers.ValidationError("This file is not a valid PDF.")
        return f

    def validate(self, attrs):
        user = self.context["request"].user
        if Resume.objects.filter(user=user).count() >= MAX_RESUMES_PER_USER:
            raise serializers.ValidationError(
                f"You can keep at most {MAX_RESUMES_PER_USER} resumes. Delete one first."
            )
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        f = validated_data["file"]
        is_first = not Resume.objects.filter(user=user).exists()
        resume = Resume.objects.create(
            user=user,
            file=f,
            original_name=f.name[:255],
            is_primary=is_first,
        )
        # Read the PDF and fill skills, experience, etc. Never raises, so a
        # parsing problem cannot block the upload.
        return parse_resume(resume)
