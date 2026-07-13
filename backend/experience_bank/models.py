import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from pgvector.django import HnswIndex, VectorField

from accounts.models import Profile


class ExperienceEntry(models.Model):
    class EntryType(models.TextChoices):
        JOB = "job", "Job"
        PROJECT = "project", "Project"
        CERTIFICATION = "certification", "Certification"
        EDUCATION = "education", "Education"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="experience_entries")
    type = models.CharField(max_length=20, choices=EntryType.choices)
    title = models.CharField(max_length=255)
    organization = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    tags = ArrayField(models.CharField(max_length=100), blank=True, default=list)

    # Whether the entry is finished. Meaningful mainly for education (degree
    # completed vs. in progress) and certifications; null for types where it
    # doesn't apply (jobs, projects).
    completed = models.BooleanField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.organization})" if self.organization else self.title


class ExperienceBullet(models.Model):
    """One granular description/bullet line for an ExperienceEntry.

    Stored as its own row (rather than one text blob per entry) so
    retrieval can pull individually relevant bullets into a generation
    prompt. Embedded via `text-embedding-3-small` on create/update.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry = models.ForeignKey(ExperienceEntry, on_delete=models.CASCADE, related_name="bullets")
    text = models.TextField()
    embedding = VectorField(dimensions=settings.EMBEDDING_DIMENSIONS, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        indexes = [
            HnswIndex(
                name="bullet_embedding_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return self.text[:60]
