"""Expression, hesitation and confidence signals (Milestone 3, Day 5).

Expression and hesitation are measured in the candidate's browser and sent with each answer:
  - expression: how the face looked over time (smiling, tense, brows raised, neutral), from
    MediaPipe face blendshapes
  - hesitation: how long before the first word, and how many long pauses, from the speech recognizer

``confidence_info`` combines them with eye contact and the speech numbers into the five parts the
SRS lists for the confidence score: eye-contact consistency, facial engagement, response
hesitation, speaking confidence and attention level.

These are rough practice hints. A face can look tense when someone is simply concentrating, and
people show feelings differently, so none of this is a verdict about a person.
"""

MIN_FACE_SECONDS = 5
FULL_EXPRESSIVENESS = 40.0  # this share of the time showing a smile or raised brows is a full score
TENSION_PENALTY = 2.5       # composure lost per point of tense time (40% tense = 0)
LONG_DELAY_FROM = 3.0       # seconds before the first word that is still natural
DELAY_PENALTY = 8           # score lost per second of delay beyond that
PAUSES_PER_MINUTE_PENALTY = 25
MIN_RATE_WINDOW = 60        # pauses per minute are measured over at least a minute, so one pause in a short answer is not harsh

CONFIDENCE_WEIGHTS = {"eye_contact": 25, "attention_level": 15, "facial_engagement": 15, "hesitation": 25, "speaking_confidence": 20}
SPEAKING_WEIGHTS = {"fillers": 40, "pace": 30, "composure": 30}
LOOK_AWAY_PENALTY = 8       # attention level lost per long look-away


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(high, value))


def _label(score):
    return "good" if score >= 75 else "fair" if score >= 50 else "low"


def _weighted(parts: dict, weights: dict):
    present = {k: v for k, v in parts.items() if v is not None}
    total = sum(weights[k] for k in present)
    return sum(v * weights[k] for k, v in present.items()) / total if total else None


def expression_info(raw):
    """Stored expression section, or None when the face was not seen long enough."""
    if not raw or raw.get("face_seconds", 0) < MIN_FACE_SECONDS:
        return None
    shares = {name: round(float(raw[f"{name}_pct"]), 1) for name in ("smile", "tense", "raised", "neutral")}
    expressive = _clamp((shares["smile"] + shares["raised"] + 0.5 * shares["tense"]) / FULL_EXPRESSIVENESS * 100)
    return {
        "face_seconds": round(float(raw["face_seconds"]), 1),
        **{f"{name}_pct": value for name, value in shares.items()},
        "dominant": max(shares, key=shares.get),
        "expressiveness": round(expressive),
        "composure": round(_clamp(100 - shares["tense"] * TENSION_PENALTY)),
        "source": "browser",
    }


def hesitation_info(raw, duration_seconds):
    """Stored hesitation section from the speech recognizer's timing, or None."""
    if not raw:
        return None
    delay = float(raw["response_delay_seconds"])
    pauses = int(raw["long_pauses"])
    delay_score = _clamp(100 - max(0.0, delay - LONG_DELAY_FROM) * DELAY_PENALTY)
    per_minute = pauses / max(duration_seconds, MIN_RATE_WINDOW) * 60
    pause_score = _clamp(100 - per_minute * PAUSES_PER_MINUTE_PENALTY)
    score = round((delay_score + pause_score) / 2)
    return {
        "response_delay_seconds": round(delay, 1),
        "long_pauses": pauses,
        "longest_pause_seconds": round(float(raw["longest_pause_seconds"]), 1),
        "total_pause_seconds": round(float(raw["total_pause_seconds"]), 1),
        "score": score,
        "label": _label(score),
        "source": "browser",
    }


def confidence_info(analysis: dict):
    """The five confidence parts and their weighted score for one spoken answer, or None.

    Only spoken, analysed answers get one (typed answers have no voice to judge), and at least two
    parts must be available.
    """
    if analysis.get("status") != "analyzed" or (analysis.get("input") or {}).get("source") != "speech":
        return None
    attention, expression = analysis.get("attention"), analysis.get("expression")
    hesitation = analysis.get("hesitation")
    speaking = _weighted(
        {
            "fillers": (analysis.get("fillers") or {}).get("score"),
            "pace": (analysis.get("pace") or {}).get("score"),
            "composure": expression["composure"] if expression else None,
        },
        SPEAKING_WEIGHTS,
    )
    parts = {
        "eye_contact": attention["score"] if attention else None,
        "attention_level": _clamp(attention["face_visible_pct"] - LOOK_AWAY_PENALTY * attention["look_away_events"]) if attention else None,
        "facial_engagement": expression["expressiveness"] if expression else None,
        "hesitation": hesitation["score"] if hesitation else None,
        "speaking_confidence": speaking,
    }
    if sum(1 for v in parts.values() if v is not None) < 2:
        return None
    score = round(_weighted(parts, CONFIDENCE_WEIGHTS), 1)
    return {
        "score": score,
        "label": _label(score),
        "parts": {k: (round(v) if v is not None else None) for k, v in parts.items()},
    }
