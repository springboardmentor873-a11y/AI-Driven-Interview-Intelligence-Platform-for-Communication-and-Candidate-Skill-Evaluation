import pytest

from apps.analytics import stats


def test_mean_of_nothing_is_none():
    assert stats.mean([]) is None
    assert stats.mean([60, 80]) == 70


def test_slope_is_points_gained_per_interview():
    assert stats.slope([60, 70, 80]) == pytest.approx(10)
    assert stats.slope([80, 70, 60]) == pytest.approx(-10)
    assert stats.slope([70, 70, 70]) == 0
    assert stats.slope([70]) is None


def test_prediction_follows_the_line_and_stays_between_0_and_100():
    assert stats.predict_next([60, 70, 80]) == 90
    assert stats.predict_next([90, 95, 100]) == 100       # clamped
    assert stats.predict_next([20, 10, 0]) == 0           # clamped


def test_prediction_needs_three_interviews():
    assert stats.predict_next([60, 70]) is None
    assert stats.direction([60, 70]) == "not_enough_data"


def test_prediction_only_looks_at_the_latest_interviews():
    old_low_start = [10, 10, 10, 10, 70, 70, 70, 70, 70, 70]
    assert stats.predict_next(old_low_start) == 70


@pytest.mark.parametrize("values,expected", [
    ([60, 65, 70], "improving"),
    ([70, 65, 60], "declining"),
    ([70, 70.5, 70], "steady"),
])
def test_direction(values, expected):
    assert stats.direction(values) == expected


def test_series_stats():
    result = stats.series_stats([50, 60, 70, 80])
    assert result["samples"] == 4 and result["average"] == 65 and result["latest"] == 80 and result["best"] == 80
    assert result["change"] == 30 and result["direction"] == "improving" and result["predicted_next"] == 90


def test_series_stats_of_nothing():
    result = stats.series_stats([])
    assert result["samples"] == 0 and result["average"] is None and result["latest"] is None
    assert result["direction"] == "not_enough_data" and result["predicted_next"] is None


def test_series_stats_with_one_value_has_no_change():
    result = stats.series_stats([72.46])
    assert result["latest"] == 72.5 and result["change"] is None


def test_percentile_counts_ties_as_half():
    assert stats.percentile_of(80, [50, 60, 70, 90]) == 75
    assert stats.percentile_of(80, [80, 80]) == 50
    assert stats.percentile_of(10, [50, 60]) == 0
    assert stats.percentile_of(80, []) is None
