"""Embedding-based retrieval over a user's experience bank.

Implements the SRS retrieval rules:
- top 6-8 most relevant bullets via pgvector cosine distance (`<=>`)
- small-bank fallback: under SMALL_BANK_THRESHOLD entries, skip
  retrieval and pass every bullet into the generation prompt
- fit score derived from aggregate cosine similarity (no extra AI call)
"""

from dataclasses import dataclass

from django.conf import settings
from pgvector.django import CosineDistance

from experience_bank.models import ExperienceBullet, ExperienceEntry


@dataclass
class RetrievalResult:
    bullets: list[ExperienceBullet]
    used_retrieval: bool  # False when the small-bank fallback kicked in
    match_score: float | None  # 0-100, None if nothing could be scored


def _score_from_distances(distances: list[float]) -> float:
    """Maps mean cosine distance of the retrieved set to a 0-100 score.

    Cosine similarity for text-embedding-3-small typically lands in
    ~[0.1, 0.6] for unrelated vs. strongly related text, so a raw mean
    would cluster scores in a narrow band. Stretch that practical range
    across 0-100 and clamp.
    """
    similarities = [1.0 - d for d in distances]
    mean = sum(similarities) / len(similarities)
    scaled = (mean - 0.1) / (0.6 - 0.1) * 100
    return round(max(0.0, min(100.0, scaled)), 1)


def retrieve_relevant_bullets(owner, job_description_embedding) -> RetrievalResult:
    """Returns the bullets to feed into generation for this job description."""
    entry_count = ExperienceEntry.objects.filter(owner=owner).count()
    bank = ExperienceBullet.objects.filter(entry__owner=owner).select_related("entry")

    if job_description_embedding is None:
        return RetrievalResult(list(bank), used_retrieval=False, match_score=None)

    embedded = bank.exclude(embedding__isnull=True).annotate(
        distance=CosineDistance("embedding", job_description_embedding)
    ).order_by("distance")

    if entry_count < settings.SMALL_BANK_THRESHOLD:
        # Small bank: everything goes into the prompt, but still rank the
        # embedded bullets so the fit score reflects the best matches.
        top = list(embedded[: settings.RETRIEVAL_TOP_K])
        distances = [b.distance for b in top]
        score = _score_from_distances(distances) if distances else None
        return RetrievalResult(list(bank), used_retrieval=False, match_score=score)

    top = list(embedded[: settings.RETRIEVAL_TOP_K])
    distances = [b.distance for b in top]
    score = _score_from_distances(distances) if distances else None
    return RetrievalResult(top, used_retrieval=True, match_score=score)


def format_bullets_for_prompt(bullets: list[ExperienceBullet]) -> str:
    """Renders bullets grouped under their parent entry for an LLM prompt."""
    by_entry: dict = {}
    for bullet in bullets:
        by_entry.setdefault(bullet.entry, []).append(bullet)

    sections = []
    for entry, entry_bullets in by_entry.items():
        dates = ""
        if entry.start_date:
            end = entry.end_date.strftime("%b %Y") if entry.end_date else "Present"
            dates = f" ({entry.start_date.strftime('%b %Y')} - {end})"
        header = f"{entry.get_type_display()}: {entry.title}"
        if entry.organization:
            header += f" at {entry.organization}"
        header += dates
        if entry.tags:
            header += f"\nSkills/tags: {', '.join(entry.tags)}"
        lines = "\n".join(f"- {b.text}" for b in entry_bullets)
        sections.append(f"{header}\n{lines}")
    return "\n\n".join(sections)
