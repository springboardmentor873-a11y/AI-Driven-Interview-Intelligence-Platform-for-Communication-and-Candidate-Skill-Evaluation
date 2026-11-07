import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

PASSWORD = "Str0ng!Pass123"


@pytest.fixture
def api(db):
    return APIClient()


@pytest.fixture
def make_user(db):
    def _make(email, role="candidate", password=PASSWORD, **extra):
        return User.objects.create_user(
            username=email, email=email, password=password, role=role, **extra
        )

    return _make


@pytest.fixture
def auth_client():
    def _auth(user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    return _auth