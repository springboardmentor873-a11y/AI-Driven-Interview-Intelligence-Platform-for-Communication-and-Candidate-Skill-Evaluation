"""When is an interview over, and closing the ones nobody finished."""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import Answer, InterviewSession

GRACE_SECONDS = 30   # small extra time for slow networks when saving the last answer


def deadline_for(session):
    """The moment after which answers are no longer accepted."""
    return session.started_at + timedelta(minutes=session.time_limit_minutes, seconds=GRACE_SECONDS)


def close_if_expired(session):
    """Close a running interview whose time limit + 30 seconds has passed.

    completed = it has at least one answer, abandoned = it has none.
    ended_at is the closing time (the deadline), not the moment someone looked at it.
    Returns True if this call closed the interview.
    """
    if session.status != InterviewSession.Status.IN_PROGRESS or not session.started_at:
        return False
    if timezone.now() <= deadline_for(session):
        return False

    with transaction.atomic():
        # lock the row and look again, in case an answer or another request just changed it
        locked = InterviewSession.objects.select_for_update().get(pk=session.pk)
        if locked.status != InterviewSession.Status.IN_PROGRESS:
            return False
        has_answer = Answer.objects.filter(question__session=locked).exists()
        locked.status = InterviewSession.Status.COMPLETED if has_answer else InterviewSession.Status.ABANDONED
        locked.ended_at = deadline_for(locked)
        locked.save(update_fields=['status', 'ended_at'])
    return True


def close_expired_for(user):
    """Close every expired running interview of one candidate."""
    for session in InterviewSession.objects.filter(candidate=user, status=InterviewSession.Status.IN_PROGRESS):
        close_if_expired(session)
