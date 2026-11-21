"""The scoring engine (Milestone 3, Day 6).

Turns the analysis stored with each answer into the four scores in the SRS and the overall score:

    Communication 30%  Confidence 25%  Technical relevance 30%  Professionalism 15%

How one answer is scored
  communication       the answer's communication score (clarity, grammar, fillers, pace, completeness)
  confidence          the answer's confidence score (spoken answers only, see interviews/behavior.py)
  technical_relevance 80% Gemini's rating of the substance of the answer + 20% completeness
  professionalism     time management, response organization, professional communication (Gemini) and
                      interview etiquette (staying in the picture). At least 3 of the 4 must be known,
                      so the score is never made up from time management and etiquette alone.

How a whole interview is scored
  * A skipped or unanswered question counts as 0 in every part, so skipping cannot raise a score.
  * An answer where no words were captured is left out: the cause is often the microphone or the
    speech recognizer, not the candidate. If every answer is like that there is no score.
  * A part that could not be measured for any answer (for example technical relevance when Gemini was
    unavailable) is stored as None. The overall score then uses the remaining parts, rescaled, and the
    result is marked ``complete: false`` so it is clear that it is partial.
  * Parts are averaged over the answers where they could be measured, plus the zeros for skipped ones.
"""
from apps.interviews.behavior import LOOK_AWAY_PENALTY
from apps.interviews.models import Answer

from .models import Score

PROFESSIONALISM_WEIGHTS = {"time_management": 25, "organization": 25, "professional_communication": 30, "etiquette": 20}
MIN_PROFESSIONALISM_PARTS = 3
TECHNICAL_SHARE = 0.8  # of technical relevance: Gemini's rating of the content. The rest is completeness.
PART_NAMES = ("communication", "confidence", "technical_relevance", "professionalism")


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(high, value))


def time_management_score(duration_seconds, time_limit_seconds):
    """How well the time for a question was used.

    Using roughly 40% to 95% of the time is full marks. A very short answer scores low. Running right
    up to the limit (the clock ended it) scores 70: the answer was cut off or did not wrap up.
    """
    if not time_limit_seconds:
        return None
    used = duration_seconds / time_limit_seconds
    if used >= 0.98:
        return 70.0
    if used >= 0.4:
        return 100.0
    if used >= 0.15:
        return 40 + (used - 0.15) / 0.25 * 60
    return used / 0.15 * 40


def _weighted(parts: dict, weights: dict):
    present = {k: v for k, v in parts.items() if v is not None}
    total = sum(weights[k] for k in present)
    return sum(v * weights[k] for k, v in present.items()) / total if total else None


def score_answer(analysis: dict, time_limit_seconds: int) -> dict:
    """The four scores of one analysed answer (each may be None) plus the professionalism parts."""
    confidence = (analysis.get("confidence") or {}).get("score")
    technical, completeness = analysis.get("technical"), analysis.get("completeness")
    technical_relevance = (
        TECHNICAL_SHARE * technical["score"] + (1 - TECHNICAL_SHARE) * completeness["score"]
        if technical and completeness else None
    )
    attention = analysis.get("attention")
    parts = {
        "time_management": time_management_score(analysis.get("duration_seconds", 0), time_limit_seconds),
        "organization": (analysis.get("organization") or {}).get("score"),
        "professional_communication": (analysis.get("tone") or {}).get("score"),
        "etiquette": _clamp(attention["face_visible_pct"] - LOOK_AWAY_PENALTY * attention["look_away_events"]) if attention else None,
    }
    known = sum(1 for v in parts.values() if v is not None)
    professionalism = _weighted(parts, PROFESSIONALISM_WEIGHTS) if known >= MIN_PROFESSIONALISM_PARTS else None
    return {
        "communication": analysis.get("communication_score"),
        "confidence": confidence,
        "technical_relevance": technical_relevance,
        "professionalism": professionalism,
    }


def _round(value):
    return round(value, 1) if value is not None else None


def compute(session) -> dict | None:
    """Score a finished interview. Returns the numbers, or None when no answer could be scored."""
    answers = {a.question_id: a for a in Answer.objects.filter(question__session=session)}
    totals = {name: 0.0 for name in PART_NAMES}
    counts = {name: 0 for name in PART_NAMES}    # answers that count towards each part, skipped ones included
    measured = {name: 0 for name in PART_NAMES}  # of those, answers where the part could really be measured
    per_answer, skipped, excluded, scored = [], 0, 0, 0

    for question in session.questions.all():
        answer = answers.get(question.id)
        analysis = (answer.analysis if answer else None) or {}
        status = analysis.get("status")
        if answer is None or status == "skipped":
            skipped += 1
            for name in PART_NAMES:  # not attempted: zero in every part
                counts[name] += 1
            per_answer.append({"order": question.order, "status": "skipped", **{name: 0.0 for name in PART_NAMES}, "overall": 0.0})
            continue
        if status != "analyzed":
            excluded += 1  # no words captured (or not analysed yet): cannot be judged
            per_answer.append({"order": question.order, "status": status or "not_analyzed", **{name: None for name in PART_NAMES}})
            continue
        scored += 1
        parts = score_answer(analysis, question.time_limit_seconds)
        for name, value in parts.items():
            if value is not None:
                totals[name] += value
                counts[name] += 1
                measured[name] += 1
        overall, _ = Score.combine(parts)
        per_answer.append({"order": question.order, "status": "analyzed", **{k: _round(v) for k, v in parts.items()}, "overall": overall})

    if not scored:
        return None
    # A part with no measurement at all is None, even if skipped questions added zeros to its count
    parts = {name: _round(totals[name] / counts[name]) if measured[name] else None for name in PART_NAMES}
    overall, rating = Score.combine(parts)
    missing = [name for name in PART_NAMES if parts[name] is None]
    return {
        "parts": parts, "overall": overall, "rating": rating,
        "details": {
            "complete": not missing, "missing": missing,
            "questions_total": session.questions.count(),
            "answered": scored, "skipped": skipped, "excluded_no_transcript": excluded,
            "per_answer": per_answer,
        },
    }


def score_session(session):
    """Compute and save the score of a finished interview (one Score row per session). None if unscorable."""
    result = compute(session)
    if result is None:
        Score.objects.filter(session=session).delete()  # an old score no longer matches the answers
        return None
    parts = result["parts"]
    score, _ = Score.objects.update_or_create(
        session=session,
        defaults={
            "communication_score": parts["communication"],
            "confidence_score": parts["confidence"],
            "technical_relevance_score": parts["technical_relevance"],
            "professionalism_score": parts["professionalism"],
            "overall_score": result["overall"],
            "rating": result["rating"],
            "details": result["details"],
        },
    )
    return score
