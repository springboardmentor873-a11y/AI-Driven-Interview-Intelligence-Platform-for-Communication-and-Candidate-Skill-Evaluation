from django.contrib.auth import get_user_model
from rest_framework import serializers
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from .models import Resume

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")

        return User.objects.create_user(
            password=password,
            **validated_data,
        )


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
        ]

        read_only_fields = ["id", "username", "email", "role"]


class ResumeSerializer(serializers.ModelSerializer):
    max_file_size = 10 * 1024 * 1024

    class Meta:
        model = Resume
        fields = [
            "id",
            "file",
            "uploaded_at",
            "extracted_skills",
            "extracted_qualifications",
            "extracted_education",
            "extracted_technologies",
            "extracted_certifications",
            "extracted_experience",
            "extracted_projects",
            "extracted_candidate_name",
            "extracted_email",
            "extracted_phone",
            "extracted_summary",
            "skills_extracted_at",
            "extraction_source",
        ]
        read_only_fields = [
            "id",
            "uploaded_at",
            "extracted_skills",
            "extracted_qualifications",
            "extracted_education",
            "extracted_technologies",
            "extracted_certifications",
            "extracted_experience",
            "extracted_projects",
            "extracted_candidate_name",
            "extracted_email",
            "extracted_phone",
            "extracted_summary",
            "skills_extracted_at",
            "extraction_source",
        ]

    def validate_file(self, value):
        if value.size > self.max_file_size:
            raise serializers.ValidationError(
                "Resume files must be 10 MB or smaller."
            )

        header = value.read(1024)
        value.seek(0)
        if not header.startswith(b"%PDF-"):
            raise serializers.ValidationError(
                "The uploaded file must be a valid PDF."
            )

        try:
            page_count = len(PdfReader(value).pages)
        except (PdfReadError, OSError, ValueError) as exc:
            value.seek(0)
            raise serializers.ValidationError(
                "The uploaded file must be a readable PDF."
            ) from exc
        finally:
            value.seek(0)
        if page_count == 0:
            raise serializers.ValidationError(
                "The uploaded PDF must contain at least one page."
            )

        return value