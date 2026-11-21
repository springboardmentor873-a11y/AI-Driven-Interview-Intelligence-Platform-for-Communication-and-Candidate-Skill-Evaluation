import uuid

from django.db import transaction
from django.db.models import Count
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCandidate, IsRecruiter

from . import recordings, speech_analysis
from .models import Answer, InterviewSession, InterviewTemplate, Question
from .question_gen import generate_questions
from .serializers import (
    MAX_SECONDS_PER_QUESTION, MIN_SECONDS_PER_QUESTION,
    CandidateTemplateSerializer, CreateSessionSerializer, GenerateQuestionsSerializer,
    QuestionSerializer, SessionSerializer, SubmitAnswerSerializer, TemplateSerializer,
)


class GenerateQuestionsView(APIView):
    """Preview a question set for a resume. Nothing is saved: session creation
    (Day 5) reuses the same service."""

    permission_classes = [IsCandidate]

    def post(self, request):
        serializer = GenerateQuestionsSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        questions, source = generate_questions(
            data["resume"], data["interview_type"], data["difficulty"],
            data["domain"], data["question_count"],
        )
        return Response({
            "source": source,
            "resume_id": data["resume"].id if data["resume"] else None,
            "interview_type": data["interview_type"],
            "difficulty": data["difficulty"],
            "domain": data["domain"],
            "questions": questions,
        })


OPEN_STATUSES = ("scheduled", "in_progress")
MAX_OPEN_SESSIONS = 5  # each new session costs an AI call, so cap unfinished ones


def _question_payload(question):
    return QuestionSerializer(question).data if question else None


class SessionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """A candidate's interview sessions: create, run, finish and review them."""

    permission_classes = [IsCandidate]
    serializer_class = SessionSerializer

    def get_queryset(self):
        # Candidates only ever see their own sessions
        return (
            InterviewSession.objects.filter(candidate=self.request.user)
            .select_related("resume", "template")
            .annotate(
                question_total=Count("questions", distinct=True),
                answered_total=Count("questions__answer", distinct=True),
            )
            .order_by("-created_at", "-id")  # newest first for the history list
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["include_questions"] = self.action == "retrieve"
        return context

    def _detail(self, session, **extra):
        session = self.get_queryset().get(pk=session.pk)
        data = SessionSerializer(session, context={**self.get_serializer_context(), "include_questions": True}).data
        return Response({**data, **extra})

    def create(self, request, *args, **kwargs):
        serializer = CreateSessionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        open_count = InterviewSession.objects.filter(
            candidate=request.user, status__in=OPEN_STATUSES
        ).count()
        if open_count >= MAX_OPEN_SESSIONS:
            raise ValidationError({
                "detail": f"You have {open_count} unfinished interviews. Finish or cancel one before starting another."
            })

        questions, source = generate_questions(
            data["resume"], data["interview_type"], data["difficulty"],
            data["domain"], data["question_count"],
        )
        template = data["template"]
        if template and questions:
            # The template's duration is the whole interview, so split it across the questions
            per_question = template.duration_minutes * 60 // len(questions)
            per_question = max(MIN_SECONDS_PER_QUESTION, min(MAX_SECONDS_PER_QUESTION, per_question))
            for q in questions:
                q["time_limit_seconds"] = per_question
        with transaction.atomic():
            session = InterviewSession.objects.create(
                candidate=request.user, resume=data["resume"], template=template,
                interview_type=data["interview_type"], difficulty=data["difficulty"],
                domain=data["domain"], question_source=source,
            )
            Question.objects.bulk_create([
                Question(session=session, order=i, text=q["text"], category=q["category"],
                         time_limit_seconds=q["time_limit_seconds"])
                for i, q in enumerate(questions, start=1)
            ])
        response = self._detail(session)
        response.status_code = status.HTTP_201_CREATED
        return response

    # --- helpers for the actions below -------------------------------------
    def _locked(self, pk):
        """The session row, locked for this request so double clicks cannot race."""
        get_object_or_404(self.get_queryset(), pk=pk)  # 404 for other people's sessions
        return InterviewSession.objects.select_for_update().get(pk=pk)

    @staticmethod
    def _current_question(session):
        return session.questions.filter(answer__isnull=True).order_by("order").first()

    @staticmethod
    def _require(session, *allowed):
        if session.status not in allowed:
            raise ValidationError({"detail": f"This interview is {session.get_status_display().lower()}."})

    # --- actions -----------------------------------------------------------
    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        with transaction.atomic():
            session = self._locked(pk)
            self._require(session, "scheduled", "in_progress")  # starting twice is harmless
            if session.status == "scheduled":
                session.status = "in_progress"
                session.started_at = timezone.now()
                session.save(update_fields=["status", "started_at"])
        return self._detail(session, next_question=_question_payload(self._current_question(session)))

    @action(detail=True, methods=["get"], url_path="next-question")
    def next_question(self, request, pk=None):
        session = get_object_or_404(self.get_queryset(), pk=pk)
        self._require(session, "in_progress")
        return Response({
            "status": session.status,
            "question": _question_payload(self._current_question(session)),
            "answered": session.answered_total,
            "total": session.question_total,
        })

    @action(detail=True, methods=["post"])
    def answer(self, request, pk=None):
        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            session = self._locked(pk)
            self._require(session, "in_progress")
            current = self._current_question(session)
            if current is None or current.id != data["question_id"]:
                raise ValidationError({"question_id": "This is not the current question."})
            # Quick rule-based numbers now; the AI review is added by analyze/ after the interview
            analysis = speech_analysis.build_analysis(
                data["transcript"], data["duration_seconds"], current.time_limit_seconds,
                data["transcript_source"], data["speech_confidence"],
            )
            Answer.objects.create(
                question=current, transcript=data["transcript"], duration_seconds=data["duration_seconds"], analysis=analysis,
            )
            following = self._current_question(session)
            if following is None:  # that was the last question
                session.status = "completed"
                session.ended_at = timezone.now()
                session.save(update_fields=["status", "ended_at"])
        return Response({
            "status": session.status,
            "answered": Answer.objects.filter(question__session=session).count(),
            "total": session.questions.count(),
            "next_question": _question_payload(following),
            "feedback": speech_analysis.quick_feedback(analysis),
        })

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        """End early. Questions not answered yet simply stay unanswered."""
        with transaction.atomic():
            session = self._locked(pk)
            self._require(session, "in_progress", "completed")
            if session.status == "in_progress":
                session.status = "completed"
                session.ended_at = timezone.now()
                session.save(update_fields=["status", "ended_at"])
        return self._detail(session)

    @action(detail=True, methods=["post"])
    def analyze(self, request, pk=None):
        """Finish the speech analysis of a completed interview: one Gemini review of all answers.

        Safe to call again. Answers that already have their AI review are not sent a second time,
        so repeating the call only retries the ones that could not be reviewed. The AI call runs
        with no database lock held, because it can take a while.
        """
        session = get_object_or_404(self.get_queryset(), pk=pk)
        self._require(session, "completed")
        updates, source = speech_analysis.analyze_session(session)
        for answer_id, analysis in updates.items():
            Answer.objects.filter(pk=answer_id, question__session=session).update(analysis=analysis)
        return self._detail(session, analysis_source=source)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        with transaction.atomic():
            session = self._locked(pk)
            self._require(session, "scheduled", "in_progress", "cancelled")
            if session.status != "cancelled":
                session.status = "cancelled"
                session.ended_at = timezone.now()
                session.save(update_fields=["status", "ended_at"])
        return self._detail(session)

    @action(detail=True, methods=["get", "post", "delete"], parser_classes=[MultiPartParser, FormParser])
    def recording(self, request, pk=None):
        """The interview's video and audio, kept private to the candidate who made them."""
        if request.method == "POST":
            return self._upload_recording(request, pk)
        if request.method == "DELETE":
            return self._delete_recording(pk)
        return self._download_recording(request, pk)

    def _upload_recording(self, request, pk):
        files = {kind: request.FILES[kind] for kind in ("video", "audio") if kind in request.FILES}
        if not files:
            raise ValidationError({"detail": "Send a video and/or an audio file."})
        # Check every file before saving any, so a bad one leaves nothing half-saved
        formats = {kind: recordings.check_upload(kind, upload) for kind, upload in files.items()}
        with transaction.atomic():
            session = self._locked(pk)
            self._require(session, "completed")  # recordings belong to a finished interview
            for kind, upload in files.items():
                field = getattr(session, f"{kind}_file")
                if field:
                    field.delete(save=False)  # a retry replaces the earlier upload
                ext = recordings.EXTENSIONS[kind][formats[kind]]
                upload.name = f"session-{session.pk}-{uuid.uuid4().hex[:8]}.{ext}"
                setattr(session, f"{kind}_file", upload)
            session.save(update_fields=[f"{kind}_file" for kind in files])
        return self._detail(session)

    def _delete_recording(self, pk):
        with transaction.atomic():
            session = self._locked(pk)
            for kind in ("video", "audio"):
                field = getattr(session, f"{kind}_file")
                if field:
                    field.delete(save=False)
                    setattr(session, f"{kind}_file", None)
            session.save(update_fields=["video_file", "audio_file"])
        return self._detail(session)

    def _download_recording(self, request, pk):
        kind = request.query_params.get("type", "video")
        if kind not in ("video", "audio"):
            raise ValidationError({"type": "Choose video or audio."})
        session = get_object_or_404(self.get_queryset(), pk=pk)
        stored = getattr(session, f"{kind}_file")
        if not stored:
            raise NotFound("There is no recording of this kind.")
        try:
            handle = stored.open("rb")
        except FileNotFoundError:
            raise NotFound("The recording file is missing.")
        # The type comes from the stored file name (set by us), never from the client
        ext = stored.name.rsplit(".", 1)[-1]
        fmt = {"m4a": "mp4"}.get(ext, ext)
        response = FileResponse(handle, content_type=recordings.CONTENT_TYPES[kind].get(fmt, "application/octet-stream"))
        response["Content-Disposition"] = f'inline; filename="interview-{session.pk}-{kind}.{ext}"'
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response


MAX_TEMPLATES_PER_RECRUITER = 50


class TemplateViewSet(viewsets.ModelViewSet):
    """Interview templates.

    Recruiters create, edit and delete their own. Candidates can only read the
    published ones (to pick one when starting an interview). Admins can read all.
    """

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsRecruiter()]

    def get_queryset(self):
        user = self.request.user
        queryset = InterviewTemplate.objects.select_related("created_by").order_by("-created_at", "-id")
        if user.role == "candidate":
            return queryset.filter(is_published=True)
        if user.role == "recruiter":
            queryset = queryset.filter(created_by=user)
        return queryset.annotate(session_count=Count("sessions", distinct=True))

    def get_serializer_class(self):
        return CandidateTemplateSerializer if self.request.user.role == "candidate" else TemplateSerializer

    def perform_create(self, serializer):
        owned = InterviewTemplate.objects.filter(created_by=self.request.user).count()
        if owned >= MAX_TEMPLATES_PER_RECRUITER:
            raise ValidationError({"detail": f"You can have up to {MAX_TEMPLATES_PER_RECRUITER} templates. Delete one first."})
        serializer.save(created_by=self.request.user)
