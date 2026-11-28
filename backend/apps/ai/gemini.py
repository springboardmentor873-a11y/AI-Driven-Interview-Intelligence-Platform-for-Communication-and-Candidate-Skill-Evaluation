"""Single entry point for every Gemini call in SmartHire.

Other code asks this module for JSON and never touches the SDK directly, so the
provider or model can change in one place. When no API key is set, or a call
fails, callers get AIUnavailable / AIError and can fall back to rule-based logic.
"""
import json
import logging
import re
import sys
import time

from django.conf import settings

logger = logging.getLogger(__name__)


class AIUnavailable(Exception):
    """No API key is configured."""


class AIError(Exception):
    """The AI call failed or returned something unusable."""


# Errors worth trying again: Google is busy or briefly down. Anything else
# (bad key, unknown model, bad request) will fail the same way every time.
TRANSIENT_CODES = {408, 429, 500, 502, 503, 504}
RETRY_DELAYS = (0, 1.0, 2.0)  # seconds to wait before attempt 1, 2 and 3


# Which feature made a call, read from the module that called generate_json (no change needed at the call sites).
PURPOSES = {
    "apps.scoring.feedback": "feedback",
    "apps.interviews.question_gen": "questions",
    "apps.interviews.speech_analysis": "speech_review",
    "apps.resumes.skill_extract": "resume_skills",
    "apps.ai.gemini": "settings_test",
}


def _config():
    """The AI settings an admin can change, over the server defaults. Falls back to the defaults if they cannot be read."""
    try:
        from apps.system import store

        return store.ai_config()
    except Exception:  # a problem with the settings table must never stop an interview
        return {
            "enabled": True,
            "model": settings.GEMINI_MODEL,
            "fallback_model": getattr(settings, "GEMINI_FALLBACK_MODEL", "") or "",
            "timeout_seconds": int(getattr(settings, "GEMINI_TIMEOUT_SECONDS", 30)),
        }


def is_configured() -> bool:
    """A key is set and an admin has not switched the AI off."""
    return bool(getattr(settings, "GEMINI_API_KEY", "")) and _config()["enabled"]


def _client():
    from google import genai  # imported here so tests and startup work without the SDK
    from google.genai import types

    timeout_ms = int(_config()["timeout_seconds"]) * 1000
    return genai.Client(api_key=settings.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=timeout_ms))


def _error_kind(exc) -> str:
    """A short label for why a call failed, for the admin's monitoring page."""
    if isinstance(exc, AIError):
        return "bad_json"
    code = getattr(exc, "code", None)
    if isinstance(code, int):
        if code == 429:
            return "rate_limited"
        if code in (408, 504):
            return "timeout"
        if code >= 500:
            return "server_error"
        return "rejected"  # 400, 401, 403, 404: a wrong key, model name or request
    return "timeout" if "timeout" in f"{type(exc).__name__} {exc}".lower() else "other"


def _record(purpose, model, ok, attempts, started, used_fallback=False, error_kind=""):
    """Note the call for the admin's monitoring page. Never lets a logging problem touch the call itself."""
    try:
        from django.db import transaction

        from apps.system.models import AICall

        with transaction.atomic():
            AICall.objects.create(
                purpose=purpose, model=model[:80], ok=ok, attempts=attempts, used_fallback=used_fallback,
                latency_ms=int((time.monotonic() - started) * 1000), error_kind=error_kind,
            )
    except Exception as exc:
        logger.debug("Could not record the AI call: %s", exc)


def _is_transient(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    if isinstance(code, int):
        return code in TRANSIENT_CODES
    return True  # network errors, timeouts and bad JSON are worth another try


def _parse_json(text: str):
    text = (text or "").strip()
    # Models sometimes wrap JSON in ```json fences even when told not to
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise AIError("The AI response was not valid JSON.") from exc


def generate_json(prompt: str, system: str = "", temperature: float = 0.4):
    """Send a prompt and return the parsed JSON (dict or list).

    Raises AIUnavailable when no key is set, AIError for any other failure.
    """
    if not getattr(settings, "GEMINI_API_KEY", ""):
        raise AIUnavailable("GEMINI_API_KEY is not set.")
    config_now = _config()
    if not config_now["enabled"]:
        raise AIUnavailable("AI features are switched off by an administrator.")
    module = sys._getframe(1).f_globals.get("__name__", "")
    purpose = PURPOSES.get(module, module.rsplit(".", 1)[-1][:40])

    from google.genai import types

    config = types.GenerateContentConfig(
        system_instruction=system or None,
        temperature=temperature,
        response_mime_type="application/json",
    )
    # Up to three attempts. The last one uses the backup model, if one is set,
    # because "this model is busy" is the most common reason to need a retry.
    primary = config_now["model"]
    backup = config_now["fallback_model"] or primary
    models = [primary, primary, backup]

    started = time.monotonic()
    last_error, attempt, model = None, 0, primary
    for attempt, model in enumerate(models, start=1):
        time.sleep(RETRY_DELAYS[attempt - 1])
        try:
            # Keep a reference to the client while the request runs. If it is created and
            # dropped in one expression, Python closes it before the request is sent and
            # the call fails with "the client has been closed".
            client = _client()
            response = client.models.generate_content(model=model, contents=prompt, config=config)
            result = _parse_json(response.text)
            _record(purpose, model, True, attempt, started, used_fallback=model != primary)
            return result
        except Exception as exc:  # AIError from bad JSON, network, quota, bad model name, etc.
            logger.warning("Gemini call failed (model %s, attempt %d of %d): %s", model, attempt, len(models), exc)
            last_error = exc
            if not _is_transient(exc):
                break  # retrying a wrong key or model name only makes the person wait
    _record(purpose, model, False, attempt, started, error_kind=_error_kind(last_error))
    raise AIError("The AI service could not complete the request.") from last_error


def check_connection() -> dict:
    """Make one tiny call with the current settings so an admin can see whether the key, model and network work. Never raises."""
    if not getattr(settings, "GEMINI_API_KEY", ""):
        return {"ok": False, "reason": "no_key"}
    config_now = _config()
    if not config_now["enabled"]:
        return {"ok": False, "reason": "disabled"}
    started = time.monotonic()
    try:
        generate_json('Reply with only this JSON: {"ok": true}', temperature=0)
    except AIError as exc:
        return {"ok": False, "reason": "failed", "error_kind": _error_kind(exc.__cause__ or exc), "model": config_now["model"]}
    return {"ok": True, "latency_ms": int((time.monotonic() - started) * 1000), "model": config_now["model"]}
