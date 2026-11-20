import os
import unittest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.ai_services import generate_interview_questions

User = get_user_model()


class LiveGeminiSmokeTest(TestCase):
    """
    Live smoke test for Google Gemini API integration.
    Only executed when RUN_LIVE_GEMINI_TESTS=1 is set in the environment.
    """

    @unittest.skipUnless(
        bool(
            os.getenv("RUN_LIVE_GEMINI_TESTS") == "1"
            and settings.GEMINI_API_KEY
            and settings.GEMINI_API_KEY != "test-key"
        ),
        "Skipped: set RUN_LIVE_GEMINI_TESTS=1 with a verified GEMINI_API_KEY to execute live provider smoke test.",
    )
    def test_live_gemini_question_generation(self):
        result = generate_interview_questions(
            target_role="Full-Stack Developer",
            interview_type="TECHNICAL",
            difficulty="MEDIUM",
            skills=["Python", "React", "PostgreSQL"],
            question_count=1,
            local_only=False,
        )
        self.assertEqual(result.source, "gemini")
        self.assertEqual(len(result.data), 1)
        question = result.data[0]
        self.assertIn("question_text", question)
        self.assertIn("expected_criteria", question)
        self.assertTrue(len(question["question_text"]) > 10)
