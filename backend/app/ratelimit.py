"""Small sliding-window rate limiter keyed by client IP and route.

Per-process memory is enough for one or two workers behind a single instance. For a fleet of
instances, put the limit at the edge (Cloudflare rate limiting rules are free) as well.
"""
import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

from .config import settings

_hits: dict[str, deque] = defaultdict(deque)
_lock = Lock()


def client_ip(request: Request) -> str:
    if settings.trust_proxy:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
        cf = request.headers.get("cf-connecting-ip")
        if cf:
            return cf
    return request.client.host if request.client else "unknown"


def _parse(rule: str) -> tuple[int, int]:
    n, w = rule.split("/")
    return int(n), int(w)


def limit(rule_name: str):
    def dep(request: Request):
        n, window = _parse(getattr(settings, rule_name))
        key = f"{rule_name}:{request.url.path}:{client_ip(request)}"
        now = time.monotonic()
        with _lock:
            q = _hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= n:
                retry = int(window - (now - q[0])) + 1
                raise HTTPException(429, f"Too many requests. Try again in {retry} seconds.", headers={"Retry-After": str(retry)})
            q.append(now)
            if len(_hits) > 50000:  # bound memory
                _hits.clear()

    return dep


def reset() -> None:
    with _lock:
        _hits.clear()
