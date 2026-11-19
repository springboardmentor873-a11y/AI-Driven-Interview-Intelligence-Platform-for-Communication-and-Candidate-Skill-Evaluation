"""Single entry point for every Gemini call in SmartHire.

Other code asks this module for JSON and never touches the SDK directly, so the
provider or model can change in one place. When no API key is set, or a call
fails, callers get AIUnavailable / AIError and can fall back to rule-based logic.
"""
import json
import logging
import re
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


def is_configured() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", ""))


def _client():
    from google import genai  # imported here so tests and startup work without the SDK
    from google.genai import types

    timeout_ms = int(getattr(settings, "GEMINI_TIMEOUT_SECONDS", 30)) * 1000
    return genai.Client(api_key=settings.GEMINI_API_KEY, http_options=types.HttpOptions(timeout=timeout_ms))


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
    if not is_configured():
        raise AIUnavailable("GEMINI_API_KEY is not set.")

    from google.genai import types

    config = types.GenerateContentConfig(
        system_instruction=system or None,
        temperature=temperature,
        response_mime_type="application/json",
    )
    # Up to three attempts. The last one uses the backup model, if one is set,
    # because "this model is busy" is the most common reason to need a retry.
    primary = settings.GEMINI_MODEL
    backup = getattr(settings, "GEMINI_FALLBACK_MODEL", "") or primary
    models = [primary, primary, backup]

    last_error = None
    for attempt, model in enumerate(models, start=1):
        time.sleep(RETRY_DELAYS[attempt - 1])
        try:
            # Keep a reference to the client while the request runs. If it is created and
            # dropped in one expression, Python closes it before the request is sent and
            # the call fails with "the client has been closed".
            client = _client()
            response = client.models.generate_content(model=model, contents=prompt, config=config)
            return _parse_json(response.text)
        except Exception as exc:  # AIError from bad JSON, network, quota, bad model name, etc.
            logger.warning("Gemini call failed (model %s, attempt %d of %d): %s", model, attempt, len(models), exc)
            last_error = exc
            if not _is_transient(exc):
                break  # retrying a wrong key or model name only makes the person wait
    raise AIError("The AI service could not complete the request.") from last_error
