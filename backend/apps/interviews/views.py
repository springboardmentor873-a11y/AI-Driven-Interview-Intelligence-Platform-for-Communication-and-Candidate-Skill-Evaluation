from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import Answer, Interview, Question
from .serializers import (
    AnswerSerializer,
    InterviewSerializer,
    QuestionSerializer,
)


class InterviewListCreateView(generics.ListCreateAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Interview.objects.filter(
            candidate=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(candidate=self.request.user)


class InterviewDetailView(generics.RetrieveAPIView):
    serializer_class = InterviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Interview.objects.filter(
            candidate=self.request.user
        )


class QuestionListCreateView(generics.ListCreateAPIView):
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

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
    permission_classes = [permissions.IsAuthenticated]

    def get_question(self):
        return generics.get_object_or_404(
            Question,
            pk=self.kwargs["pk"],
            interview__candidate=self.request.user,
        )

    def perform_create(self, serializer):
        question = self.get_question()

        if hasattr(question, "answer"):
            raise ValidationError(
                "An answer has already been submitted "
                "for this question."
            )

        answer = serializer.save(question=question)

        interview = question.interview

        answered_count = Answer.objects.filter(
            question__interview=interview
        ).count()

        interview.current_question = answered_count

        total_questions = Question.objects.filter(
            interview=interview
        ).count()

        if answered_count >= total_questions:
            interview.status = "COMPLETED"
        else:
            interview.status = "IN_PROGRESS"

        interview.save(update_fields=[
            "current_question",
            "status",
        ])