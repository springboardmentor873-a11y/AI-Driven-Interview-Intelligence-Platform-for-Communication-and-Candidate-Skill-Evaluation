from rest_framework.throttling import UserRateThrottle


class AIReviewThrottle(UserRateThrottle):
    """Limits how often one user can trigger AI reviews (analyze, score and feedback of an interview).

    Each of those can call Gemini, which costs money, and a stuck 'try again' loop or a script could repeat
    them without end. The limit is per user and set with AI_REVIEW_RATE (default 30/hour: a normal interview
    needs 2 calls). It is counted in Django's cache: with several server processes, use a shared cache such
    as Redis, otherwise each process counts on its own.
    """

    scope = "ai_review"
