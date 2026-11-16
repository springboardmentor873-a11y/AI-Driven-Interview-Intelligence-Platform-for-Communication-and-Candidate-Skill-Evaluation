import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .config import settings
from .database import Base, SessionLocal, engine
from .models import User, utcnow
from .routers import auth
from .security import hash_password


class JsonFormatter(logging.Formatter):
    def format(self, r: logging.LogRecord) -> str:
        d = {"ts": self.formatTime(r), "level": r.levelname, "logger": r.name, "msg": r.getMessage()}
        for k in ("request_id", "path", "status", "ms", "method"):
            if hasattr(r, k):
                d[k] = getattr(r, k)
        if r.exc_info:
            d["exc"] = self.formatException(r.exc_info)
        return json.dumps(d)


_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter() if settings.is_production else logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[_handler], force=True)
log = logging.getLogger("smarthire")

if settings.sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, traces_sample_rate=0.1, environment=settings.environment,
                        send_default_pii=False)
    except ImportError:
        log.warning("SENTRY_DSN set but sentry-sdk is not installed")


def check_production() -> None:
    problems = settings.production_problems()
    if settings.is_production and problems:
        raise RuntimeError("Refusing to start in production:\n - " + "\n - ".join(problems))
    for p in problems:
        log.warning("Not production ready: %s", p)


def migrate() -> None:
    if not settings.run_migrations:
        return
    ini = Path(__file__).resolve().parent.parent / "alembic.ini"
    if ini.exists():
        from alembic import command
        from alembic.config import Config

        cfg = Config(str(ini))
        cfg.set_main_option("script_location", str(ini.parent / "migrations"))
        command.upgrade(cfg, "head")
    else:  # fallback for minimal installs
        Base.metadata.create_all(bind=engine)


def seed() -> None:
    from sqlalchemy.exc import IntegrityError

    try:
        _seed()
    except IntegrityError:  # another worker seeded first
        pass


def _seed() -> None:
    with SessionLocal() as db:
        if not db.query(User).filter(User.role == "admin").first():
            db.add(User(email=settings.admin_email.lower(), name=settings.admin_name, role="admin",
                        hashed_password=hash_password(settings.admin_password), consent_at=utcnow()))
            log.info("Created first admin %s", settings.admin_email)
        if settings.seed_demo and not settings.is_production:
            for email, name, role, pw in [("recruiter@smarthire.ai", "Demo Recruiter", "recruiter", "Recruiter@123"),
                                          ("candidate@smarthire.ai", "Demo Candidate", "candidate", "Candidate@123")]:
                if not db.query(User).filter(User.email == email).first():
                    db.add(User(email=email, name=name, role=role, hashed_password=hash_password(pw), consent_at=utcnow()))
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    check_production()
    migrate()
    seed()
    log.info("Started: env=%s", settings.environment)
    yield


app = FastAPI(title=f"{settings.app_name} API", version="1.1.0", lifespan=lifespan,
              description="AI-powered mock interview and candidate assessment platform",
              docs_url=None if settings.is_production else "/docs", redoc_url=None,
              openapi_url=None if settings.is_production else "/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=False,
                   allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"])

CSP = ("default-src 'self'; "
       "script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com/gsi/client; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob:; "
       "connect-src 'self' https://storage.googleapis.com https://accounts.google.com/gsi/; "
       "frame-src https://accounts.google.com/gsi/; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; "
       "form-action 'self'; frame-ancestors 'none'")


@app.middleware("http")
async def security_and_logging(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    start = time.perf_counter()
    response = await call_next(request)
    ms = round((time.perf_counter() - start) * 1000, 1)
    h = response.headers
    h["X-Request-ID"] = rid
    h["X-Content-Type-Options"] = "nosniff"
    h["X-Frame-Options"] = "DENY"
    h["Referrer-Policy"] = "strict-origin-when-cross-origin"
    h["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=(), payment=()"
    h["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    if request.url.path.startswith("/api/"):
        h["Cache-Control"] = "no-store"
    else:
        h["Content-Security-Policy"] = CSP
    if settings.is_production:
        h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.url.path.startswith("/api/") and request.url.path not in ("/api/health", "/api/ready"):
        log.info("request", extra={"request_id": rid, "method": request.method, "path": request.url.path,
                                   "status": response.status_code, "ms": ms})
    return response


app.include_router(auth.router)


@app.get("/api/health")
def health():
    """Liveness: the process is up."""
    return {"status": "ok"}


@app.get("/api/ready")
def ready():
    """Readiness: database reachable."""
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception as exc:
        log.warning("Readiness failed: %s", exc)
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse({"detail": "Something went wrong on the server. Please try again."}, status_code=500)
