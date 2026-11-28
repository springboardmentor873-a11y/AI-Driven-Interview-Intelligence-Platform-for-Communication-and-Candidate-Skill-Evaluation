"""What status a question is in right now, and whether it may be started or answered.

Nothing here is stored - every status is worked out fresh from started_at,
skipped and the current time, so the server's clock is always the one that
decides, never the browser's.
"""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import InterviewSession

RESOLVED_STATUSES = {'answered', 'skipped', 'expired'}
GRACE_SECONDS = 5   # a little extra time for slow networks when saving the last answer
INACTIVITY_LIMIT = timedelta(minutes=15)   # close an interview nobody has touched in this long


def _has_answer(question):
    # A one-to-one reverse lookup raises DoesNotExist (an AttributeError subclass)
    # when there is no answer yet, so getattr(..., None) is the safe way to check.
    return getattr(question, 'answer', None) is not None


def question_status(question, now=None):
    """One of: pending, active, answered, skipped or expired."""
    if _has_answer(question):
        return 'answered'
    if question.skipped:
        return 'skipped'
    if question.started_at is None:
        return 'pending'
    now = now or timezone.now()
    deadline = question.started_at + timedelta(seconds=settings.INTERVIEW_QUESTION_SECONDS)
    return 'expired' if now > deadline else 'active'


def question_seconds_left(question, now=None):
    """Seconds left to answer. None unless the question is active right now."""
    if question_status(question, now) != 'active':
        return None
    now = now or timezone.now()
    used = (now - question.started_at).total_seconds()
    return max(0, int(settings.INTERVIEW_QUESTION_SECONDS - used))


def answer_deadline(question):
    """The moment after which an answer is no longer accepted (adds the grace period)."""
    return question.started_at + timedelta(seconds=settings.INTERVIEW_QUESTION_SECONDS + GRACE_SECONDS)


def active_question(session, questions=None):
    """The one question the candidate can currently work on, or None."""
    questions = questions if questions is not None else session.questions.all()
    for question in questions:
        if question_status(question) == 'active':
            return question
    return None


def earlier_questions_resolved(order_no, questions):
    """True when every question before `order_no` is answered, skipped or expired."""
    return all(question_status(q) in RESOLVED_STATUSES for q in questions if q.order_no < order_no)


def last_activity_at(session, questions):
    """The moment the server last heard from this interview: the latest question's
    own answer deadline (its started_at + question time + grace), or the interview's
    own start if no question has started yet."""
    started_times = [q.started_at for q in questions if q.started_at]
    if not started_times:
        return session.started_at
    return max(started_times) + timedelta(seconds=settings.INTERVIEW_QUESTION_SECONDS + GRACE_SECONDS)


def close_if_abandoned(session, now=None):
    """Close an in_progress interview nobody has touched for INACTIVITY_LIMIT:
    'completed' if it has at least one answer, otherwise 'abandoned'.
    Returns True if this call is the one that closed it."""
    if session.status != InterviewSession.Status.IN_PROGRESS:
        return False
    now = now or timezone.now()
    questions = list(session.questions.select_related('answer').all())
    last_activity = last_activity_at(session, questions)
    deadline = last_activity + INACTIVITY_LIMIT
    if not last_activity or now <= deadline:
        return False

    with transaction.atomic():
        # lock the row and look again, in case another request just answered or completed it
        locked = InterviewSession.objects.select_for_update().get(pk=session.pk)
        if locked.status != InterviewSession.Status.IN_PROGRESS:
            return False
        has_answer = any(_has_answer(q) for q in questions)
        locked.status = InterviewSession.Status.COMPLETED if has_answer else InterviewSession.Status.ABANDONED
        locked.ended_at = deadline
        locked.save(update_fields=['status', 'ended_at'])
    return True


def close_abandoned_for(user, now=None):
    """Close every one of this candidate's interviews that has been abandoned."""
    for session in InterviewSession.objects.filter(candidate=user, status=InterviewSession.Status.IN_PROGRESS):
        close_if_abandoned(session, now)
