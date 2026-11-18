from rest_framework import serializers

from .models import Resume
from .skill_extract import analyze_resume
from .text_extract import extract_text

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_RESUMES_PER_USER = 5


class ResumeSerializer(serializers.ModelSerializer):
    size = serializers.SerializerMethodField()

    class Meta:
        model = Resume
        fields = (
            "id", "original_name", "is_primary", "uploaded_at", "size",
            "skills", "technologies", "experience", "education", "summary",
        )
        read_only_fields = fields

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
        # Read the saved PDF once so later steps (skill extraction, question
        # generation) can work from text. Failure leaves it blank, not an error.
        with resume.file.open("rb") as stored:
            resume.extracted_text = extract_text(stored)
        update_fields = ["extracted_text"]
        if resume.extracted_text:
            # Fill skills, technologies, experience, education and summary.
            # analyze_resume never raises, so a failure cannot block the upload.
            for field, value in analyze_resume(resume.extracted_text).items():
                setattr(resume, field, value)
            update_fields += ["skills", "technologies", "experience", "education", "summary"]
        resume.save(update_fields=update_fields)
        return resume