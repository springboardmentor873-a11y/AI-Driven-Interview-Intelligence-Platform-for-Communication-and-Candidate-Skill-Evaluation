from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    status_code = 500
    code = "internal_error"
    default_message = "An unexpected application error occurred."

    def __init__(self, message=None, headers=None):
        self.message = message or self.default_message
        self.headers = headers
        super().__init__(self.message)


class InvalidRefreshTokenError(AppException):
    status_code = 401
    code = "invalid_refresh_token"
    default_message = "The refresh token is invalid or expired."


class RefreshConflictError(AppException):
    status_code = 409
    code = "refresh_conflict"
    default_message = "Refresh token conflict. Please retry with the latest cookie."


class InvalidCredentialsError(AppException):
    status_code = 401
    code = "invalid_credentials"
    default_message = "Invalid email or password."


class UserAlreadyExistsError(AppException):
    status_code = 409
    code = "user_already_exists"
    default_message = "An account with this email already exists."


class InactiveUserError(AppException):
    status_code = 403
    code = "inactive_user"
    default_message = "This account is inactive."


class PasswordValidationError(AppException):
    status_code = 422
    code = "password_validation_error"
    default_message = "The password does not meet the requirements."


class InvalidOneTimeTokenError(AppException):
    status_code = 400
    code = "invalid_one_time_token"
    default_message = "The token is invalid or expired."


class RateLimitedError(AppException):
    status_code = 429
    code = "rate_limited"
    default_message = "Too many requests. Please try again later."


class InvalidTokenError(AppException):
    status_code = 401
    code = "invalid_token"
    default_message = "The access token is invalid."


class TokenExpiredError(AppException):
    status_code = 401
    code = "token_expired"
    default_message = "The access token has expired."


class AccountSuspendedError(AppException):
    status_code = 403
    code = "account_suspended"
    default_message = "This account has been suspended."


class EmailTakenError(AppException):
    status_code = 409
    code = "email_taken"
    default_message = "An account with this email already exists."


class InvalidResetTokenError(AppException):
    status_code = 400
    code = "invalid_reset_token"
    default_message = "The password reset token is invalid or expired."


class PasswordUnchangedError(AppException):
    status_code = 400
    code = "password_unchanged"
    default_message = "The new password must be different from the current password."


class WrongPasswordError(AppException):
    status_code = 400
    code = "wrong_password"
    default_message = "The current password is incorrect."


class NotAuthenticatedError(AppException):
    status_code = 401
    code = "not_authenticated"
    default_message = "Authentication is required."


class OriginNotAllowedError(AppException):
    status_code = 403
    code = "origin_not_allowed"
    default_message = "This request origin is not allowed."


# Stage 4: RBAC and administrator exceptions


class ForbiddenError(AppException):
    status_code = 403
    code = "forbidden"
    default_message = "You do not have permission to perform this action."


class NotFoundError(AppException):
    status_code = 404
    code = "not_found"
    default_message = "Resource not found."


class RoleAlreadyAssignedError(AppException):
    status_code = 409
    code = "role_already_assigned"
    default_message = "The user already has this role."


class RoleNotAssignedError(AppException):
    status_code = 404
    code = "role_not_assigned"
    default_message = "The user does not have this role."


class CannotModifySelfError(AppException):
    status_code = 400
    code = "cannot_modify_self"
    default_message = "You cannot remove your own admin role or suspend your own account."


class LastAdminError(AppException):
    status_code = 400
    code = "last_admin"
    default_message = "This change would leave the platform without an active admin."


async def app_exception_handler(
    request: Request,
    exc: AppException,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(
        AppException,
        app_exception_handler,
    )
    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )
