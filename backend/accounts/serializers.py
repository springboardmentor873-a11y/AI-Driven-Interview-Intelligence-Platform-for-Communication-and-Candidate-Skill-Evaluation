from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')   # NOTE: no role field

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        # role is forced here, whatever the browser sends
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=User.Role.CANDIDATE,
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role')
        read_only_fields = fields