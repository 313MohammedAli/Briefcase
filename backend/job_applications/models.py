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

    # Paragraph arrays per variant, so the UI can regenerate one paragraph
    # at a time: {"concise": ["...", ...], "detailed": [...], "enthusiastic": [...]}
    generated_cover_letters = models.JSONField(default=dict, blank=True)
    selected_variant = models.CharField(max_length=20, blank=True)

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
