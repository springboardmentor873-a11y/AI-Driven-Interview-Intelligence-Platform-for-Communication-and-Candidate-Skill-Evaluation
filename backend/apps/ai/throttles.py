from rest_framework.throttling import UserRateThrottle


class AIReviewThrottle(UserRateThrottle):
    """Limits how often one user can trigger AI reviews (analyze, score and feedback of an interview).

    Each of those can call Gemini, which costs money, and a stuck 'try again' loop or a script could repeat
    them without end. The limit is per user and set with AI_REVIEW_RATE (default 30/hour: a normal interview
    needs 2 calls). It is counted in Django's cache: with several server processes, use a shared cache such
    as Redis, otherwise each process counts on its own.
    """

    scope = "ai_review"

    def get_rate(self):
        # An admin can set the limit in the AI settings. Without one, the server default (AI_REVIEW_RATE) applies.
        try:
            from apps.system import store

            override = store.review_rate_override()
        except Exception:  # a problem reading settings must not stop interviews
            override = None
        return f"{override}/hour" if override else super().get_rate()
