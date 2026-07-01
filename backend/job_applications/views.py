from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets

from common.embeddings import embed_text

from .models import JobApplication
from .serializers import JobApplicationSerializer, JobApplicationStatusSerializer


class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer

    def get_queryset(self):
        return JobApplication.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            job_description_embedding=embed_text(serializer.validated_data["job_description"]),
        )

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        job_application = self.get_object()
        serializer = JobApplicationStatusSerializer(job_application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
