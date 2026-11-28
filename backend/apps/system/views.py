import re

from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin
from apps.ai import gemini

from . import audit, store

MODEL_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$")


class AISettingsSerializer(serializers.Serializer):
    """Fields left out are unchanged. A blank text or a null number puts the server default back."""

    enabled = serializers.BooleanField(required=False)
    model = serializers.CharField(required=False, allow_blank=True, max_length=80)
    fallback_model = serializers.CharField(required=False, allow_blank=True, max_length=80)
    timeout_seconds = serializers.IntegerField(required=False, allow_null=True, min_value=5, max_value=120)
    review_rate_per_hour = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=1000)

    def _model_name(self, value):
        value = value.strip()
        if value and not MODEL_NAME.match(value):
            raise serializers.ValidationError("Use only letters, numbers, dots, dashes, colons and underscores, like gemini-2.5-flash.")
        return value

    validate_model = _model_name
    validate_fallback_model = _model_name


class AITestThrottle(UserRateThrottle):
    """Each test makes a real (paid) AI call, so an admin gets a few per hour."""

    scope = "ai_settings_test"


class AISettingsView(APIView):
    """GET the AI settings, PATCH to change them. Admins only. The API key can be seen as set or not set, never read or changed here."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(store.describe_ai())

    def patch(self, request):
        serializer = AISettingsSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = store.update_ai(request.user, serializer.validated_data)
        if changes:
            audit.record(request.user, "settings.ai_updated", "AI settings", changes)
        return Response(store.describe_ai())


class AITestView(APIView):
    """POST to make one small AI call with the current settings and see whether it works."""

    permission_classes = [IsAdmin]
    throttle_classes = [AITestThrottle]

    def post(self, request):
        result = gemini.check_connection()
        audit.record(request.user, "settings.ai_tested", "AI connection", {"ok": result["ok"], "reason": result.get("reason", "")})
        return Response(result)
