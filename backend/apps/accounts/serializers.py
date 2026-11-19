from django.contrib.auth import get_user_model
from rest_framework import serializers

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
            "extracted_experience",
            "extracted_projects",
            "skills_extracted_at",
            "extraction_source",
        ]
        read_only_fields = [
            "id",
            "uploaded_at",
            "extracted_skills",
            "extracted_qualifications",
            "extracted_experience",
            "extracted_projects",
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
        if b"%PDF-" not in header:
            raise serializers.ValidationError(
                "The uploaded file must be a valid PDF."
            )

        return value