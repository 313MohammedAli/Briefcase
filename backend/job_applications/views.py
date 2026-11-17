import re

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from common import cover_letters, exports
from common.throttling import AIRateThrottle
from common.embeddings import embed_text
from common.generation import (
    extract_job_posting,
    extract_keywords,
    keyword_gap_analysis,
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


def _draft_settings(raw, job_title: str) -> dict:
    try:
        return cover_letters.normalize_settings(raw, job_title)
    except ValueError as e:
        raise ValidationError(str(e))


def _check_draft_room(drafts: list) -> None:
    if len(drafts) >= cover_letters.MAX_DRAFTS:
        raise ValidationError(
            f"This application already has {cover_letters.MAX_DRAFTS} cover letter "
            "drafts. Delete one to make room."
        )


def _find_draft(job_application, draft_id) -> dict:
    for draft in job_application.cover_letter_drafts:
        if draft.get("id") == draft_id:
            return draft
    raise ValidationError("That cover letter draft doesn't exist.")


class CoverLetterOptionsView(APIView):
    """Templates, tones, lengths, and limits for the cover letter builder."""

    def get(self, request):
        return Response(cover_letters.options_payload())


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

    def _require_experience(self, message: str) -> None:
        if not ExperienceBullet.objects.filter(entry__owner=self.request.user).exists():
            raise ValidationError(message)

    def _write_draft(self, job_application, settings, experience_text, keywords) -> dict:
        return cover_letters.generate_draft(
            job_application,
            settings,
            experience_text,
            candidate_name=self.request.user.name,
            personal_statement=self.request.user.personal_statement,
            keywords=keywords,
        )

    @staticmethod
    def _append_draft(job_application, draft, **fields) -> JobApplication:
        """Appends and selects a draft against the latest row.

        Generation takes seconds, so the instance loaded at the start of the
        request may be stale (the user can edit another draft meanwhile).
        Re-read under a row lock so those edits aren't overwritten.
        """
        with transaction.atomic():
            fresh = JobApplication.objects.select_for_update().get(pk=job_application.pk)
            _check_draft_room(fresh.cover_letter_drafts)
            fresh.cover_letter_drafts = [*fresh.cover_letter_drafts, draft]
            fresh.selected_draft = draft["id"]
            for name, value in fields.items():
                setattr(fresh, name, value)
            fresh.save()
        return fresh

    @action(detail=True, methods=["post"], throttle_classes=[AIRateThrottle])
    def generate(self, request, pk=None):
        """Fit score + ATS keyword gap, plus (by default) a new cover letter draft.

        Body, all optional: {"settings": {draft settings}, "include_draft": bool}.
        Never overwrites existing drafts.
        """
        if (error := _require_openai()) is not None:
            return error
        job_application = self.get_object()
        self._require_experience(
            "Add at least one experience entry with a description before generating."
        )

        include_draft = request.data.get("include_draft", True) is not False
        draft_settings = None
        if include_draft:
            _check_draft_room(job_application.cover_letter_drafts)
            draft_settings = _draft_settings(
                request.data.get("settings"), job_application.job_title
            )

        if job_application.job_description_embedding is None:
            job_application.job_description_embedding = embed_text(
                job_application.job_description
            )

        result = self._retrieval(job_application)
        keywords = extract_keywords(job_application.job_description)
        all_bullets = ExperienceBullet.objects.filter(entry__owner=request.user).select_related(
            "entry"
        )
        gap = keyword_gap_analysis(keywords, list(all_bullets))
        analysis = {
            "job_description_embedding": job_application.job_description_embedding,
            "match_score": result.match_score,
            "keyword_gap_analysis": gap,
        }

        if not include_draft:
            for name, value in analysis.items():
                setattr(job_application, name, value)
            job_application.save(update_fields=[*analysis, "updated_at"])
            return Response(JobApplicationSerializer(job_application).data)

        draft = self._write_draft(
            job_application,
            draft_settings,
            format_bullets_for_prompt(result.bullets),
            gap["matched"],
        )
        updated = self._append_draft(job_application, draft, **analysis)
        return Response(JobApplicationSerializer(updated).data)

    @action(detail=True, methods=["post"], url_path="drafts", throttle_classes=[AIRateThrottle])
    def create_draft(self, request, pk=None):
        """Writes one new cover letter draft from builder settings.

        Body: {"settings": {template, tone, length, focus, inputs, mirror_keywords}}.
        Reuses the stored ATS analysis instead of recomputing it.
        """
        if (error := _require_openai()) is not None:
            return error
        job_application = self.get_object()
        self._require_experience(
            "Add at least one experience entry with a description before writing a draft."
        )
        _check_draft_room(job_application.cover_letter_drafts)
        draft_settings = _draft_settings(request.data.get("settings"), job_application.job_title)

        if job_application.job_description_embedding is None:
            job_application.job_description_embedding = embed_text(
                job_application.job_description
            )
        result = self._retrieval(job_application)
        draft = self._write_draft(
            job_application,
            draft_settings,
            format_bullets_for_prompt(result.bullets),
            (job_application.keyword_gap_analysis or {}).get("matched", []),
        )
        updated = self._append_draft(
            job_application,
            draft,
            job_description_embedding=job_application.job_description_embedding,
        )
        return Response(JobApplicationSerializer(updated).data, status=http_status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"drafts/(?P<draft_id>[0-9a-f]{12})",
    )
    def draft(self, request, pk=None, draft_id=None):
        """PATCH {paragraphs?, label?} saves manual edits; DELETE removes the draft."""
        job_application = self.get_object()
        with transaction.atomic():
            job_application = JobApplication.objects.select_for_update().get(
                pk=job_application.pk
            )
            draft = _find_draft(job_application, draft_id)

            if request.method == "DELETE":
                job_application.cover_letter_drafts = [
                    d for d in job_application.cover_letter_drafts if d.get("id") != draft_id
                ]
                if job_application.selected_draft == draft_id:
                    remaining = job_application.cover_letter_drafts
                    job_application.selected_draft = remaining[-1]["id"] if remaining else ""
                job_application.save()
                return Response(JobApplicationSerializer(job_application).data)

            paragraphs = request.data.get("paragraphs")
            label = request.data.get("label")
            if paragraphs is not None:
                if (
                    not isinstance(paragraphs, list)
                    or not all(isinstance(p, str) for p in paragraphs)
                    or len(paragraphs) > 40
                    or any(len(p) > 5000 for p in paragraphs)
                ):
                    raise ValidationError(
                        "paragraphs must be a list of at most 40 strings, each under 5000 characters."
                    )
                if paragraphs != draft.get("paragraphs"):
                    draft["paragraphs"] = paragraphs
                    # The candidate's own revisions are what keep a letter
                    # from reading as generic; the UI nudges until this is set.
                    draft["edited"] = True
            if label is not None:
                if not isinstance(label, str) or len(label) > 60:
                    raise ValidationError("label must be text of at most 60 characters.")
                draft["label"] = label.strip()
            job_application.save()
        return Response(JobApplicationSerializer(job_application).data)

    @action(detail=True, methods=["post"], url_path="regenerate-paragraph", throttle_classes=[AIRateThrottle])
    def regenerate_paragraph(self, request, pk=None):
        """Rewrites one paragraph. Body: {draft_id, index, mode?, instruction?}.

        `mode` is a preset from cover_letters.REWRITE_MODES; `instruction` is
        free text from the user and wins over the preset when given.
        """
        if (error := _require_openai()) is not None:
            return error
        job_application = self.get_object()

        draft = _find_draft(job_application, request.data.get("draft_id"))
        paragraphs = draft.get("paragraphs") or []
        index = request.data.get("index")
        if not isinstance(index, int) or isinstance(index, bool) or not 0 <= index < len(paragraphs):
            raise ValidationError("index is out of range.")
        mode = request.data.get("mode") or "fresh"
        if mode not in cover_letters.REWRITE_MODES:
            raise ValidationError(f"mode must be one of {list(cover_letters.REWRITE_MODES)}.")
        instruction = request.data.get("instruction") or ""
        if not isinstance(instruction, str) or len(instruction) > cover_letters.CUSTOM_REWRITE_LIMIT:
            raise ValidationError(
                f"instruction must be text of at most {cover_letters.CUSTOM_REWRITE_LIMIT} characters."
            )

        result = self._retrieval(job_application)
        new_paragraph = cover_letters.rewrite_paragraph(
            job_application,
            draft,
            index,
            format_bullets_for_prompt(result.bullets),
            mode=mode,
            custom=instruction,
        )

        with transaction.atomic():
            fresh = JobApplication.objects.select_for_update().get(pk=job_application.pk)
            target = _find_draft(fresh, draft["id"])
            if index >= len(target.get("paragraphs") or []):
                raise ValidationError("The draft changed while rewriting. Try again.")
            target["paragraphs"][index] = new_paragraph
            fresh.save(update_fields=["cover_letter_drafts", "updated_at"])
        return Response({"draft_id": draft["id"], "index": index, "paragraph": new_paragraph})

    @action(detail=True, methods=["patch"], url_path="cover-letter")
    def cover_letter(self, request, pk=None):
        """Selects which draft is the application's cover letter. Body: {selected_draft}."""
        job_application = self.get_object()
        draft = _find_draft(job_application, request.data.get("selected_draft"))
        job_application.selected_draft = draft["id"]
        job_application.save(update_fields=["selected_draft", "updated_at"])
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
        """?document=cover_letter|resume&file_format=pdf|docx[&draft=<id>]

        Cover letters export the given draft, else the selected one.

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
            draft = job_application.get_draft(request.query_params.get("draft"))
            paragraphs = (draft or {}).get("paragraphs")
            if not paragraphs:
                raise ValidationError("No cover letter draft to export.")
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
