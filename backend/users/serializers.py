from rest_framework import serializers
from .models import User, CandidateProfile, RecruiterProfile


class CandidateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateProfile
        fields = ['id', 'phone', 'bio', 'target_role', 'created_at']
        read_only_fields = ['id', 'created_at']


class RecruiterProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecruiterProfile
        fields = ['id', 'company_name', 'designation', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=6
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_role(self, v):
        if v == 'admin':
            raise serializers.ValidationError('Admin registration is not allowed.')
        if v not in ('candidate', 'recruiter'):
            raise serializers.ValidationError('Role must be either candidate or recruiter.')
        return v

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    candidate_profile = CandidateProfileSerializer(required=False)
    recruiter_profile = RecruiterProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'candidate_profile',
            'recruiter_profile'
        ]
        read_only_fields = ['id', 'role']

    def update(self, instance, validated_data):
        cand_data = validated_data.pop('candidate_profile', None)
        rec_data = validated_data.pop('recruiter_profile', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if cand_data and hasattr(instance, 'candidate_profile'):
            for attr, value in cand_data.items():
                setattr(instance.candidate_profile, attr, value)
            instance.candidate_profile.save()

        if rec_data and hasattr(instance, 'recruiter_profile'):
            for attr, value in rec_data.items():
                setattr(instance.recruiter_profile, attr, value)
            instance.recruiter_profile.save()

        return instance
