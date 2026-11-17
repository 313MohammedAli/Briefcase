import uuid

from django.conf import settings
from django.db import models
from pgvector.django import VectorField

from accounts.models import Profile


class JobApplication(models.Model):
    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        INTERVIEW = "interview", "Interview"
        REJECTED = "rejected", "Rejected"
        OFFER = "offer", "Offer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="job_applications")

    job_title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    job_description = models.TextField()
    job_description_embedding = VectorField(
        dimensions=settings.EMBEDDING_DIMENSIONS, null=True, blank=True
    )

    # Cover letter drafts, newest last. Each is a dict built by
    # common.cover_letters.new_draft(): {"id", "template", "tone", "length",
    # "focus", "inputs", "mirror_keywords", "label", "paragraphs",
    # "coverage", "edited", "created_at"}. Paragraphs are separate strings so
    # the UI can rewrite one at a time.
    cover_letter_drafts = models.JSONField(default=list, blank=True)
    selected_draft = models.CharField(max_length=32, blank=True)

    # Editable/exportable tailored resume content.
    tailored_resume = models.JSONField(default=dict, blank=True)

    # Aggregate cosine similarity, computed from retrieval data (no extra AI call).
    match_score = models.FloatField(null=True, blank=True)

    # {"matched": [...], "missing": [...]}
    keyword_gap_analysis = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.job_title} @ {self.company}"

    def get_draft(self, draft_id: str | None) -> dict | None:
        """The draft with this id, else the selected one, else the newest."""
        drafts = self.cover_letter_drafts or []
        wanted = draft_id or self.selected_draft
        for draft in drafts:
            if draft.get("id") == wanted:
                return draft
        return None if draft_id else (drafts[-1] if drafts else None)
