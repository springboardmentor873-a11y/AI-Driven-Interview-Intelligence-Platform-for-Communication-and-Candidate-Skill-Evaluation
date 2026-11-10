from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.auth.email import UnconfiguredEmailSender
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.rate_limit import RateLimiter
from app.db.session import create_engine, create_session_factory


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application database resources."""

    engine = create_engine(get_settings())

    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)

    yield

    await engine.dispose()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    # Application state
    app.state.rate_limiter = RateLimiter()
    app.state.email_sender = UnconfiguredEmailSender()

    # Register exception handlers
    register_exception_handlers(app)

    # Configure CORS
    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
        )

    # Register API routes
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()
