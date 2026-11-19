import json
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from google.genai.errors import APIError
from httpx import ReadTimeout
from rest_framework.test import APIClient

from apps.ai_services import (
    AIResult,
    AIServiceError,
    AnswerEvaluationOutput,
    QuestionSetOutput,
    ResumeProfileOutput,
    _gemini_response_schema,
    evaluate_interview_answer,
    extract_resume_profile_from_text,
    extract_skills_from_resume_text,
    generate_interview_questions,
    redact_candidate_text,
)

User = get_user_model()


class AIProviderTests(TestCase):
    def setUp(self):
        self.client = Mock()
        self.client.models.generate_content.return_value = Mock(
            text=(
                '{"skills":["Python","Django"],"qualifications":[],'
                '"experience":[],"projects":[]}'
            )
        )

    @patch("apps.ai_services.genai.Client")
    def test_resume_profile_uses_gemini_and_redacts_contact_details(
        self, gemini_client
    ):
        gemini_client.return_value = self.client
        resume_text = (
            "Jane Candidate\n"
            "jane@example.com | +1 (555) 123-4567\n"
            "Python and Django experience"
        )

        with override_settings(
            GEMINI_API_KEY="test-key",
            GEMINI_MODEL="gemini-test",
            GEMINI_TIMEOUT_MS=12345,
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            result = extract_resume_profile_from_text(resume_text)

        self.assertEqual(result.source, "gemini")
        self.assertEqual(result.data["skills"], ["Python", "Django"])
        gemini_client.assert_called_once()
        self.assertEqual(
            gemini_client.call_args.kwargs["api_key"],
            "test-key",
        )
        self.assertEqual(
            gemini_client.call_args.kwargs["http_options"].timeout,
            12345,
        )
        prompt = self.client.models.generate_content.call_args.kwargs["contents"]
        self.assertNotIn("jane@example.com", prompt)
        self.assertNotIn("555", prompt)
        schema = self.client.models.generate_content.call_args.kwargs[
            "config"
        ].response_schema
        self.assertNotIn("additional_properties", json.dumps(schema))
        self.client.close.assert_called_once()

    def test_gemini_response_schemas_omit_unsupported_properties(self):
        for output_model in (
            ResumeProfileOutput,
            QuestionSetOutput,
            AnswerEvaluationOutput,
        ):
            with self.subTest(output_model=output_model.__name__):
                schema = _gemini_response_schema(output_model)
                self.assertNotIn("additionalProperties", json.dumps(schema))

    @patch("apps.ai_services.genai.Client")
    def test_question_generation_validates_json_and_difficulty(
        self, gemini_client
    ):
        self.client.models.generate_content.return_value = Mock(
            text=(
                '{"questions":['
                '{"question_text":"For a Backend Engineer, how would you design a REST API in Python?",'
                '"difficulty":"INTERMEDIATE","topic":"Python REST API design",'
                '"category":"API","question_type":"PRACTICAL","question_style":"PRACTICAL",'
                '"expected_criteria":["HTTP semantics","Clear example"],'
                '"relevance_basis":"skill_1","relevance_explanation":"For a Backend Engineer, Python informs the API design."},'
                '{"question_text":"For a Backend Engineer, how would you diagnose a Python endpoint that fails on some inputs?",'
                '"difficulty":"INTERMEDIATE","topic":"Python endpoint diagnosis",'
                '"category":"Testing","question_type":"PRACTICAL","question_style":"PROBLEM_SOLVING",'
                '"expected_criteria":["Test cases","Assertions"],'
                '"relevance_basis":"skill_1","relevance_explanation":"For a Backend Engineer, Python is central to this endpoint issue."}]}'
            )
        )
        gemini_client.return_value = self.client

        with override_settings(
            GEMINI_API_KEY="test-key",
            GEMINI_MODEL="gemini-test",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            result = generate_interview_questions(
                target_role="Backend Engineer",
                interview_type="TECHNICAL",
                difficulty="MEDIUM",
                skills=["Python"],
                question_count=2,
                experience=[
                    {
                        "role": "API Developer",
                        "highlights": ["Maintained Python endpoints"],
                    }
                ],
                projects=[
                    {
                        "name": "Task service",
                        "technologies": ["Python", "Django"],
                        "description": "A task management API.",
                    }
                ],
            )

        self.assertEqual(result.source, "gemini")
        self.assertEqual(len(result.data), 2)
        self.assertEqual(result.data[0]["difficulty"], "INTERMEDIATE")
        self.assertEqual(result.data[1]["question_type"], "PRACTICAL")
        self.assertEqual(
            {question["question_style"] for question in result.data},
            {"PRACTICAL", "PROBLEM_SOLVING"},
        )
        prompt = self.client.models.generate_content.call_args.kwargs[
            "contents"
        ]
        self.assertIn("Backend Engineer", prompt)
        self.assertIn("Python", prompt)
        self.assertIn("Task service", prompt)
        self.assertIn("Maintained Python endpoints", prompt)
        self.assertIn("INTERMEDIATE", prompt)

    def test_synthetic_profiles_generate_role_anchored_varied_fallbacks(self):
        profiles = (
            ("Data Science", ["Python", "Pandas", "scikit-learn"]),
            ("Backend Development", ["Python", "Django", "PostgreSQL"]),
            ("Frontend Development", ["JavaScript", "React", "CSS"]),
            (
                "Java Software Development",
                ["Java", "Spring Boot", "PostgreSQL"],
            ),
        )
        expected_levels = {
            "EASY": "BEGINNER",
            "MEDIUM": "INTERMEDIATE",
            "HARD": "ADVANCED",
        }

        with override_settings(
            GEMINI_API_KEY="",
            AI_DETERMINISTIC_FALLBACK=True,
        ):
            for role, skills in profiles:
                first_question_by_level = {}
                for difficulty, expected_level in expected_levels.items():
                    with self.subTest(role=role, difficulty=difficulty):
                        result = generate_interview_questions(
                            target_role=role,
                            interview_type="TECHNICAL",
                            difficulty=difficulty,
                            skills=skills,
                            question_count=4,
                            local_only=True,
                        )

                        self.assertEqual(result.source, "fallback")
                        self.assertEqual(len(result.data), 4)
                        first_question_by_level[
                            expected_level
                        ] = result.data[0]["question_text"]
                        self.assertEqual(
                            {item["difficulty"] for item in result.data},
                            {expected_level},
                        )
                        self.assertEqual(
                            {item["question_style"] for item in result.data},
                            {
                                "CONCEPTUAL",
                                "PRACTICAL",
                                "SCENARIO",
                                "PROBLEM_SOLVING",
                            },
                        )
                        self.assertEqual(
                            len({item["topic"] for item in result.data}),
                            4,
                        )
                        for item in result.data:
                            self.assertIn(role, item["question_text"])
                            self.assertTrue(
                                any(
                                    skill in item["question_text"]
                                    for skill in skills
                                )
                            )
                            self.assertIn(role, item["relevance_explanation"])
                self.assertIn(
                    "simple example",
                    first_question_by_level["BEGINNER"],
                )
                self.assertIn(
                    "maintainable feature",
                    first_question_by_level["INTERMEDIATE"],
                )
                self.assertIn(
                    "failure modes",
                    first_question_by_level["ADVANCED"],
                )
                self.assertEqual(
                    len(set(first_question_by_level.values())),
                    3,
                )

    @patch("apps.ai_services.genai.Client")
    def test_repeated_gemini_concepts_use_labeled_fallback(
        self, gemini_client
    ):
        self.client.models.generate_content.return_value = Mock(
            text=(
                '{"questions":['
                '{"question_text":"For a Backend Engineer, how would you design a Python API?",'
                '"difficulty":"BEGINNER","topic":"Python API","category":"API",'
                '"question_type":"PRACTICAL","question_style":"PRACTICAL",'
                '"expected_criteria":["Correct approach","Clear example"],'
                '"relevance_basis":"skill_1","relevance_explanation":"Python matters to a Backend Engineer."},'
                '{"question_text":"For a Backend Engineer, how would you improve a Python API?",'
                '"difficulty":"BEGINNER","topic":"Python API","category":"API",'
                '"question_type":"PRACTICAL","question_style":"SCENARIO",'
                '"expected_criteria":["Correct approach","Clear example"],'
                '"relevance_basis":"skill_1","relevance_explanation":"Python matters to a Backend Engineer."}]}'
            )
        )
        gemini_client.return_value = self.client
        with override_settings(
            GEMINI_API_KEY="test-key",
            AI_DETERMINISTIC_FALLBACK=True,
        ):
            result = generate_interview_questions(
                target_role="Backend Engineer",
                interview_type="TECHNICAL",
                difficulty="EASY",
                skills=["Python"],
                question_count=2,
            )

        self.assertEqual(result.source, "fallback")
        self.assertEqual(len({item["topic"] for item in result.data}), 2)

    @patch("apps.ai_services.genai.Client")
    def test_answer_evaluation_uses_structured_gemini_response(
        self, gemini_client
    ):
        self.client.models.generate_content.return_value = Mock(
            text=(
                '{"correctness":{"score":4,"feedback":"Accurate"},'
                '"relevance":{"score":5,"feedback":"On topic"},'
                '"clarity":{"score":4,"feedback":"Clear"},'
                '"completeness":{"score":3,"feedback":"Add a test case"},'
                '"overall_feedback":"Good practice answer.",'
                '"improvement_suggestions":["Add an example"]}'
            )
        )
        gemini_client.return_value = self.client

        with override_settings(
            GEMINI_API_KEY="test-key",
            GEMINI_MODEL="gemini-test",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            result = evaluate_interview_answer(
                question_text="How would you test this endpoint?",
                answer_text="I would test success and error cases.",
                expected_criteria=["Test cases", "Error handling"],
            )

        self.assertEqual(result.source, "gemini")
        self.assertEqual(result.data["correctness"]["score"], 4)
        self.assertIn("not an objective", result.data["disclaimer"])

    def test_local_fallback_works_without_a_key_and_is_attributed(self):
        with override_settings(
            GEMINI_API_KEY="",
            AI_DETERMINISTIC_FALLBACK=True,
        ):
            profile = extract_skills_from_resume_text(
                "Python developer experience. Built a Django project."
            )
            questions = generate_interview_questions(
                target_role="Backend Engineer",
                interview_type="TECHNICAL",
                difficulty="EASY",
                skills=["Python", "Django"],
                question_count=2,
            )
            evaluation = evaluate_interview_answer(
                question_text="Explain Python.",
                answer_text="Python is useful for backend services and scripting.",
                expected_criteria=["Explain a use case"],
            )

        self.assertEqual(profile.source, "fallback")
        self.assertIn("Python", profile.data["skills"])
        self.assertEqual(questions.source, "fallback")
        self.assertEqual(len(questions.data), 2)
        self.assertEqual(evaluation.source, "fallback")
        redacted = redact_candidate_text(
            "Email: a@example.com\nPortfolio: https://example.com"
        )
        self.assertNotIn("a@example.com", redacted)
        self.assertNotIn("https://example.com", redacted)
        self.assertIn("[redacted URL]", redacted)

    @patch("apps.ai_services.genai.Client")
    def test_local_only_processing_never_calls_gemini(self, gemini_client):
        with override_settings(
            GEMINI_API_KEY="test-key",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            profile = extract_resume_profile_from_text(
                "Python developer",
                local_only=True,
            )
            questions = generate_interview_questions(
                target_role="Backend Engineer",
                interview_type="TECHNICAL",
                difficulty="EASY",
                skills=["Python"],
                question_count=1,
                local_only=True,
            )
            evaluation = evaluate_interview_answer(
                question_text="Explain Python.",
                answer_text="Python is useful for backend services.",
                expected_criteria=["Explain a use case"],
                local_only=True,
            )

        self.assertEqual(profile.source, "fallback")
        self.assertEqual(questions.source, "fallback")
        self.assertEqual(evaluation.source, "fallback")
        gemini_client.assert_not_called()

    @patch("apps.ai_services.genai.Client")
    def test_provider_errors_have_safe_explanations(
        self, gemini_client
    ):
        gemini_client.return_value = self.client
        for error, expected in (
            (
                APIError(401, {"error": {"message": "unauthorized"}}),
                "Gemini rejected the API key",
            ),
            (
                APIError(
                    400,
                    {
                        "error": {
                            "details": [{"reason": "API_KEY_INVALID"}],
                        },
                    },
                ),
                "Gemini rejected the API key",
            ),
            (
                APIError(429, {"error": {"message": "quota"}}),
                "rate limit or quota",
            ),
            (
                APIError(503, {"error": {"message": "busy"}}),
                "temporarily unavailable",
            ),
        ):
            self.client.models.generate_content.side_effect = error
            with override_settings(
                GEMINI_API_KEY="invalid-test-key",
                AI_DETERMINISTIC_FALLBACK=False,
            ):
                with self.assertRaisesRegex(AIServiceError, expected):
                    extract_resume_profile_from_text("resume text")
        self.assertNotIn(
            "invalid-test-key",
            str(self.client.models.generate_content.side_effect),
        )

    @patch("apps.ai_services.genai.Client")
    def test_503_retries_with_exponential_backoff_and_recovers(
        self, gemini_client
    ):
        gemini_client.return_value = self.client
        self.client.models.generate_content.side_effect = [
            APIError(503, {"error": {"message": "busy"}}),
            APIError(503, {"error": {"message": "busy"}}),
            Mock(
                text=(
                    '{"skills":["Python"],"qualifications":[],"experience":[],'
                    '"projects":[]}'
                )
            ),
        ]

        with patch("apps.ai_services.time.sleep") as sleep:
            with override_settings(
                GEMINI_API_KEY="test-key",
                AI_DETERMINISTIC_FALLBACK=False,
            ):
                result = extract_resume_profile_from_text("Python developer")

        self.assertEqual(result.source, "gemini")
        self.assertEqual(
            self.client.models.generate_content.call_count,
            3,
        )
        self.assertEqual(
            [call.args[0] for call in sleep.call_args_list],
            [1, 2],
        )

    @patch("apps.ai_services.genai.Client")
    def test_503_retry_limit_keeps_deterministic_fallback(
        self, gemini_client
    ):
        gemini_client.return_value = self.client
        self.client.models.generate_content.side_effect = APIError(
            503,
            {"error": {"message": "busy"}},
        )

        with patch("apps.ai_services.time.sleep") as sleep:
            with override_settings(
                GEMINI_API_KEY="test-key",
                AI_DETERMINISTIC_FALLBACK=True,
            ):
                result = extract_resume_profile_from_text(
                    "Python developer"
                )

        self.assertEqual(result.source, "fallback")
        self.assertEqual(
            self.client.models.generate_content.call_count,
            3,
        )
        self.assertEqual(
            [call.args[0] for call in sleep.call_args_list],
            [1, 2],
        )

    @patch("apps.ai_services.genai.Client")
    def test_malformed_json_uses_explicit_fallback(self, gemini_client):
        gemini_client.return_value = self.client
        self.client.models.generate_content.return_value = Mock(
            text="{malformed"
        )

        with override_settings(
            GEMINI_API_KEY="test-key",
            AI_DETERMINISTIC_FALLBACK=True,
        ):
            result = extract_resume_profile_from_text("Python developer")

        self.assertEqual(result.source, "fallback")
        self.assertIn("Python", result.data["skills"])

    @patch("apps.ai_services.genai.Client")
    def test_network_timeout_has_a_safe_message(self, gemini_client):
        gemini_client.return_value = self.client
        self.client.models.generate_content.side_effect = ReadTimeout(
            "request timed out"
        )

        with override_settings(
            GEMINI_API_KEY="test-key",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            with self.assertRaisesRegex(
                AIServiceError,
                "connection to Gemini timed out",
            ):
                extract_resume_profile_from_text("Python developer")


class CandidateInterviewAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.candidate = User.objects.create_user(
            username="candidate",
            email="candidate@example.com",
            password="StrongPass123!",
            role=User.Role.CANDIDATE,
        )
        self.recruiter = User.objects.create_user(
            username="recruiter",
            email="recruiter@example.com",
            password="StrongPass123!",
            role=User.Role.RECRUITER,
        )
        self.other_candidate = User.objects.create_user(
            username="other-candidate",
            email="other@example.com",
            password="StrongPass123!",
            role=User.Role.CANDIDATE,
        )

    def test_only_candidates_can_create_interviews(self):
        self.client.force_authenticate(self.candidate)
        candidate_response = self.client.post(
            "/api/interviews/",
            {"interview_type": "TECHNICAL"},
            format="json",
        )

        self.assertEqual(candidate_response.status_code, 201)
        self.assertEqual(
            candidate_response.data["candidate"],
            self.candidate.pk,
        )

        self.client.force_authenticate(self.recruiter)
        recruiter_response = self.client.post(
            "/api/interviews/",
            {"interview_type": "TECHNICAL"},
            format="json",
        )

        self.assertEqual(recruiter_response.status_code, 403)

    def test_candidate_cannot_read_another_candidates_interview(self):
        self.client.force_authenticate(self.candidate)
        create_response = self.client.post(
            "/api/interviews/",
            {"interview_type": "TECHNICAL"},
            format="json",
        )
        interview_id = create_response.data["id"]

        self.client.force_authenticate(self.other_candidate)
        response = self.client.get(f"/api/interviews/{interview_id}/")

        self.assertEqual(response.status_code, 404)

    def test_generated_interview_can_be_started_and_completed(self):
        resume = self.candidate.resumes.create(
            file="resumes/test-resume.pdf"
        )
        self.client.force_authenticate(self.candidate)

        with (
            patch(
                "apps.interviews.views.extract_skills_for_resume",
                return_value=AIResult(
                    data={
                        "skills": ["Python", "Django"],
                        "qualifications": [],
                        "experience": [],
                        "projects": [],
                    },
                    source="fallback",
                ),
            ) as extract_skills,
            patch(
                "apps.interviews.views.generate_interview_questions",
                return_value=AIResult(
                    data=[
                        {
                            "question_text": "How do you design a Django API?",
                            "difficulty": "ADVANCED",
                            "topic": "Django",
                            "category": "Django",
                            "question_type": "TECHNICAL",
                            "question_style": "CONCEPTUAL",
                            "relevance_explanation": (
                                "[skill_2: Django] Connected to Backend Engineer work."
                            ),
                            "expected_criteria": ["Trade-offs", "Clear design"],
                        },
                        {
                            "question_text": "How do you test Python services?",
                            "difficulty": "ADVANCED",
                            "topic": "Python",
                            "category": "Python",
                            "question_type": "PRACTICAL",
                            "question_style": "PRACTICAL",
                            "relevance_explanation": (
                                "[skill_1: Python] Connected to Backend Engineer work."
                            ),
                            "expected_criteria": ["Test cases", "Assertions"],
                        },
                    ],
                    source="fallback",
                ),
            ) as generate_questions,
        ):
            create_response = self.client.post(
                "/api/interviews/generate/",
                {
                    "resume": resume.pk,
                    "target_role": "Backend Engineer",
                    "interview_type": "TECHNICAL",
                    "difficulty": "HARD",
                    "total_questions": 2,
                    "ai_consent": True,
                },
                format="json",
            )

        self.assertEqual(create_response.status_code, 201)
        interview_id = create_response.data["id"]
        extract_skills.assert_called_once_with(resume, local_only=False)
        generate_questions.assert_called_once_with(
            target_role="Backend Engineer",
            interview_type="TECHNICAL",
            difficulty="HARD",
            skills=["Python", "Django"],
            question_count=2,
            previous_questions=[],
            previous_topics=[],
            experience=[],
            projects=[],
            local_only=False,
        )
        self.assertEqual(create_response.data["resume"], resume.pk)
        self.assertEqual(
            create_response.data["generation_source"],
            "fallback",
        )

        start_response = self.client.post(
            f"/api/interviews/{interview_id}/start/"
        )
        self.assertEqual(start_response.status_code, 200)
        self.assertEqual(start_response.data["status"], "IN_PROGRESS")
        self.assertIsNotNone(start_response.data["started_at"])

        questions_response = self.client.get(
            f"/api/interviews/{interview_id}/questions/"
        )
        questions = questions_response.data
        self.assertEqual(len(questions), 2)
        self.assertEqual(questions[0]["topic"], "Django")
        self.assertEqual(questions[0]["question_style"], "CONCEPTUAL")
        self.assertNotIn("relevance_explanation", questions[0])
        self.assertEqual(questions[0]["difficulty"], "HARD")
        self.assertEqual(
            questions[0]["expected_criteria"],
            ["Trade-offs", "Clear design"],
        )
        stored_question = resume.interviews.get(
            pk=interview_id
        ).questions.get(order=1)
        self.assertIn("Django", stored_question.relevance_explanation)

        evaluation = {
            "correctness": {"score": 4, "feedback": "Reasonable."},
            "relevance": {"score": 4, "feedback": "Relevant."},
            "clarity": {"score": 3, "feedback": "Explain more."},
            "completeness": {"score": 3, "feedback": "Add detail."},
            "overall_feedback": "Practice feedback.",
            "improvement_suggestions": ["Add an example."],
            "disclaimer": "Practice feedback only.",
        }
        with patch(
            "apps.interviews.views.evaluate_interview_answer",
            return_value=AIResult(data=evaluation, source="gemini"),
        ) as evaluate:
            for question in questions:
                answer_response = self.client.post(
                    f"/api/interviews/questions/{question['id']}/answer/",
                    {
                        "answer_text": "I would explain the approach and tradeoffs.",
                        "ai_consent": True,
                    },
                    format="json",
                )
                self.assertEqual(answer_response.status_code, 201)
                self.assertEqual(answer_response.data["evaluation"], evaluation)
                self.assertEqual(answer_response.data["evaluation_source"], "gemini")
            self.assertEqual(evaluate.call_count, 2)

        retrieved_questions = self.client.get(
            f"/api/interviews/{interview_id}/questions/"
        )
        self.assertEqual(
            retrieved_questions.data[0]["answer"]["evaluation"],
            evaluation,
        )

        interview = self.candidate.interviews.get(pk=interview_id)
        self.assertEqual(interview.status, interview.Status.COMPLETED)
        self.assertEqual(interview.current_question, 2)
        self.assertIsNotNone(interview.completed_at)

    def test_project_and_experience_context_requires_consent(self):
        from django.utils import timezone

        resume = self.candidate.resumes.create(
            file="resumes/profile.pdf",
            extracted_skills=["Python"],
            extracted_experience=[
                {
                    "role": "API Developer",
                    "organization": "Synthetic Org",
                    "duration": "2022-2024",
                    "highlights": ["Maintained test APIs"],
                }
            ],
            extracted_projects=[
                {
                    "name": "Synthetic Catalog",
                    "technologies": ["Python", "Django"],
                    "description": "A catalog API for synthetic records.",
                }
            ],
            skills_extracted_at=timezone.now(),
        )
        self.client.force_authenticate(self.candidate)
        generated = AIResult(
            data=[
                {
                    "question_text": (
                        "How would you validate a Python catalog API?"
                    ),
                    "difficulty": "INTERMEDIATE",
                    "topic": "Python validation",
                    "category": "API",
                    "question_type": "PRACTICAL",
                    "question_style": "PRACTICAL",
                    "relevance_explanation": (
                        "[skill_1: Python] Relevant to Backend Engineer work."
                    ),
                    "expected_criteria": [
                        "Explains validation",
                        "Gives a relevant example",
                    ],
                }
            ],
            source="fallback",
        )
        with patch(
            "apps.interviews.views.generate_interview_questions",
            return_value=generated,
        ) as generate_questions:
            response = self.client.post(
                "/api/interviews/generate/",
                {
                    "resume": resume.pk,
                    "target_role": "Backend Engineer",
                    "interview_type": "TECHNICAL",
                    "total_questions": 1,
                    "ai_consent": True,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        consented_call = generate_questions.call_args.kwargs
        self.assertEqual(consented_call["skills"], ["Python"])
        self.assertEqual(consented_call["projects"][0]["name"], "Synthetic Catalog")
        self.assertEqual(
            consented_call["experience"][0]["highlights"],
            ["Maintained test APIs"],
        )
        self.assertFalse(consented_call["local_only"])

        with patch(
            "apps.interviews.views.generate_interview_questions",
            return_value=generated,
        ) as generate_questions:
            declined = self.client.post(
                "/api/interviews/generate/",
                {
                    "resume": resume.pk,
                    "target_role": "Backend Engineer",
                    "interview_type": "TECHNICAL",
                    "total_questions": 1,
                    "ai_consent": False,
                },
                format="json",
            )

        self.assertEqual(declined.status_code, 201)
        declined_call = generate_questions.call_args.kwargs
        self.assertEqual(declined_call["experience"], [])
        self.assertEqual(declined_call["projects"], [])
        self.assertTrue(declined_call["local_only"])

    def test_candidate_cannot_generate_an_interview_from_another_resume(self):
        other_resume = self.other_candidate.resumes.create(
            file="resumes/other-resume.pdf"
        )
        self.client.force_authenticate(self.candidate)

        response = self.client.post(
            "/api/interviews/generate/",
            {
                "resume": other_resume.pk,
                "interview_type": "TECHNICAL",
                "ai_consent": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_generation_reports_missing_ai_configuration(self):
        self.client.force_authenticate(self.candidate)

        with override_settings(
            GEMINI_API_KEY="",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            response = self.client.post(
                "/api/interviews/generate/",
                {
                    "interview_type": "TECHNICAL",
                    "ai_consent": True,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("GEMINI_API_KEY", response.data["detail"])
        self.assertEqual(self.candidate.interviews.count(), 0)

    @patch("apps.ai_services.genai.Client")
    def test_interview_generation_without_consent_uses_local_fallback(
        self, gemini_client
    ):
        self.client.force_authenticate(self.candidate)
        with override_settings(
            GEMINI_API_KEY="test-key",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            response = self.client.post(
                "/api/interviews/generate/",
                {"interview_type": "TECHNICAL", "ai_consent": False},
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["generation_source"], "fallback")
        interview = self.candidate.interviews.get(pk=response.data["id"])
        self.assertEqual(interview.questions.count(), 5)
        gemini_client.assert_not_called()

    @patch("apps.ai_services.genai.Client")
    def test_answer_without_consent_uses_local_feedback(self, gemini_client):
        interview = self.candidate.interviews.create(
            interview_type="TECHNICAL",
            status="IN_PROGRESS",
            total_questions=1,
        )
        question = interview.questions.create(
            question_text="Explain a database index.",
            topic="Databases",
            expected_criteria=["Explain lookup behavior"],
            order=1,
        )
        self.client.force_authenticate(self.candidate)

        with override_settings(
            GEMINI_API_KEY="test-key",
            AI_DETERMINISTIC_FALLBACK=False,
        ):
            response = self.client.post(
                f"/api/interviews/questions/{question.pk}/answer/",
                {
                    "answer_text": "An index helps locate records.",
                    "ai_consent": False,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        self.assertIsNotNone(response.data["evaluation"])
        self.assertEqual(response.data["evaluation_source"], "fallback")
        gemini_client.assert_not_called()
        answer = question.answer
        self.assertIsNotNone(answer.evaluation)
        self.assertEqual(answer.evaluation_source, "fallback")
