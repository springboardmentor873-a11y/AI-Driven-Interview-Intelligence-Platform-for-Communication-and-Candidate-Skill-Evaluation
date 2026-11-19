"""Single entry point for every Gemini call in SmartHire.

Other code asks this module for JSON and never touches the SDK directly, so the
provider or model can change in one place. When no API key is set, or a call
fails, callers get AIUnavailable / AIError and can fall back to rule-based logic.
"""
import json
import logging
import re

from django.conf import settings

logger = logging.getLogger(__name__)


class AIUnavailable(Exception):
    """No API key is configured."""


class AIError(Exception):
    """The AI call failed or returned something unusable."""


def is_configured() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", ""))


def _client():
    from google import genai  # imported here so tests and startup work without the SDK

    return genai.Client(api_key=settings.GEMINI_API_KEY)


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
    last_error = None
    for _ in range(2):  # one retry for transient failures
        try:
            # Keep a reference to the client while the request runs. If it is created and
            # dropped in one expression, Python closes it before the request is sent and
            # the call fails with "the client has been closed".
            client = _client()
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL, contents=prompt, config=config
            )
            return _parse_json(response.text)
        except AIError as exc:
            last_error = exc
        except Exception as exc:  # network, quota, bad model name, etc.
            logger.warning("Gemini call failed: %s", exc)
            last_error = exc
    raise AIError("The AI service could not complete the request.") from last_error
