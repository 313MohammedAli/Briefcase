from django.conf import settings
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from common.resume_import import extract_resume_entries, extract_text_from_upload
from common.throttling import AIRateThrottle

from .models import ExperienceEntry
from .serializers import ExperienceEntrySerializer


class ExperienceEntryViewSet(viewsets.ModelViewSet):
    serializer_class = ExperienceEntrySerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return ExperienceEntry.objects.filter(owner=self.request.user).prefetch_related("bullets")

    @action(detail=False, methods=["post"], url_path="import-resume", throttle_classes=[AIRateThrottle])
    def import_resume(self, request):
        """Uploads a resume file and returns proposed entries for review.

        Nothing is saved to the bank here — the client shows the extracted
        entries for editing and submits the approved ones through the
        normal create endpoint. The raw resume text is stored on the
        profile for future format-preserving tailoring.
        """
        if not settings.OPENAI_API_KEY:
            return Response(
                {"detail": "OPENAI_API_KEY is not configured on the server."},
                status=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            raise ValidationError("Attach a resume file under the 'file' field.")

        resume_text = extract_text_from_upload(uploaded_file)

        profile = request.user
        profile.resume_text = resume_text
        profile.resume_filename = uploaded_file.name or ""
        profile.resume_uploaded_at = timezone.now()
        profile.save(update_fields=["resume_text", "resume_filename", "resume_uploaded_at"])

        entries = extract_resume_entries(resume_text)
        return Response({"entries": entries, "filename": uploaded_file.name})

    @action(detail=False, methods=["post"], url_path="bulk-create")
    def bulk_create(self, request):
        """Creates multiple entries in one request (the import confirm step)."""
        entries = request.data.get("entries")
        if not isinstance(entries, list) or not entries:
            raise ValidationError("Provide a non-empty 'entries' list.")
        if len(entries) > 50:
            raise ValidationError("Too many entries in one request (50 max).")

        serializer = ExperienceEntrySerializer(
            data=entries, many=True, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=http_status.HTTP_201_CREATED)
