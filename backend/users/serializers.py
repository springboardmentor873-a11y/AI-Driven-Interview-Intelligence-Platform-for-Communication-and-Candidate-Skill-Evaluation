from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_role(self, v):
        if v == 'admin':
            raise serializers.ValidationError('Not allowed')
        return v

    def create(self, data):
        return User.objects.create_user(**data)