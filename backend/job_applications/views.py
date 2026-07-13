import re

from django.conf import settings
from django.http import HttpResponse
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from common import exports
from common.throttling import AIRateThrottle
from common.embeddings import embed_text
from common.generation import (
    COVER_LETTER_VARIANTS,
    extract_job_posting,
    extract_keywords,
    generate_cover_letters,
    keyword_gap_analysis,
    regenerate_paragraph,
    tailor_resume,
)
from common.retrieval import format_bullets_for_prompt, retrieve_relevant_bullets
from common.url_fetch import fetch_url_text
from experience_bank.models import ExperienceBullet

from .models import JobApplication
from .serializers import JobApplicationSerializer, JobApplicationStatusSerializer


def _require_openai():
    if not settings.OPENAI_API_KEY:
        return Response(
            {"detail": "OPENAI_API_KEY is not configured on the server."},
            status=http_status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return None


class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer

    def get_queryset(self):
        return JobApplication.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            job_description_embedding=embed_text(serializer.validated_data["job_description"]),
        )

    def perform_update(self, serializer):
        # Re-embed only when the job description itself changed.
        if "job_description" in serializer.validated_data and (
            serializer.validated_data["job_description"] != serializer.instance.job_description
        ):
            serializer.save(
                job_description_embedding=embed_text(serializer.validated_data["job_description"])
            )
        else:
            serializer.save()

    def _retrieval(self, job_application):
        return retrieve_relevant_bullets(
            self.request.user, job_application.job_description_embedding
        )

    @action(detail=False, methods=["post"], url_path="from-url", throttle_classes=[AIRateThrottle])
    def from_url(self, request):
        """Fetches a job posting URL and returns extracted fields for review.

        Does not create the application — the client prefills the form so the
        user can verify title/company/description before generating.
        """
        if (error := _require_openai()) is not None:
            return error
        url = (request.data.get("url") or "").strip()
        if not url:
            raise ValidationError("Provide a job posting URL.")

        page_text = fetch_url_text(url)
        if len(page_text) < 100:
            raise ValidationError(
                "Couldn't read enough text from that page (it may require login "
                "or block automated access). Paste the description instead."
            )
        return Response(extract_job_posting(page_text))

    @action(detail=True, methods=["post"], throttle_classes=[AIRateThrottle])
    def generate(self, request, pk=None):
        """Full pipeline: retrieval, cover letter variants, fit score, ATS gap."""
        if (error := _require_openai()) is not None:
            return error
        job_application = self.get_object()

        if not ExperienceBullet.objects.filter(entry__owner=request.user).exists():
            raise ValidationError(
                "Add at least one experience entry with a description before generating."
            )

        if job_application.job_description_embedding is None:
            job_application.job_description_embedding = embed_text(
                job_application.job_description
            )

        result = self._retrieval(job_application)
        experience_text = format_bullets_for_prompt(result.bullets)

        job_application.generated_cover_letters = generate_cover_letters(
            job_application, experience_text, candidate_name=request.user.name
        )
        if not job_application.selected_variant:
            job_application.selected_variant = "concise"
        job_application.match_score = result.match_score

        keywords = extract_keywords(job_application.job_description)
        all_bullets = ExperienceBullet.objects.filter(entry__owner=request.user).select_related(
            "entry"
        )
        job_application.keyword_gap_analysis = keyword_gap_analysis(keywords, list(all_bullets))

        job_application.save()
        return Response(JobApplicationSerializer(job_application).data)

    @action(detail=True, methods=["post"], url_path="regenerate-paragraph", throttle_classes=[AIRateThrottle])
    def regenerate_paragraph(self, request, pk=None):
        if (error := _require_openai()) is not None:
            return error
        job_application = self.get_object()

        variant = request.data.get("variant")
        index = request.data.get("index")
        if variant not in COVER_LETTER_VARIANTS:
            raise ValidationError(f"variant must be one of {COVER_LETTER_VARIANTS}")
        paragraphs = job_application.generated_cover_letters.get(variant)
        if not paragraphs:
            raise ValidationError("No generated cover letter for this variant yet.")
        if not isinstance(index, int) or not 0 <= index < len(paragraphs):
            raise ValidationError("index is out of range.")

        result = self._retrieval(job_application)
        new_paragraph = regenerate_paragraph(
            job_application, variant, paragraphs, index, format_bullets_for_prompt(result.bullets)
        )
        paragraphs[index] = new_paragraph
        job_application.save(update_fields=["generated_cover_letters", "updated_at"])
        return Response({"variant": variant, "index": index, "paragraph": new_paragraph})

    @action(detail=True, methods=["patch"], url_path="cover-letter")
    def cover_letter(self, request, pk=None):
        """Persists manual edits: paragraphs for a variant and/or the selected variant."""
        job_application = self.get_object()

        variant = request.data.get("variant")
        paragraphs = request.data.get("paragraphs")
        selected_variant = request.data.get("selected_variant")

        if paragraphs is not None:
            if variant not in COVER_LETTER_VARIANTS:
                raise ValidationError(f"variant must be one of {COVER_LETTER_VARIANTS}")
            if not isinstance(paragraphs, list) or not all(
                isinstance(p, str) for p in paragraphs
            ):
                raise ValidationError("paragraphs must be a list of strings.")
            job_application.generated_cover_letters[variant] = paragraphs
        if selected_variant is not None:
            if selected_variant not in COVER_LETTER_VARIANTS:
                raise ValidationError(f"selected_variant must be one of {COVER_LETTER_VARIANTS}")
            job_application.selected_variant = selected_variant

        job_application.save()
        return Response(JobApplicationSerializer(job_application).data)

    @action(detail=True, methods=["post"], url_path="tailor-resume", throttle_classes=[AIRateThrottle])
    def tailor_resume(self, request, pk=None):
        if (error := _require_openai()) is not None:
            return error
        job_application = self.get_object()

        all_bullets = list(
            ExperienceBullet.objects.filter(entry__owner=request.user).select_related("entry")
        )
        if not all_bullets:
            raise ValidationError(
                "Add at least one experience entry with a description before tailoring."
            )
        job_application.tailored_resume = tailor_resume(job_application, all_bullets)
        job_application.save(update_fields=["tailored_resume", "updated_at"])
        return Response(JobApplicationSerializer(job_application).data)

    @action(detail=True, methods=["patch"], url_path="resume")
    def resume(self, request, pk=None):
        """Persists manual edits to the tailored resume."""
        job_application = self.get_object()
        resume = request.data.get("tailored_resume")
        if not isinstance(resume, dict):
            raise ValidationError("tailored_resume must be an object.")
        job_application.tailored_resume = resume
        job_application.save(update_fields=["tailored_resume", "updated_at"])
        return Response(JobApplicationSerializer(job_application).data)

    @action(detail=True, methods=["patch"])
    def status(self, request, pk=None):
        job_application = self.get_object()
        serializer = JobApplicationStatusSerializer(
            job_application, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def export(self, request, pk=None):
        """?document=cover_letter|resume&file_format=pdf|docx

        Named `file_format` because DRF reserves the `format` query param
        for content negotiation.
        """
        job_application = self.get_object()
        document = request.query_params.get("document", "cover_letter")
        file_format = request.query_params.get("file_format", "pdf")
        if document not in ("cover_letter", "resume") or file_format not in ("pdf", "docx"):
            raise ValidationError(
                "document must be cover_letter|resume, file_format must be pdf|docx."
            )

        candidate_name = request.user.name or ""
        if document == "cover_letter":
            variant = request.query_params.get(
                "variant", job_application.selected_variant or "concise"
            )
            paragraphs = job_application.generated_cover_letters.get(variant)
            if not paragraphs:
                raise ValidationError("No generated cover letter to export for this variant.")
            if file_format == "pdf":
                content = exports.cover_letter_pdf(job_application, paragraphs)
            else:
                content = exports.cover_letter_docx(job_application, paragraphs)
        else:
            if not job_application.tailored_resume:
                raise ValidationError("No tailored resume to export yet.")
            if file_format == "pdf":
                content = exports.resume_pdf(
                    job_application, job_application.tailored_resume, candidate_name
                )
            else:
                content = exports.resume_docx(
                    job_application, job_application.tailored_resume, candidate_name
                )

        content_types = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        # Slugify company/job title down to a safe ASCII charset so user input
        # can't inject into or break the Content-Disposition header.
        raw = f"{job_application.company}-{job_application.job_title}"
        slug = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")[:80] or "export"
        filename = f"{document.replace('_', '-')}-{slug}.{file_format}"
        response = HttpResponse(content, content_type=content_types[file_format])
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
