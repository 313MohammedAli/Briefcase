"""LLM generation for cover letters, resume tailoring, and ATS analysis.

All calls use OPENAI_GENERATION_MODEL with structured JSON output so
responses parse deterministically. Cover letter variants are produced
in a single call (per the SRS, to minimize cost/latency), and each
variant is a list of paragraphs so the UI can regenerate one paragraph
at a time.
"""

import json

from django.conf import settings

from .embeddings import _get_client, embed_texts

COVER_LETTER_VARIANTS = ["concise", "detailed", "enthusiastic"]

# Cosine similarity above which an ATS keyword counts as covered by the
# experience bank (tuned for text-embedding-3-small keyword-vs-bullet pairs).
KEYWORD_MATCH_THRESHOLD = 0.40


def _structured_call(system: str, user: str, schema_name: str, schema: dict) -> dict:
    response = _get_client().chat.completions.create(
        model=settings.OPENAI_GENERATION_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": schema_name, "strict": True, "schema": schema},
        },
    )
    return json.loads(response.choices[0].message.content)


def _job_context(job_application) -> str:
    return (
        f"Job title: {job_application.job_title}\n"
        f"Company: {job_application.company}\n\n"
        f"Job description:\n{job_application.job_description}"
    )


def generate_cover_letters(job_application, experience_text: str, candidate_name: str = "") -> dict:
    """Returns {"concise": [paragraphs], "detailed": [...], "enthusiastic": [...]}."""
    paragraphs_schema = {"type": "array", "items": {"type": "string"}}
    schema = {
        "type": "object",
        "properties": {v: paragraphs_schema for v in COVER_LETTER_VARIANTS},
        "required": COVER_LETTER_VARIANTS,
        "additionalProperties": False,
    }
    system = (
        "You are an expert career writer. Write cover letters that weave the "
        "candidate's real experience naturally into a narrative aimed at the "
        "specific job. Never invent experience the candidate does not have. "
        "Return each letter as an array of paragraphs (greeting and sign-off "
        "are their own paragraphs). Produce three variants: 'concise' (3-4 "
        "short paragraphs, direct), 'detailed' (5-6 paragraphs, expands on "
        "impact and specifics), 'enthusiastic' (4-5 paragraphs, energetic "
        "tone, strong motivation for this company)."
    )
    user = (
        f"{_job_context(job_application)}\n\n"
        f"Candidate name: {candidate_name or 'the candidate'}\n\n"
        f"Candidate's relevant experience:\n{experience_text}"
    )
    return _structured_call(system, user, "cover_letter_variants", schema)


def regenerate_paragraph(
    job_application, variant: str, paragraphs: list[str], index: int, experience_text: str
) -> str:
    """Rewrites one paragraph of a cover letter, keeping the rest as context."""
    schema = {
        "type": "object",
        "properties": {"paragraph": {"type": "string"}},
        "required": ["paragraph"],
        "additionalProperties": False,
    }
    numbered = "\n\n".join(f"[{i}] {p}" for i, p in enumerate(paragraphs))
    system = (
        "You are an expert career writer editing one paragraph of an existing "
        f"cover letter written in a {variant} tone. Rewrite ONLY the requested "
        "paragraph with a fresh take that still flows with the surrounding "
        "paragraphs, keeps the same tone, and stays truthful to the "
        "candidate's experience."
    )
    user = (
        f"{_job_context(job_application)}\n\n"
        f"Candidate's relevant experience:\n{experience_text}\n\n"
        f"Current letter (numbered paragraphs):\n{numbered}\n\n"
        f"Rewrite paragraph [{index}]."
    )
    return _structured_call(system, user, "regenerated_paragraph", schema)["paragraph"]


def tailor_resume(job_application, bullets) -> dict:
    """Reorders/reweights the experience bank into a resume for this job.

    Returns {"summary": str, "entries": [{"title", "organization", "dates",
    "bullets": [str]}]} — editable in the UI and exportable.
    """
    entry_schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "organization": {"type": "string"},
            "dates": {"type": "string"},
            "bullets": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "organization", "dates", "bullets"],
        "additionalProperties": False,
    }
    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "entries": {"type": "array", "items": entry_schema},
        },
        "required": ["summary", "entries"],
        "additionalProperties": False,
    }
    system = (
        "You are an expert resume writer. Given a candidate's experience "
        "entries and a target job description, produce a tailored resume: "
        "order entries by relevance to the job, rewrite bullets to lead with "
        "the most job-relevant impact (mirroring the job description's "
        "terminology where truthful), and drop bullets that add nothing for "
        "this job. Do not invent experience, employers, dates, or metrics. "
        "Include a 2-3 sentence professional summary targeted at this role."
    )
    from .retrieval import format_bullets_for_prompt

    user = (
        f"{_job_context(job_application)}\n\n"
        f"Candidate's experience bank:\n{format_bullets_for_prompt(bullets)}"
    )
    return _structured_call(system, user, "tailored_resume", schema)


def extract_keywords(job_description: str) -> list[str]:
    """Pulls the concrete skills/tools/qualifications an ATS would scan for."""
    schema = {
        "type": "object",
        "properties": {"keywords": {"type": "array", "items": {"type": "string"}}},
        "required": ["keywords"],
        "additionalProperties": False,
    }
    system = (
        "Extract the specific skills, tools, technologies, certifications, "
        "and qualifications from this job description that an applicant "
        "tracking system would scan resumes for. Return 10-20 short keyword "
        "phrases (1-4 words each), deduplicated, most important first. Skip "
        "generic filler like 'team player' or 'fast-paced environment'."
    )
    result = _structured_call(system, job_description, "ats_keywords", schema)
    return result["keywords"]


def keyword_gap_analysis(keywords: list[str], bullets) -> dict:
    """Splits keywords into matched/missing vs. the experience bank.

    A keyword is matched if it appears literally in any bullet text or
    entry tags, or if its embedding is semantically close to any bullet
    embedding (>= KEYWORD_MATCH_THRESHOLD cosine similarity).
    """
    import numpy as np

    if not keywords:
        return {"matched": [], "missing": []}

    haystack = " ".join(
        b.text.lower() + " " + " ".join(t.lower() for t in b.entry.tags) for b in bullets
    )
    bullet_vectors = [b.embedding for b in bullets if b.embedding is not None]
    keyword_vectors = embed_texts(keywords) if bullet_vectors else None

    matched, missing = [], []
    for i, keyword in enumerate(keywords):
        if keyword.lower() in haystack:
            matched.append(keyword)
            continue
        if keyword_vectors:
            kv = np.array(keyword_vectors[i])
            kv = kv / np.linalg.norm(kv)
            best = max(
                float(np.dot(kv, bv / np.linalg.norm(bv)))
                for bv in (np.array(v) for v in bullet_vectors)
            )
            if best >= KEYWORD_MATCH_THRESHOLD:
                matched.append(keyword)
                continue
        missing.append(keyword)
    return {"matched": matched, "missing": missing}
