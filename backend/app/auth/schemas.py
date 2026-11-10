from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.users.schemas import UserRead


def _normalize_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 254:
        raise ValueError("email is too long")
    return value


Email = Annotated[EmailStr, AfterValidator(_normalize_email)]
# New passwords: length only (NIST 800-63B style), no composition rules. 128 bounds hashing cost.
NewPassword = Annotated[str, Field(min_length=10, max_length=128)]
FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")  # unknown fields (e.g. "role") are rejected


class RegisterRequest(_Strict):
    email: Email
    password: NewPassword
    full_name: FullName


class LoginRequest(_Strict):
    email: Email
    password: Annotated[str, Field(min_length=1, max_length=128)]


class PasswordChangeRequest(_Strict):
    current_password: Annotated[str, Field(min_length=1, max_length=128)]
    new_password: NewPassword


class ForgotPasswordRequest(_Strict):
    email: Email


class ResetPasswordRequest(_Strict):
    token: Annotated[str, Field(min_length=20, max_length=200)]
    new_password: NewPassword


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 (scheme name, not a secret)
    expires_in: int


class LoginResponse(AccessTokenResponse):
    user: UserRead


class MessageResponse(BaseModel):
    message: str
