from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCandidate
from .lifecycle import close_expired_for, close_if_expired, deadline_for
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
        close_expired_for(request.user)   # finished-by-time interviews are closed first
        sessions = (
            own_sessions(request)
            .select_related('resume')
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

        with transaction.atomic():
            session = InterviewSession.objects.create(
                candidate=request.user,
                category=data['category'],
                domain=domain,
                difficulty=data['difficulty'],
                resume=resume,
                num_questions=len(questions),      # the real number, may be lower than asked
                time_limit_minutes=data['time_limit_minutes'],
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
        close_if_expired(session)
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
            deadline = deadline_for(session)
            if timezone.now() > deadline:
                return error('Time is over. Answers are no longer accepted.')

            question = session.questions.filter(pk=data['question_id']).first()
            if question is None:
                return error('This question is not part of this interview.')
            if Answer.objects.filter(question=question).exists():
                return error('This question already has an answer.', status.HTTP_409_CONFLICT)

            Answer.objects.create(
                question=question,
                candidate=request.user,
                text_answer=data.get('text_answer', ''),
                audio_file=data.get('audio_file'),
                duration_seconds=data.get('duration_seconds', 0),
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
