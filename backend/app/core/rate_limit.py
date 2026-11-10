"""Small in-process sliding-window rate limiter.

LIMITATION: state lives in this process's memory, so limits are per worker and reset on
restart. Behind a reverse proxy run uvicorn with --proxy-headers so request.client is the
real client IP. For multi-instance deployments use a shared store or limit at the proxy.
"""

import math
import time
from collections import deque
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.core.exceptions import RateLimitedError

WINDOW_SECONDS = 60.0
_MAX_TRACKED_KEYS = 10_000


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}

    def hit(self, key: str, limit: int, window: float = WINDOW_SECONDS) -> float | None:
        """Record a request. Return seconds to wait if the limit is exceeded, else None."""
        now = self._clock()
        queue = self._hits.setdefault(key, deque())
        while queue and queue[0] <= now - window:
            queue.popleft()
        if len(queue) >= limit:
            return queue[0] + window - now
        queue.append(now)
        if len(self._hits) > _MAX_TRACKED_KEYS:
            self._purge(now, window)
        return None

    def _purge(self, now: float, window: float) -> None:
        for key in [k for k, q in self._hits.items() if not q or q[-1] <= now - window]:
            del self._hits[key]


def rate_limit(name: str):
    """FastAPI dependency factory: limit `name` requests per minute per client IP."""

    async def dependency(request: Request, settings: Annotated[Settings, Depends(get_settings)]):
        ip = request.client.host if request.client else "unknown"
        retry_after = request.app.state.rate_limiter.hit(f"{name}:{ip}", settings.rate_limits[name])
        if retry_after is not None:
            raise RateLimitedError(headers={"Retry-After": str(max(1, math.ceil(retry_after)))})

    return dependency
