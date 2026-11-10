import pytest

from app.core.rate_limit import RateLimiter


class FakeClock:
    """Controllable clock for testing rate limits."""

    def __init__(self):
        self.current_time = 1000.0

    def __call__(self):
        return self.current_time

    def advance(self, seconds):
        self.current_time += seconds


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def limiter(clock):
    return RateLimiter(clock=clock)


def test_requests_within_limit_are_allowed(limiter):
    assert limiter.hit("login:127.0.0.1", limit=3) is None
    assert limiter.hit("login:127.0.0.1", limit=3) is None
    assert limiter.hit("login:127.0.0.1", limit=3) is None


def test_request_over_limit_is_rejected(limiter):
    for _ in range(3):
        limiter.hit("login:127.0.0.1", limit=3)

    retry_after = limiter.hit("login:127.0.0.1", limit=3)

    assert retry_after == 60.0


def test_retry_after_decreases_with_time(limiter, clock):
    for _ in range(3):
        limiter.hit("login:127.0.0.1", limit=3)

    clock.advance(15)

    retry_after = limiter.hit("login:127.0.0.1", limit=3)

    assert retry_after == 45.0


def test_requests_allowed_after_window_expires(limiter, clock):
    for _ in range(3):
        limiter.hit("login:127.0.0.1", limit=3)

    clock.advance(61)

    assert limiter.hit("login:127.0.0.1", limit=3) is None


def test_different_ips_have_independent_limits(limiter):
    for _ in range(3):
        limiter.hit("login:127.0.0.1", limit=3)

    assert limiter.hit("login:127.0.0.1", limit=3) is not None
    assert limiter.hit("login:127.0.0.2", limit=3) is None


def test_different_categories_have_independent_limits(limiter):
    for _ in range(3):
        limiter.hit("login:127.0.0.1", limit=3)

    assert limiter.hit("login:127.0.0.1", limit=3) is not None
    assert limiter.hit("register:127.0.0.1", limit=3) is None


def test_expired_requests_are_removed(limiter, clock):
    limiter.hit("login:127.0.0.1", limit=2)
    clock.advance(61)

    assert limiter.hit("login:127.0.0.1", limit=2) is None
    assert len(limiter._hits["login:127.0.0.1"]) == 1


def test_rejected_requests_do_not_extend_the_window(limiter, clock):
    for _ in range(2):
        limiter.hit("login:127.0.0.1", limit=2)

    clock.advance(30)

    for _ in range(3):
        assert limiter.hit("login:127.0.0.1", limit=2) is not None

    clock.advance(31)

    assert limiter.hit("login:127.0.0.1", limit=2) is None
