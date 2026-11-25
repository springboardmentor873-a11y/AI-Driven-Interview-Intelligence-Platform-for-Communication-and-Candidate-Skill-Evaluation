"""Small helper to call Google Gemini through its OpenAI-compatible endpoint.

Every function here is safe: if anything goes wrong we return None and the
caller uses its non-AI fallback. Nothing in this file ever raises.
"""
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'
TIMEOUT_SECONDS = 30


def ai_enabled():
    """True only when both the key and the model name are set."""
    return bool(settings.GEMINI_API_KEY and settings.GEMINI_MODEL)


def _strip_code_fences(text):
    # Models sometimes wrap JSON in ```json ... ```
    text = text.strip()
    match = re.match(r'^```(?:json)?\s*(.*?)\s*```$', text, re.DOTALL | re.IGNORECASE)
    return match.group(1) if match else text


def _ask_model(system_prompt, user_prompt, api_key, model):
    from openai import OpenAI

    client = OpenAI(
        api_key=api_key,
        base_url=GEMINI_BASE_URL,
        timeout=TIMEOUT_SECONDS,
        max_retries=0,   # no hidden retries
    )
    response = client.chat.completions.create(
        model=model,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
    )
    return response.choices[0].message.content or ''


def ai_json(system_prompt, user_prompt):
    """Ask the model for JSON. Returns the parsed JSON, or None on ANY failure."""
    if not ai_enabled():
        return None
    # The openai timeout only limits each network step, so we also put a hard
    # 30 second limit on the whole call by running it in a helper thread.
    pool = ThreadPoolExecutor(max_workers=1)
    try:
        future = pool.submit(_ask_model, system_prompt, user_prompt, settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
        content = future.result(timeout=TIMEOUT_SECONDS)
        return json.loads(_strip_code_fences(content))
    except Exception as exc:
        # Log only the error type: never the key, the prompt or resume text.
        logger.warning('AI call failed (%s). Using the fallback.', type(exc).__name__)
        return None
    finally:
        pool.shutdown(wait=False)
