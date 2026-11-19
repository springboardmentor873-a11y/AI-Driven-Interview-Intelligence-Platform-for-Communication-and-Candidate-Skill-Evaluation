from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.services import ResumeParseError, extract_skills_for_resume
from apps.ai_services import (
    AIServiceError,
    AIServiceUnavailable,
    evaluate_interview_answer,
    generate_interview_questions,
)
from apps.accounts.permissions import IsCandidate

from .models import Answer, Interview, Question
from .serializers import (
    AnswerSerializer,
    InterviewGenerationSerializer,
    InterviewSerializer,
    QuestionSerializer,
)


class InterviewListCreateView(generics.ListCreateAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return Interview.objects.filter(
            candidate=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(candidate=self.request.user)


class GenerateInterviewView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request):
        serializer = InterviewGenerationSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ai_consent = data["ai_consent"]
        resume = data.get("resume")

        profile = {
            "skills": [],
            "experience": [],
            "projects": [],
        }
        if resume:
            profile = {
                "skills": resume.extracted_skills,
                "experience": resume.extracted_experience,
                "projects": resume.extracted_projects,
            }
        if resume and resume.skills_extracted_at is None:
            try:
                profile_result = extract_skills_for_resume(
                    resume,
                    local_only=not ai_consent,
                )
                profile = profile_result.data
            except ResumeParseError as exc:
                raise ValidationError({"resume": str(exc)}) from exc
            except AIServiceError as exc:
                raise AIServiceUnavailable(str(exc)) from exc

        skills = profile["skills"]
        experience = profile["experience"] if ai_consent else []
        projects = profile["projects"] if ai_consent else []
        previous_questions = list(
            Question.objects.filter(interview__candidate=request.user)
            .order_by("-created_at")
            .values_list("question_text", flat=True)[:50]
        )
        previous_topics = list(
            Question.objects.filter(interview__candidate=request.user)
            .order_by("-created_at")
            .values_list("topic", flat=True)[:50]
        )
        try:
            generation_result = generate_interview_questions(
                target_role=data["target_role"],
                interview_type=data["interview_type"],
                difficulty=data["difficulty"],
                skills=skills,
                question_count=data["total_questions"],
                previous_questions=previous_questions,
                previous_topics=previous_topics,
                experience=experience,
                projects=projects,
                local_only=not ai_consent,
            )
        except AIServiceError as exc:
            raise AIServiceUnavailable(str(exc)) from exc

        difficulty_values = {
            "BEGINNER": Interview.Difficulty.EASY,
            "INTERMEDIATE": Interview.Difficulty.MEDIUM,
            "ADVANCED": Interview.Difficulty.HARD,
        }
        with transaction.atomic():
            interview = Interview.objects.create(
                candidate=request.user,
                resume=resume,
                target_role=data["target_role"],
                interview_type=data["interview_type"],
                difficulty=data["difficulty"],
                total_questions=data["total_questions"],
                generation_source=generation_result.source,
            )
            Question.objects.bulk_create(
                [
                    Question(
                        interview=interview,
                        question_text=question["question_text"],
                        category=question["category"],
                        topic=question["topic"],
                        question_style=question["question_style"],
                        relevance_explanation=question[
                            "relevance_explanation"
                        ],
                        difficulty=difficulty_values[question["difficulty"]],
                        question_type=question["question_type"],
                        expected_criteria=question["expected_criteria"],
                        order=order,
                    )
                    for order, question in enumerate(
                        generation_result.data,
                        start=1,
                    )
                ]
            )
        return Response(
            InterviewSerializer(interview).data,
            status=201,
        )


class InterviewDetailView(generics.RetrieveAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return Interview.objects.filter(
            candidate=self.request.user
        )


class StartInterviewView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        interview = get_object_or_404(
            Interview,
            pk=pk,
            candidate=request.user,
        )
        if interview.status == Interview.Status.COMPLETED:
            raise ValidationError("This interview has already been completed.")
        if interview.status in (
            Interview.Status.PAUSED,
            Interview.Status.ABANDONED,
        ):
            raise ValidationError("This interview is not accepting answers.")
        if interview.status == Interview.Status.ABANDONED:
            raise ValidationError("This interview has been abandoned.")
        if interview.status == Interview.Status.PAUSED:
            raise ValidationError("Resume this interview instead of starting it.")
        if not interview.questions.exists():
            raise ValidationError("This interview has no questions.")

        update_fields = []
        if interview.status == Interview.Status.CREATED:
            interview.status = Interview.Status.IN_PROGRESS
            update_fields.append("status")
        if interview.started_at is None:
            interview.started_at = timezone.now()
            update_fields.append("started_at")
        if update_fields:
            interview.save(update_fields=update_fields)

        return Response(InterviewSerializer(interview).data)


class PauseInterviewView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        interview = get_object_or_404(
            Interview,
            pk=pk,
            candidate=request.user,
        )
        if interview.status != Interview.Status.IN_PROGRESS:
            raise ValidationError("Only an in-progress interview can be paused.")
        elapsed_seconds = request.data.get("elapsed_seconds")
        if elapsed_seconds is not None:
            interview.elapsed_seconds = max(
                interview.elapsed_seconds,
                int(elapsed_seconds),
            )
        interview.status = Interview.Status.PAUSED
        interview.paused_at = timezone.now()
        interview.save(
            update_fields=["status", "paused_at", "elapsed_seconds"]
        )
        return Response(InterviewSerializer(interview).data)


class ResumeInterviewView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        interview = get_object_or_404(
            Interview,
            pk=pk,
            candidate=request.user,
        )
        if interview.status != Interview.Status.PAUSED:
            raise ValidationError("Only a paused interview can be resumed.")
        interview.status = Interview.Status.IN_PROGRESS
        interview.paused_at = None
        interview.save(update_fields=["status", "paused_at"])
        return Response(InterviewSerializer(interview).data)


class AbandonInterviewView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        interview = get_object_or_404(
            Interview,
            pk=pk,
            candidate=request.user,
        )
        if interview.status in (
            Interview.Status.COMPLETED,
            Interview.Status.ABANDONED,
        ):
            raise ValidationError("This interview is already finished.")
        elapsed_seconds = request.data.get("elapsed_seconds")
        if elapsed_seconds is not None:
            interview.elapsed_seconds = max(
                interview.elapsed_seconds,
                int(elapsed_seconds),
            )
        interview.status = Interview.Status.ABANDONED
        interview.completed_at = timezone.now()
        interview.save(
            update_fields=["status", "completed_at", "elapsed_seconds"]
        )
        return Response(InterviewSerializer(interview).data)


class InterviewRecordingView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        interview = get_object_or_404(
            Interview,
            pk=pk,
            candidate=request.user,
        )
        recording = request.FILES.get("recording")
        if recording is None:
            raise ValidationError({"recording": "Choose a recording to upload."})
        if recording.size > 100 * 1024 * 1024:
            raise ValidationError(
                {"recording": "Recording files must be 100 MB or smaller."}
            )
        if not recording.content_type.startswith(("video/", "audio/")):
            raise ValidationError(
                {"recording": "Only audio or video recordings are supported."}
            )
        if interview.recording:
            interview.recording.delete(save=False)
        interview.recording = recording
        interview.save(update_fields=["recording"])
        return Response(InterviewSerializer(interview).data)


class InterviewRecordingDownloadView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request, pk):
        interview = get_object_or_404(
            Interview,
            pk=pk,
            candidate=request.user,
        )
        if not interview.recording:
            raise ValidationError("This interview has no recording.")
        return FileResponse(
            interview.recording.open("rb"),
            as_attachment=True,
        )


class QuestionListCreateView(generics.ListCreateAPIView):
    serializer_class = QuestionSerializer
    permission_classes = [IsCandidate]

    def get_interview(self):
        return generics.get_object_or_404(
            Interview,
            pk=self.kwargs["pk"],
            candidate=self.request.user,
        )

    def get_queryset(self):
        interview = self.get_interview()

        return Question.objects.filter(
            interview=interview
        ).order_by("order")

    def perform_create(self, serializer):
        interview = self.get_interview()
        serializer.save(interview=interview)


class AnswerCreateView(generics.CreateAPIView):
    serializer_class = AnswerSerializer
    permission_classes = [IsCandidate]

    def get_question(self):
        return generics.get_object_or_404(
            Question,
            pk=self.kwargs["pk"],
            interview__candidate=self.request.user,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = self.get_question()
        interview = question.interview

        if hasattr(question, "answer"):
            raise ValidationError(
                "An answer has already been submitted "
                "for this question."
            )
        if interview.status == Interview.Status.COMPLETED:
            raise ValidationError("This interview has already been completed.")

        ai_consent = request.data.get("ai_consent") is True
        skills = (
            interview.resume.extracted_skills
            if interview.resume_id
            else []
        )
        candidate = interview.candidate
        try:
            evaluation_result = evaluate_interview_answer(
                question_text=question.question_text,
                answer_text=serializer.validated_data["answer_text"],
                expected_criteria=question.expected_criteria,
                skills=skills,
                candidate_names=[
                    candidate.get_full_name(),
                    candidate.username,
                ],
                local_only=not ai_consent,
            )
        except AIServiceError as exc:
            raise AIServiceUnavailable(str(exc)) from exc
        evaluation = evaluation_result.data
        evaluation_source = evaluation_result.source

        with transaction.atomic():
            answer = serializer.save(
                question=question,
                evaluation=evaluation,
                evaluation_source=evaluation_source,
            )

            answered_count = Answer.objects.filter(
                question__interview=interview
            ).count()
            interview.current_question = answered_count
            total_questions = Question.objects.filter(
                interview=interview
            ).count()
            update_fields = ["current_question"]
            if interview.started_at is None:
                interview.started_at = timezone.now()
                update_fields.append("started_at")
            if answered_count >= total_questions:
                interview.status = Interview.Status.COMPLETED
                interview.completed_at = timezone.now()
                update_fields.extend(["status", "completed_at"])
            else:
                interview.status = Interview.Status.IN_PROGRESS
                update_fields.append("status")

            elapsed_seconds = request.data.get("elapsed_seconds")
            if elapsed_seconds is not None:
                interview.elapsed_seconds = max(
                    interview.elapsed_seconds,
                    int(elapsed_seconds),
                )
                update_fields.append("elapsed_seconds")

            interview.save(update_fields=update_fields)

        return Response(AnswerSerializer(answer).data, status=201)