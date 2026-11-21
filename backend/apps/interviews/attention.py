"""Eye-contact and attention numbers (Milestone 3, Day 4).

The browser measures eye contact with MediaPipe and sends one small summary with each answer
(see ``AttentionSerializer``). This module turns that summary into what is stored in
``Answer.analysis["attention"]``.

The numbers come from the candidate's own browser, so they are good feedback for practice but
cannot be trusted as proof in a setting where the candidate has a reason to cheat.
"""

# Looking at the camera about 70% of the time is natural and counts as a full score. People also
# look away to think or to glance at the screen, so asking for more would be unfair.
FULL_SCORE_EYE_CONTACT = 70.0
MIN_TRACKED_SECONDS = 5


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(high, value))


def attention_info(raw):
    """The stored attention section for an answer, or None when there is nothing usable."""
    if not raw or raw.get("tracked_seconds", 0) < MIN_TRACKED_SECONDS:
        return None
    eye_contact = float(raw["eye_contact_pct"])
    score = round(_clamp(eye_contact / FULL_SCORE_EYE_CONTACT * 100))
    return {
        "tracked_seconds": round(float(raw["tracked_seconds"]), 1),
        "face_visible_pct": round(float(raw["face_visible_pct"]), 1),
        "eye_contact_pct": round(eye_contact, 1),
        "look_away_events": int(raw["look_away_events"]),
        "longest_look_away_seconds": round(float(raw["longest_look_away_seconds"]), 1),
        "score": score,
        "label": "good" if score >= 80 else "fair" if score >= 50 else "low",
        "source": "browser",
    }
