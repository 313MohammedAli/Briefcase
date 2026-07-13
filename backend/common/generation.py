"""LLM generation for cover letters, resume tailoring, and ATS analysis.

All calls use OPENAI_GENERATION_MODEL with structured JSON output so
responses parse deterministically. Cover letter variants are produced
in a single call (per the SRS, to minimize cost/latency), and each
variant is a list of paragraphs so the UI can regenerate one paragraph
at a time.
"""

import json
import re

from django.conf import settings

from .embeddings import _get_client, embed_texts

COVER_LETTER_VARIANTS = ["concise", "detailed", "enthusiastic"]

# Shared style rules for anything a human will submit under their own name.
# Kept out of the per-call prompts so all letter generation stays consistent.
HUMAN_STYLE_RULES = (
    "Style rules, non-negotiable: write like a person, not a press release. "
    "Plain, direct sentences with varied length; contractions where natural. "
    "Never use em dashes or en dashes anywhere. Avoid AI-typical phrasing "
    "such as 'I am writing to express', 'leverage', 'delve', 'passionate "
    "about', 'aligns with', 'resonates with', 'testament to', 'showcase', "
    "'spearheaded', or 'in today's fast-paced world'. State things "
    "concretely instead of gesturing at enthusiasm."
)


def _strip_dashes(text: str) -> str:
    """Replaces em/en dashes with commas as a hard guarantee behind the prompt.

    Word-joining hyphens (e.g. 'cross-functional') are left alone.
    """
    text = re.sub(r"\s*[—–]\s*", ", ", text)
    return re.sub(r",\s*,", ",", text)

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
        f"tone, strong motivation for this company). {HUMAN_STYLE_RULES} "
        "Write in first person as the candidate; never refer to them in the "
        "third person. Sign off with the candidate's name. If no name is "
        "given, sign off with the literal placeholder [Your Name] so the "
        "user can fill it in."
    )
    name_line = (
        f"Candidate name: {candidate_name}"
        if candidate_name
        else "Candidate name: not provided (use the [Your Name] placeholder in the sign-off)"
    )
    user = (
        f"{_job_context(job_application)}\n\n"
        f"{name_line}\n\n"
        f"Candidate's relevant experience:\n{experience_text}"
    )
    letters = _structured_call(system, user, "cover_letter_variants", schema)
    return {
        variant: [_strip_dashes(p) for p in paragraphs]
        for variant, paragraphs in letters.items()
    }


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
        f"candidate's experience. {HUMAN_STYLE_RULES}"
    )
    user = (
        f"{_job_context(job_application)}\n\n"
        f"Candidate's relevant experience:\n{experience_text}\n\n"
        f"Current letter (numbered paragraphs):\n{numbered}\n\n"
        f"Rewrite paragraph [{index}]."
    )
    return _strip_dashes(
        _structured_call(system, user, "regenerated_paragraph", schema)["paragraph"]
    )


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


def extract_job_posting(page_text: str) -> dict:
    """Pulls {job_title, company, job_description} out of a fetched job page.

    Returns empty strings for anything not found so the user can fill gaps
    in the review step.
    """
    schema = {
        "type": "object",
        "properties": {
            "job_title": {"type": "string"},
            "company": {"type": "string"},
            "job_description": {"type": "string"},
        },
        "required": ["job_title", "company", "job_description"],
        "additionalProperties": False,
    }
    system = (
        "You are given the raw text of a web page that contains a job posting. "
        "Extract the job title, the hiring company's name, and the full job "
        "description (responsibilities, requirements, and qualifications). "
        "Exclude site navigation, cookie banners, unrelated links, and other "
        "postings. If a field genuinely isn't present, return an empty string. "
        "Do not invent details."
    )
    # Cap input so a huge page can't blow up token cost.
    return _structured_call(system, page_text[:20000], "job_posting", schema)


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
