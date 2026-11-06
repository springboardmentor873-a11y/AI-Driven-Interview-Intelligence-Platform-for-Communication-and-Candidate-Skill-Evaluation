from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "date_joined")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(
        choices=[
            (User.Role.CANDIDATE, "Candidate"),
            (User.Role.RECRUITER, "Recruiter"),
        ],
        default=User.Role.CANDIDATE,
    )

    class Meta:
        model = User
        fields = ("email", "password", "first_name", "last_name", "role")
        extra_kwargs = {"first_name": {"required": True}}

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(
            username=validated_data["email"], password=password, **validated_data
        )


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login with email + password instead of username."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)
        self.fields["email"] = serializers.EmailField()

    def validate(self, attrs):
        user = User.objects.filter(email__iexact=attrs["email"]).first()
        data = super().validate(
            {
                "username": user.get_username() if user else "",
                "password": attrs["password"],
            }
        )
        data["user"] = UserSerializer(self.user).data
        return data
class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name",
            "role", "is_active", "date_joined",
        )
        read_only_fields = ("id", "email", "first_name", "last_name", "date_joined")