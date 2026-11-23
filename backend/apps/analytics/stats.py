"""Small, dependency-free maths for the analytics pages (Milestone 4).

Everything here works on plain lists of numbers, oldest first, so the candidate, recruiter and admin
analytics can all reuse it and it can be tested without a database.

The "prediction" is deliberately simple and explainable: a straight line fitted through the latest few
scores. It is a trend, not machine learning, and it says nothing until there are enough interviews.
"""

RECENT = 5          # interviews that count as "recent"
TREND_WINDOW = 6    # most recent interviews used to fit the trend line
MIN_TREND_POINTS = 3
STEADY_BAND = 1.5   # points per interview: a slope inside +-1.5 is called steady


def r1(value):
    """Round to one decimal, keeping None."""
    return None if value is None else round(value, 1)


def mean(values):
    values = list(values)
    return sum(values) / len(values) if values else None


def slope(values):
    """Least-squares slope of the values against 0, 1, 2, ... (points gained per interview)."""
    n = len(values)
    if n < 2:
        return None
    mid = (n - 1) / 2
    average = sum(values) / n
    spread = sum((i - mid) ** 2 for i in range(n))
    return sum((i - mid) * (v - average) for i, v in enumerate(values)) / spread


def predict_next(values, window=TREND_WINDOW, minimum=MIN_TREND_POINTS):
    """Where the trend line points for the next interview (0-100), or None with too few points."""
    points = list(values)[-window:]
    if len(points) < minimum:
        return None
    n = len(points)
    line = mean(points) + slope(points) * (n - (n - 1) / 2)  # the fitted value one step after the last point
    return round(max(0.0, min(100.0, line)), 1)


def direction(values, window=TREND_WINDOW, minimum=MIN_TREND_POINTS, band=STEADY_BAND):
    """\"improving\", \"steady\", \"declining\" or \"not_enough_data\"."""
    points = list(values)[-window:]
    if len(points) < minimum:
        return "not_enough_data"
    trend = slope(points)
    if trend >= band:
        return "improving"
    if trend <= -band:
        return "declining"
    return "steady"


def series_stats(values):
    """The usual summary of one score over time (values oldest first, None already removed)."""
    values = list(values)
    return {
        "samples": len(values),
        "average": r1(mean(values)),
        "latest": r1(values[-1]) if values else None,
        "best": r1(max(values)) if values else None,
        "recent_average": r1(mean(values[-RECENT:])),
        "change": r1(values[-1] - values[0]) if len(values) >= 2 else None,  # latest compared with the first
        "direction": direction(values),
        "predicted_next": predict_next(values),
    }


def percentile_of(value, others):
    """Share (0-100) of the other values that are below this one; a tie counts as half."""
    others = list(others)
    if not others:
        return None
    below = sum(1 for other in others if other < value)
    equal = sum(1 for other in others if other == value)
    return round(100 * (below + 0.5 * equal) / len(others))
