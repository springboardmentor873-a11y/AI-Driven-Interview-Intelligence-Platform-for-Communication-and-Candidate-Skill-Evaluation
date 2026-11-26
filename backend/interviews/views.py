from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from users.permissions import IsCandidate
from resumes.models import Resume
from services.ai_service import generate_interview_questions
from .models import InterviewSession, InterviewQuestion
from .serializers import (
    InterviewSessionListSerializer,
    InterviewSessionDetailSerializer,
    CreateInterviewSessionSerializer,
    SubmitAnswerSerializer,
)


class InterviewSessionListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def get(self, request):
        sessions = InterviewSession.objects.filter(candidate=request.user)
        serializer = InterviewSessionListSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateInterviewSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        resume = None
        resume_skills = {}
        resume_id = data.get('resume_id')
        if resume_id:
            try:
                resume = Resume.objects.get(id=resume_id, user=request.user)
                resume_skills = resume.skills or {}
            except Resume.DoesNotExist:
                pass

        target_role = data.get('target_role', 'Software Engineer')
        interview_type = data.get('interview_type', 'technical')
        difficulty = data.get('difficulty', 'medium')
        total_questions = data.get('total_questions', 5)
        time_limit = data.get('time_limit_per_question', 120)

        # Generate questions via Groq / AI Service
        generated_questions = generate_interview_questions(
            target_role=target_role,
            interview_type=interview_type,
            difficulty=difficulty,
            resume_skills=resume_skills,
            total_questions=total_questions,
        )

        session = InterviewSession.objects.create(
            candidate=request.user,
            resume=resume,
            target_role=target_role,
            interview_type=interview_type,
            difficulty=difficulty,
            status='in_progress',
            total_questions=len(generated_questions),
            time_limit_per_question=time_limit,
            current_question_index=0,
            started_at=timezone.now()
        )

        question_objs = []
        for i, q in enumerate(generated_questions):
            question_objs.append(
                InterviewQuestion(
                    session=session,
                    question_text=q.get('question_text', ''),
                    question_type=q.get('question_type', interview_type),
                    difficulty=q.get('difficulty', difficulty),
                    order=i + 1,
                    expected_answer_points=q.get('expected_answer_points', []),
                    status='unanswered'
                )
            )
        InterviewQuestion.objects.bulk_create(question_objs)

        return Response(
            InterviewSessionDetailSerializer(session).data,
            status=status.HTTP_201_CREATED
        )


class InterviewSessionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def get_session(self, request, pk):
        try:
            return InterviewSession.objects.get(pk=pk, candidate=request.user)
        except InterviewSession.DoesNotExist:
            return None

    def get(self, request, pk):
        session = self.get_session(request, pk)
        if not session:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = InterviewSessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        session = self.get_session(request, pk)
        if not session:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)
        session.delete()
        return Response({"message": "Session deleted."}, status=status.HTTP_204_NO_CONTENT)


class SubmitQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def post(self, request, session_pk, question_pk):
        try:
            session = InterviewSession.objects.get(pk=session_pk, candidate=request.user)
            question = InterviewQuestion.objects.get(pk=question_pk, session=session)
        except (InterviewSession.DoesNotExist, InterviewQuestion.DoesNotExist):
            return Response({"detail": "Session or Question not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubmitAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        question.candidate_answer = data.get('candidate_answer', '')
        question.time_taken_seconds = data.get('time_taken_seconds', 0)
        question.status = data.get('status', 'answered')
        question.answered_at = timezone.now()
        question.save()

        # Update session current index
        answered_count = session.questions.filter(status__in=['answered', 'skipped']).count()
        session.current_question_index = answered_count

        if answered_count >= session.questions.count():
            session.status = 'completed'
            session.completed_at = timezone.now()
        session.save()

        return Response(
            InterviewSessionDetailSerializer(session).data,
            status=status.HTTP_200_OK
        )


class CompleteSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCandidate]

    def post(self, request, pk):
        try:
            session = InterviewSession.objects.get(pk=pk, candidate=request.user)
        except InterviewSession.DoesNotExist:
            return Response({"detail": "Interview session not found."}, status=status.HTTP_404_NOT_FOUND)

        session.status = 'completed'
        session.completed_at = timezone.now()
        session.save()

        return Response(
            InterviewSessionDetailSerializer(session).data,
            status=status.HTTP_200_OK
        )
