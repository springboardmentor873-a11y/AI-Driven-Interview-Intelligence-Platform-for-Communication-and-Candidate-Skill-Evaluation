from datetime import UTC, datetime


def utcnow() -> datetime:
    """Single source of 'now' (timezone-aware UTC) so time-dependent logic is easy to test."""
    return datetime.now(UTC)
