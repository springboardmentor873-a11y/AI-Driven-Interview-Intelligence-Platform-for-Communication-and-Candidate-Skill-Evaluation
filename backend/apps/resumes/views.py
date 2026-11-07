from django.http import FileResponse, Http404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.permissions import IsCandidate

from .models import Resume
from .serializers import ResumeSerializer, ResumeUploadSerializer


class ResumeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsCandidate]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        # Users only ever see their own resumes
        return Resume.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return ResumeUploadSerializer
        return ResumeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resume = serializer.save()
        return Response(ResumeSerializer(resume).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        was_primary = instance.is_primary
        user = instance.user
        instance.file.delete(save=False)  # remove the file from disk
        instance.delete()
        if was_primary:
            newest = Resume.objects.filter(user=user).first()
            if newest:
                newest.is_primary = True
                newest.save(update_fields=["is_primary"])

    @action(detail=True, methods=["post"], url_path="set-primary")
    def set_primary(self, request, pk=None):
        resume = self.get_object()
        Resume.objects.filter(user=request.user, is_primary=True).update(is_primary=False)
        resume.is_primary = True
        resume.save(update_fields=["is_primary"])
        return Response(ResumeSerializer(resume).data)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        resume = self.get_object()
        try:
            return FileResponse(
                resume.file.open("rb"),
                content_type="application/pdf",
                filename=resume.original_name,
            )
        except FileNotFoundError:
            raise Http404