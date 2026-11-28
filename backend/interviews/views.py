from django.conf import settings
from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCandidate
from .lifecycle import answer_deadline, close_abandoned_for, close_if_abandoned, earlier_questions_resolved, question_status
from .models import Answer, InterviewQuestion, InterviewSession
from .serializers import (
    AnswerInputSerializer,
    InterviewCreateSerializer,
    InterviewDetailSerializer,
    InterviewListSerializer,
    QuestionSerializer,
)
from .services import generate_questions


def error(message, code=status.HTTP_400_BAD_REQUEST):
    """All errors look like {'detail': '...'}."""
    return Response({'detail': message}, status=code)


def first_message(errors):
    """Turn serializer errors into one readable sentence."""
    if isinstance(errors, dict):
        for field, value in errors.items():
            text = first_message(value)
            if field in ('non_field_errors', 'detail'):
                return text
            return f'{field}: {text}'
    if isinstance(errors, list) and errors:
        return first_message(errors[0])
    return str(errors)


def own_sessions(request):
    # data-isolation rule: a candidate only ever sees their own sessions
    return InterviewSession.objects.filter(candidate=request.user)


def detail_data(session, request):
    session = own_sessions(request).prefetch_related('questions__answer').select_related('resume').get(pk=session.pk)
    return InterviewDetailSerializer(session).data


class InterviewListCreateView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        close_abandoned_for(request.user)   # stale interviews are closed before listing
        sessions = (
            own_sessions(request)
            .select_related('resume')
            .prefetch_related('questions__answer')
            .annotate(answered_count=Count('questions__answer', distinct=True))
            .order_by('-created_at')
        )
        return Response(InterviewListSerializer(sessions, many=True).data)

    def post(self, request):
        form = InterviewCreateSerializer(data=request.data, context={'request': request})
        if not form.is_valid():
            return error(first_message(form.errors))
        data = form.validated_data
        resume = data.get('resume')

        skills = []
        if resume and resume.status == 'parsed':
            skills = resume.parsed_data.get('skills', [])

        domain = data['domain'] if data['category'] == 'technical' else ''
        # Make the questions BEFORE opening the transaction (an AI call can be slow).
        questions, source = generate_questions(
            data['category'], domain, data['difficulty'], data['num_questions'], skills)
        if not questions:
            return error('We could not create questions for this choice. Please try another one.')

        # Informational only: how long the whole interview would take at 2 minutes a question.
        time_limit_minutes = len(questions) * (settings.INTERVIEW_QUESTION_SECONDS // 60)

        with transaction.atomic():
            session = InterviewSession.objects.create(
                candidate=request.user,
                category=data['category'],
                domain=domain,
                difficulty=data['difficulty'],
                resume=resume,
                num_questions=len(questions),      # the real number, may be lower than asked
                time_limit_minutes=time_limit_minutes,
                question_source=source,
            )
            InterviewQuestion.objects.bulk_create([
                InterviewQuestion(
                    session=session,
                    question_text=q['question_text'],
                    category=data['category'],
                    order_no=number,
                    evaluation_rubric=q['evaluation_rubric'],
                )
                for number, q in enumerate(questions, start=1)
            ])
        return Response(detail_data(session, request), status=status.HTTP_201_CREATED)


class InterviewDetailView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request, pk):
        session = get_object_or_404(own_sessions(request), pk=pk)
        close_if_abandoned(session)
        return Response(detail_data(session, request))


class InterviewStartView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        with transaction.atomic():
            session = get_object_or_404(own_sessions(request).select_for_update(), pk=pk)
            if session.status != InterviewSession.Status.CREATED:
                return error('This interview was already started or has finished.')
            session.status = InterviewSession.Status.IN_PROGRESS
            session.started_at = timezone.now()
            session.save(update_fields=['status', 'started_at'])
            # Starting the interview activates its first question too.
            first_question = session.questions.order_by('order_no').first()
            if first_question is not None:
                first_question.started_at = session.started_at
                first_question.save(update_fields=['started_at'])
        return Response(detail_data(session, request))


class QuestionStartView(APIView):
    """Activate one question so its 2-minute clock begins. Idempotent on the active question."""
    permission_classes = [IsCandidate]

    def post(self, request, pk, qid):
        with transaction.atomic():
            session = get_object_or_404(own_sessions(request).select_for_update(), pk=pk)
            if session.status != InterviewSession.Status.IN_PROGRESS:
                return error('This interview is not in progress.')
            questions = list(session.questions.select_related('answer').all())
            question = next((q for q in questions if q.pk == qid), None)
            if question is None:
                return error('This question is not part of this interview.')

            current_status = question_status(question)
            if current_status in ('answered', 'skipped', 'expired'):
                return error('This question is already finished and cannot be started again.')
            if current_status == 'pending':
                if not earlier_questions_resolved(question.order_no, questions):
                    return error('Please finish the earlier questions first.')
                question.started_at = timezone.now()
                question.save(update_fields=['started_at'])
            # else current_status == 'active': nothing to do, just report the time left again
        return Response(detail_data(session, request))


class QuestionSkipView(APIView):
    """Give up on the active question without answering it. Idempotent once skipped."""
    permission_classes = [IsCandidate]

    def post(self, request, pk, qid):
        with transaction.atomic():
            session = get_object_or_404(own_sessions(request).select_for_update(), pk=pk)
            if session.status != InterviewSession.Status.IN_PROGRESS:
                return error('This interview is not in progress.')
            question = session.questions.select_related('answer').filter(pk=qid).first()
            if question is None:
                return error('This question is not part of this interview.')

            current_status = question_status(question)
            if current_status == 'answered':
                return error('This question already has an answer and cannot be skipped.')
            if current_status == 'pending':
                return error('Start this question before skipping it.')
            if current_status != 'skipped':
                question.skipped = True
                question.save(update_fields=['skipped'])
        return Response(detail_data(session, request))


class InterviewAnswerView(APIView):
    permission_classes = [IsCandidate]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        form = AnswerInputSerializer(data=request.data)
        if not form.is_valid():
            return error(first_message(form.errors))
        data = form.validated_data

        with transaction.atomic():
            # lock the session so two quick requests cannot both save an answer
            session = get_object_or_404(own_sessions(request).select_for_update(), pk=pk)
            if session.status != InterviewSession.Status.IN_PROGRESS:
                return error('This interview is not in progress.')

            question = session.questions.select_related('answer').filter(pk=data['question_id']).first()
            if question is None:
                return error('This question is not part of this interview.')
            if Answer.objects.filter(question=question).exists():
                return error('This question already has an answer.', status.HTTP_409_CONFLICT)
            if question.skipped:
                return error('This question was skipped and cannot be answered.')
            if question.started_at is None:
                return error('This question has not started yet.')
            now = timezone.now()
            if now > answer_deadline(question):
                return error('Time is over. Answers are no longer accepted for this question.')

            Answer.objects.create(
                question=question,
                candidate=request.user,
                text_answer=data.get('text_answer', ''),
                audio_file=data.get('audio_file'),
                duration_seconds=round((now - question.started_at).total_seconds(), 1),
            )
        question = InterviewQuestion.objects.select_related('answer').get(pk=question.pk)
        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class InterviewCompleteView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        with transaction.atomic():
            session = get_object_or_404(own_sessions(request).select_for_update(), pk=pk)
            if session.status != InterviewSession.Status.IN_PROGRESS:
                return error('Only a running interview can be completed.')
            session.status = InterviewSession.Status.COMPLETED
            session.ended_at = timezone.now()
            session.save(update_fields=['status', 'ended_at'])
        return Response(detail_data(session, request))
