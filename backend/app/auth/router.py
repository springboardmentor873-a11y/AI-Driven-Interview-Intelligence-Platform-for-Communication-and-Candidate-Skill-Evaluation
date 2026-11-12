import ipaddress
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service
from app.auth.cookies import clear_refresh_cookie, set_refresh_cookie
from app.auth.dependencies import AuthContext, get_auth_context, verify_origin
from app.auth.schemas import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    PasswordChangeRequest,
    RegisterRequest,
    ResetPasswordRequest,
)
from app.core.config import Settings, get_settings
from app.core.exceptions import InvalidRefreshTokenError
from app.core.rate_limit import rate_limit
from app.db.session import get_session
from app.users.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

DB = Annotated[AsyncSession, Depends(get_session)]
AppSettings = Annotated[Settings, Depends(get_settings)]
Auth = Annotated[AuthContext, Depends(get_auth_context)]


def _client_info(request: Request) -> service.ClientInfo:
    ip = request.client.host if request.client else None
    try:
        ip = str(ipaddress.ip_address(ip)) if ip else None
    except ValueError:
        ip = None
    user_agent = request.headers.get("user-agent")
    return service.ClientInfo(ip=ip, user_agent=user_agent[:512] if user_agent else None)


@router.post(
    "/register",
    status_code=201,
    response_model=UserRead,
    dependencies=[Depends(rate_limit("register"))],
)
async def register(body: RegisterRequest, db: DB) -> UserRead:
    user = await service.register_user(
        db, email=body.email, password=body.password, full_name=body.full_name
    )
    return UserRead.from_user(user)


@router.post("/login", response_model=LoginResponse, dependencies=[Depends(rate_limit("login"))])
async def login(
    body: LoginRequest, request: Request, response: Response, db: DB, settings: AppSettings
) -> LoginResponse:
    result = await service.login(
        db, settings, email=body.email, password=body.password, client=_client_info(request)
    )
    set_refresh_cookie(response, result.refresh_token, settings)
    return LoginResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserRead.from_user(result.user),
    )


@router.post(
    "/google",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit("login"))],
    summary="Authenticate or register using Google identity token",
)
async def login_with_google(
    body: GoogleAuthRequest, request: Request, response: Response, db: DB, settings: AppSettings
) -> LoginResponse:
    result = await service.login_google(
        db, settings, credential=body.credential, client=_client_info(request)
    )
    set_refresh_cookie(response, result.refresh_token, settings)
    return LoginResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserRead.from_user(result.user),
    )


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    dependencies=[Depends(rate_limit("refresh")), Depends(verify_origin)],
)
async def refresh(
    request: Request, response: Response, db: DB, settings: AppSettings
) -> AccessTokenResponse:
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        raise InvalidRefreshTokenError
    result = await service.refresh_session(db, settings, raw)
    set_refresh_cookie(response, result.refresh_token, settings)
    return AccessTokenResponse(access_token=result.access_token, expires_in=result.expires_in)


@router.post("/logout", status_code=204, dependencies=[Depends(verify_origin)])
async def logout(request: Request, response: Response, db: DB, settings: AppSettings) -> None:
    await service.logout(db, request.cookies.get(settings.refresh_cookie_name))
    clear_refresh_cookie(response, settings)


@router.post("/logout-all", status_code=204, dependencies=[Depends(verify_origin)])
async def logout_all(response: Response, ctx: Auth, db: DB, settings: AppSettings) -> None:
    await service.logout_all(db, ctx)
    clear_refresh_cookie(response, settings)


@router.post("/password/change", status_code=204, dependencies=[Depends(rate_limit("password"))])
async def change_password(body: PasswordChangeRequest, ctx: Auth, db: DB) -> None:
    await service.change_password(
        db, ctx, current_password=body.current_password, new_password=body.new_password
    )


@router.post(
    "/password/forgot",
    status_code=202,
    response_model=MessageResponse,
    dependencies=[Depends(rate_limit("password"))],
)
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    background: BackgroundTasks,
    settings: AppSettings,
) -> MessageResponse:
    # Always the same answer; the lookup and any email happen after the response is sent.
    background.add_task(
        service.request_password_reset,
        request.app.state.session_factory,
        settings,
        request.app.state.email_sender,
        body.email,
    )
    return MessageResponse(
        message="If an account exists for this email, a password reset request has been recorded."
    )


@router.post("/password/reset", status_code=204, dependencies=[Depends(rate_limit("password"))])
async def reset_password(body: ResetPasswordRequest, db: DB) -> None:
    await service.confirm_password_reset(db, raw_token=body.token, new_password=body.new_password)
