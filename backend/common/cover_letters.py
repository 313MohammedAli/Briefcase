"""Cover letter playbooks: templates, tones, lengths, emphasis, and prompts.

Every option here encodes a constraint taken from hiring-manager research
(the full write-up with sources is in docs/cover-letter-playbook.md):

- Tailoring is the strongest signal. Tailored letters lift callbacks; a
  generic letter does about as well as no letter. Every template ties each
  claim to something the posting asks for.
- The most common failure is restating the resume. Letters add what the
  resume can't: context behind the numbers, how the candidate works, and
  why this role.
- Proof beats adjectives. Strengths are shown with specific, ideally
  quantified, examples, never asserted ("great communicator").
- Look forward. A letter says what the candidate would do for this team,
  not only what they did before.
- Half a page to one page. Most hiring managers prefer 250-400 words, so
  "standard" is 250-350 and nothing goes past one page.
- Since AI made tailoring cheap, tailoring alone carries less signal, and
  candidate-specific detail plus the candidate's own edits carry more. The
  candidate's notes (why this company, a story to feature, a referral) are
  first-class inputs, and the prompt must use them as given.

Drafts are stored on JobApplication.cover_letter_drafts as plain dicts, so
this module also owns their shape (see new_draft()).
"""

import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .generation import _job_context, _strip_dashes, _structured_call

MAX_DRAFTS = 12
MAX_FOCUS = 2

INPUT_LIMITS = {
    "recipient": 120,
    "why_company": 600,
    "highlight": 800,
    "referral": 200,
    "context": 400,
    "instructions": 400,
}
CUSTOM_REWRITE_LIMIT = 300


# --------------------------------------------------------------------------
# Option registries
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Template:
    key: str
    name: str
    tagline: str
    best_for: str
    # Ordered beats: (short name, instruction). An order, not a paragraph
    # count; the length option decides how beats map onto paragraphs.
    beats: tuple[tuple[str, str], ...]
    rules: tuple[str, ...] = ()
    lengths: tuple[str, ...] = ("brief", "standard", "detailed")
    requires: tuple[str, ...] = ()  # input keys that must be filled


@dataclass(frozen=True)
class Tone:
    key: str
    name: str
    description: str
    instruction: str
    greeting: str  # with a recipient; "{recipient}"
    greeting_fallback: str  # without one; "{company}"
    closing: str


@dataclass(frozen=True)
class Length:
    key: str
    name: str
    min_words: int
    max_words: int
    paragraphs: str


@dataclass(frozen=True)
class Focus:
    key: str
    name: str
    instruction: str


@dataclass(frozen=True)
class RewriteMode:
    key: str
    name: str
    instruction: str


TEMPLATES: dict[str, Template] = {
    t.key: t
    for t in [
        Template(
            key="proof_first",
            name="Proof first",
            tagline="Open with your strongest measurable win and tie it to what they need.",
            best_for="Most applications where your experience maps straight onto the role.",
            beats=(
                (
                    "Hook",
                    "Open with the candidate's single most relevant, concrete "
                    "accomplishment (with its number if the experience gives one). "
                    "In the next sentence connect it to the most important need in "
                    "the posting, and name the role.",
                ),
                (
                    "Proof",
                    "Two more pieces of evidence, each mapped to a different top "
                    "requirement from the posting: the situation, what the "
                    "candidate did, and what changed as a result.",
                ),
                (
                    "Why this team",
                    "A specific, factual reason the candidate wants this role at "
                    "this company, grounded in the posting or the candidate's notes.",
                ),
                (
                    "Close",
                    "Look forward: what the candidate would want to dig into first "
                    "in this role, then a short, confident ask for a conversation.",
                ),
            ),
        ),
        Template(
            key="problem_solver",
            name="Problem solver",
            tagline="Name the challenge the posting hints at, then show you've solved it before.",
            best_for="Roles hired to fix, build, or scale something specific. Strongest for experienced hires.",
            beats=(
                (
                    "Their challenge",
                    "Open by naming the core problem this hire is meant to solve, "
                    "read from the posting (for example 'The posting talks about "
                    "...'). Frame it as an observation from the posting.",
                ),
                (
                    "Track record",
                    "Show the candidate has solved this kind of problem before: the "
                    "situation, what they did, and the measurable result.",
                ),
                (
                    "Approach",
                    "Two or three sentences on how the candidate would approach this "
                    "team's version of the problem, drawn from what worked before. "
                    "Concrete and modest, not a 90-day plan.",
                ),
                ("Close", "Offer to talk through the approach in a conversation."),
            ),
            rules=(
                "Never claim insider knowledge, criticize the company, or imply it "
                "is failing. The problem comes from the posting, nothing else.",
            ),
        ),
        Template(
            key="story",
            name="Story-led",
            tagline="Open on a real moment from your work that shows how you think.",
            best_for="Mission-driven teams, startups, creative, education, and healthcare roles.",
            beats=(
                (
                    "Moment",
                    "Open with one brief, concrete moment from the candidate's "
                    "experience (two or three sentences) that shows how they work or "
                    "why this field matters to them. Start in the middle of the "
                    "action with no preamble. If the candidate gave a story to "
                    "feature, use that one.",
                ),
                (
                    "Meaning",
                    "Step back: what that moment shows about how the candidate works, "
                    "and why it matters for this role.",
                ),
                (
                    "Proof",
                    "One or two more pieces of evidence that the pattern holds, "
                    "mapped to the posting's requirements.",
                ),
                (
                    "Close",
                    "Connect the story to what the candidate wants to do on this "
                    "team, then ask for a conversation.",
                ),
            ),
            rules=(
                "The story must come from the candidate's experience or notes. Never "
                "invent scenes, dialogue, people, or sensory details.",
            ),
        ),
        Template(
            key="requirements_match",
            name="Requirements match",
            tagline="Line up their top requirements against your evidence, point by point.",
            best_for="Structured roles with clear must-haves: engineering, finance, government, IT, operations.",
            beats=(
                (
                    "Intro",
                    "One or two sentences: the role, and that the candidate's "
                    "background lines up with what the posting asks for.",
                ),
                (
                    "Requirements",
                    "The posting's most important requirements, one paragraph each "
                    "(two at brief length, three at standard, four at detailed). "
                    "Start each paragraph with the requirement as a short label in "
                    "the posting's own words followed by a colon (for example "
                    "'Distributed systems: ...'), then one or two sentences of "
                    "specific evidence.",
                ),
                (
                    "Close",
                    "One sentence on why this role specifically, then a short ask.",
                ),
            ),
            rules=(
                "Only pick requirements the candidate can honestly back with "
                "evidence from their experience.",
            ),
        ),
        Template(
            key="career_change",
            name="Career pivot",
            tagline="Own the change up front and translate your experience into their language.",
            best_for="Moving into a new field or function.",
            beats=(
                (
                    "The pivot",
                    "Open by naming the move directly and confidently (from what, to "
                    "what) and the reason for it in one sentence.",
                ),
                (
                    "Transferable proof",
                    "Two or three skills from the candidate's past work that this "
                    "role needs, each translated into the new field's vocabulary and "
                    "backed by a specific example.",
                ),
                (
                    "Preparation",
                    "What the candidate has already done toward the new field "
                    "(projects, courses, certifications, side work). Skip this beat "
                    "entirely if the experience shows none.",
                ),
                (
                    "Close",
                    "What the outside perspective adds to this team, then a short ask.",
                ),
            ),
            rules=(
                "Never apologize for the candidate's background or frame it as a "
                "weakness ('although I lack', 'while I don't have').",
            ),
        ),
        Template(
            key="early_career",
            name="Early career",
            tagline="Lead with projects and internships, and show how fast you learn.",
            best_for="Students, new grads, internships, and first roles in a field.",
            beats=(
                (
                    "Hook",
                    "Name the role and open with the candidate's most relevant "
                    "project, internship, or result, stated concretely.",
                ),
                (
                    "Evidence",
                    "One or two examples from projects, internships, coursework, or "
                    "activities that map to the posting: what they built or did, the "
                    "tools used, and the outcome.",
                ),
                (
                    "How you work",
                    "Evidence of how the candidate learns and works (picking up a "
                    "tool quickly, acting on feedback, owning something end to end), "
                    "backed by an example.",
                ),
                (
                    "Close",
                    "What the candidate wants to learn and contribute on this team, "
                    "then a short ask.",
                ),
            ),
            rules=(
                "Don't apologize for limited experience. Specific projects beat "
                "GPAs and lists of course names.",
            ),
        ),
        Template(
            key="warm_intro",
            name="Warm intro",
            tagline="Lead with your mutual connection, then earn the referral.",
            best_for="When someone at the company referred you or suggested you apply.",
            requires=("referral",),
            beats=(
                (
                    "Connection",
                    "Open by naming the referral exactly as the candidate's notes give "
                    "it, plus why they suggested the candidate apply if the notes say. "
                    "Then name the role.",
                ),
                (
                    "Proof",
                    "Two pieces of evidence mapped to the posting's top requirements.",
                ),
                (
                    "Why this team",
                    "A specific, factual reason the candidate wants this role.",
                ),
                ("Close", "A short ask for a conversation."),
            ),
            rules=(
                "Mention the referral once, in the opening. Don't overstate the "
                "relationship or claim an endorsement the notes don't support.",
            ),
        ),
        Template(
            key="leadership",
            name="Leadership",
            tagline="Show the scope you've owned, the calls you've made, and the teams you've built.",
            best_for="Manager, director, and executive roles.",
            beats=(
                (
                    "Hook",
                    "Open with the scale and outcome of the candidate's most relevant "
                    "leadership work (team size, budget, scope, result) and connect "
                    "it to this role's mandate as the posting describes it.",
                ),
                (
                    "How you lead",
                    "How the candidate builds and runs teams, with one concrete "
                    "example (hiring, developing people, changing how a team works).",
                ),
                (
                    "Results",
                    "One or two business outcomes the candidate drove, with numbers "
                    "where the experience provides them.",
                ),
                (
                    "Point of view",
                    "A brief, grounded view on what this role should focus on first, "
                    "based on the posting. Confident, not presumptuous.",
                ),
                ("Close", "A short ask for a conversation."),
            ),
            rules=(
                "Prefer outcomes and decisions over activities. Use 'we' for team "
                "results and 'I' for the candidate's own decisions.",
            ),
        ),
        Template(
            key="quick_note",
            name="Quick note",
            tagline="A short, sharp note for form fields, recruiter emails, and LinkedIn messages.",
            best_for="Application forms with a text box, or messaging a recruiter directly.",
            lengths=("brief",),
            beats=(
                (
                    "Who and why",
                    "One or two sentences: the role, and the single strongest reason "
                    "the candidate fits.",
                ),
                (
                    "Proof",
                    "One concrete accomplishment mapped to the posting's top need.",
                ),
                ("Ask", "One sentence asking for a conversation."),
            ),
            rules=(
                "No warm-up sentences; every sentence must carry information. Aim "
                "for the low end of the word range.",
            ),
        ),
    ]
}

TONES: dict[str, Tone] = {
    t.key: t
    for t in [
        Tone(
            key="professional",
            name="Professional",
            description="Polished and measured. Right for almost anything.",
            instruction=(
                "Polished, measured, and warm. Plain business English; "
                "contractions are fine but sparing."
            ),
            greeting="Dear {recipient},",
            greeting_fallback="Dear {company} Hiring Team,",
            closing="Best regards",
        ),
        Tone(
            key="conversational",
            name="Conversational",
            description="Sounds like you talking to a respected colleague.",
            instruction=(
                "Write the way the candidate would talk to a respected colleague: "
                "contractions, plain words, a little personality, short sentences "
                "mixed with longer ones. No slang, no jokes."
            ),
            greeting="Hi {recipient},",
            greeting_fallback="Hello {company} team,",
            closing="Thanks",
        ),
        Tone(
            key="direct",
            name="Direct",
            description="Short, confident sentences. Results first, no hedging.",
            instruction=(
                "Confident and economical. Short declarative sentences. Lead with "
                "results. Remove hedges such as 'I believe', 'I think', 'I feel', "
                "and 'I hope'. Confidence comes from evidence, not adjectives."
            ),
            greeting="Dear {recipient},",
            greeting_fallback="Dear {company} Hiring Team,",
            closing="Best",
        ),
        Tone(
            key="enthusiastic",
            name="Enthusiastic",
            description="Visible energy, carried by specifics rather than adjectives.",
            instruction=(
                "Visible energy about the work, carried by specifics (what exactly "
                "interests the candidate about this team's work) rather than "
                "adjectives like 'thrilled' or 'excited'. At most one exclamation "
                "mark in the whole letter."
            ),
            greeting="Dear {recipient},",
            greeting_fallback="Dear {company} Hiring Team,",
            closing="Thank you",
        ),
        Tone(
            key="formal",
            name="Formal",
            description="Traditional register for law, government, finance, and academia.",
            instruction=(
                "Traditional business register: no contractions, complete "
                "sentences, a courteous close. Formal is not stiff; keep sentences "
                "clear and concrete."
            ),
            greeting="Dear {recipient},",
            greeting_fallback="Dear {company} Hiring Committee,",
            closing="Sincerely",
        ),
    ]
}

LENGTHS: dict[str, Length] = {
    length.key: length
    for length in [
        Length("brief", "Brief", 120, 180, "two or three"),
        Length("standard", "Standard", 250, 350, "three or four"),
        Length("detailed", "Detailed", 400, 500, "four or five"),
    ]
}

FOCUSES: dict[str, Focus] = {
    f.key: f
    for f in [
        Focus(
            "impact",
            "Measurable results",
            "Favor evidence with numbers: revenue, time saved, growth, scale, quality.",
        ),
        Focus(
            "technical",
            "Technical depth",
            "Favor evidence of technical judgment: tools, architecture, trade-offs, "
            "and hard problems solved. Name the technologies the posting asks for "
            "when the experience includes them.",
        ),
        Focus(
            "leadership",
            "Leadership",
            "Favor evidence of leading people or initiatives: decisions made, people "
            "developed, teams aligned.",
        ),
        Focus(
            "collaboration",
            "Collaboration",
            "Favor evidence of cross-functional work: who the candidate worked with "
            "and what they achieved together.",
        ),
        Focus(
            "mission",
            "Mission & values",
            "Give more room to why this company's mission or product matters to the "
            "candidate, using only the posting and the candidate's notes.",
        ),
        Focus(
            "growth",
            "Growth & learning",
            "Favor evidence of fast learning and growing scope: new skills picked "
            "up, bigger responsibilities over time.",
        ),
    ]
}

REWRITE_MODES: dict[str, RewriteMode] = {
    m.key: m
    for m in [
        RewriteMode("fresh", "Fresh take", "Write a fresh take with the same purpose."),
        RewriteMode(
            "shorter",
            "Shorter",
            "Cut it to roughly half its length. Keep the strongest point; drop the rest.",
        ),
        RewriteMode(
            "specific",
            "More specific",
            "Replace general claims with a concrete example, tool, or number from "
            "the candidate's experience.",
        ),
        RewriteMode(
            "warmer",
            "Warmer",
            "Make it warmer and more personal without adding filler or flattery.",
        ),
        RewriteMode(
            "direct",
            "More direct",
            "Make it more direct and confident: lead with the point and remove "
            "hedges such as 'I believe', 'I think', and 'I feel'.",
        ),
    ]
}

# Phrases that read as generic or AI-written to hiring managers. The prompt
# bans them; the frontend's letter check flags them if a user's edits bring
# them back. Lowercase, matched as substrings.
CLICHES = [
    "i am writing to express",
    "i am writing to apply",
    "i'm writing to apply",
    "i am excited to apply",
    "i am thrilled",
    "proven track record",
    "detail-oriented",
    "team player",
    "hard-working",
    "hardworking",
    "results-driven",
    "self-starter",
    "go-getter",
    "think outside the box",
    "passionate about",
    "leverage",
    "synergy",
    "delve",
    "fostering",
    "dynamic environment",
    "fast-paced environment",
    "in today's fast-paced",
    "ever-evolving",
    "landscape",
    "tapestry",
    "testament to",
    "aligns with",
    "aligns perfectly",
    "resonates with",
    "unique blend",
    "spearheaded",
    "showcase",
    "hit the ground running",
    "make a meaningful impact",
    "esteemed",
    "i believe i would be a great fit",
    "perfect fit",
    "ideal candidate",
]

STOCK_OPENERS = [
    "i am writing",
    "i'm writing",
    "my name is",
    "i am excited to apply",
    "i'm excited to apply",
    "i would like to apply",
    "i am applying",
    "i'm applying",
    "please accept",
    "i wish to apply",
]

STYLE_RULES = (
    "Write like a person, not a press release. Plain, direct sentences with "
    "varied length. Never use em dashes or en dashes. Never open with a stock "
    "line ('I am writing to', 'I am excited to apply', 'My name is'). Don't "
    "start more than about a third of sentences with 'I', and don't start "
    "sentences with 'By [verb]ing'. No rhetorical questions, and don't end "
    "paragraphs with a summarizing flourish ('...which is exactly what your "
    "team needs'). Never use these phrases or close variants: "
    + "; ".join(f"'{c}'" for c in CLICHES)
    + ". State things concretely instead of gesturing at enthusiasm."
)

CORE_PRINCIPLES = (
    "What a strong letter does:\n"
    "1. Adds what the resume can't: the context behind the results, how the "
    "candidate works, and why this role. Never walk through the resume line by line.\n"
    "2. Is unmistakably for this job: it names the company and role, and ties "
    "each claim to something the posting asks for.\n"
    "3. Proves instead of asserting: every strength is shown with a specific "
    "example from the candidate's experience, with a number where the "
    "experience gives one. No unbacked self-descriptions such as 'great "
    "communicator' or 'hard worker'.\n"
    "4. Looks forward: it says what the candidate would do for this team, not "
    "only what they did before.\n"
    "5. Respects the reader's time: short paragraphs with one idea each and no "
    "warm-up sentences."
)

TRUTH_RULES = (
    "Truthfulness, non-negotiable:\n"
    "- Use only experience from the candidate's materials. Never invent "
    "employers, titles, metrics, tools, dates, stories, or dialogue. If a "
    "number isn't in the materials, describe the result without one.\n"
    "- Mention only facts about the company that appear in the job posting or "
    "the candidate's notes. Don't invent products, news, values, or culture.\n"
    "- Where the candidate's notes give their reasons or a story, build on them "
    "and keep their substance; don't swap in invented motivation."
)


# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------


_EARLY_CAREER = re.compile(
    r"\b(intern|internship|graduate|new grad|entry[- ]level|junior|apprentice|trainee)\b"
)
_LEADERSHIP = re.compile(
    r"\b(director|vp|svp|evp|vice president|head of|chief|cto|ceo|coo|cfo|cmo"
    r"|engineering manager)\b"
)


def recommend_template(job_title: str) -> str:
    """Cheap, deterministic default from the job title alone."""
    title = job_title.lower()
    if _EARLY_CAREER.search(title):
        return "early_career"
    if _LEADERSHIP.search(title):
        return "leadership"
    return "proof_first"


def default_settings(job_title: str = "") -> dict:
    return {
        "template": recommend_template(job_title),
        "tone": "professional",
        "length": "standard",
        "focus": [],
        "inputs": {key: "" for key in INPUT_LIMITS},
        "mirror_keywords": True,
    }


def normalize_settings(raw, job_title: str = "") -> dict:
    """Validates client-sent draft settings, filling defaults.

    Raises ValueError with a user-facing message on invalid input.
    """
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise ValueError("settings must be an object.")
    settings = default_settings(job_title)

    template = raw.get("template", settings["template"])
    if template not in TEMPLATES:
        raise ValueError(f"template must be one of {list(TEMPLATES)}.")
    tone = raw.get("tone", settings["tone"])
    if tone not in TONES:
        raise ValueError(f"tone must be one of {list(TONES)}.")
    length = raw.get("length", settings["length"])
    if length not in LENGTHS:
        raise ValueError(f"length must be one of {list(LENGTHS)}.")
    allowed = TEMPLATES[template].lengths
    if length not in allowed:
        # Fixed-length templates (Quick note) win over the length picker.
        length = allowed[0]

    focus = raw.get("focus", [])
    if not isinstance(focus, list) or not all(f in FOCUSES for f in focus):
        raise ValueError(f"focus must be a list drawn from {list(FOCUSES)}.")
    focus = list(dict.fromkeys(focus))
    if len(focus) > MAX_FOCUS:
        raise ValueError(f"Pick at most {MAX_FOCUS} areas of emphasis.")

    raw_inputs = raw.get("inputs", {}) or {}
    if not isinstance(raw_inputs, dict):
        raise ValueError("inputs must be an object.")
    inputs = {}
    for key, limit in INPUT_LIMITS.items():
        value = raw_inputs.get(key, "")
        if not isinstance(value, str):
            raise ValueError(f"inputs.{key} must be text.")
        value = value.strip()
        if len(value) > limit:
            raise ValueError(f"inputs.{key} must be {limit} characters or fewer.")
        inputs[key] = value

    for key in TEMPLATES[template].requires:
        if not inputs[key]:
            raise ValueError(
                f"The {TEMPLATES[template].name} template needs the '{key}' field filled in."
            )

    return {
        "template": template,
        "tone": tone,
        "length": length,
        "focus": focus,
        "inputs": inputs,
        "mirror_keywords": bool(raw.get("mirror_keywords", True)),
    }


def settings_of(draft: dict) -> dict:
    return {k: draft.get(k) for k in ("template", "tone", "length", "focus", "inputs", "mirror_keywords")}


def new_draft(settings: dict, paragraphs: list[str], coverage: list[dict], label: str = "") -> dict:
    return {
        "id": uuid.uuid4().hex[:12],
        **settings,
        "label": label,
        "paragraphs": paragraphs,
        "coverage": coverage,
        "edited": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def options_payload() -> dict:
    """Everything the builder UI needs, so the backend stays the source of truth."""
    return {
        "templates": [
            {
                "key": t.key,
                "name": t.name,
                "tagline": t.tagline,
                "best_for": t.best_for,
                "beats": [name for name, _ in t.beats],
                "lengths": list(t.lengths),
                "requires": list(t.requires),
            }
            for t in TEMPLATES.values()
        ],
        "tones": [
            {"key": t.key, "name": t.name, "description": t.description} for t in TONES.values()
        ],
        "lengths": [
            {"key": l.key, "name": l.name, "min_words": l.min_words, "max_words": l.max_words}
            for l in LENGTHS.values()
        ],
        "focuses": [{"key": f.key, "name": f.name} for f in FOCUSES.values()],
        "rewrite_modes": [{"key": m.key, "name": m.name} for m in REWRITE_MODES.values()],
        "cliches": CLICHES,
        "stock_openers": STOCK_OPENERS,
        "limits": {
            "max_focus": MAX_FOCUS,
            "max_drafts": MAX_DRAFTS,
            "inputs": INPUT_LIMITS,
            "custom_rewrite": CUSTOM_REWRITE_LIMIT,
        },
        "defaults": default_settings(),
    }


# --------------------------------------------------------------------------
# Prompts
# --------------------------------------------------------------------------


def _greeting(tone: Tone, recipient: str, company: str) -> str:
    if recipient:
        return tone.greeting.format(recipient=recipient)
    return tone.greeting_fallback.format(company=company)


def _structure_block(template: Template, length: Length) -> str:
    beats = "\n".join(
        f"{i}. {name}: {instruction}" for i, (name, instruction) in enumerate(template.beats, 1)
    )
    rules = "".join(f"\n- {r}" for r in template.rules)
    return (
        f"Structure: the '{template.name}' template. Follow these beats in order. "
        "They set the order of ideas, not the paragraph count: at a short length "
        "merge beats, at a long length a beat may take two paragraphs.\n"
        f"{beats}"
        + (f"\nTemplate rules:{rules}" if rules else "")
        + f"\n\nLength: {length.min_words} to {length.max_words} words in the body "
        f"(not counting greeting and sign-off), in {length.paragraphs} body "
        "paragraphs. Never longer than one page."
    )


def _notes_block(inputs: dict) -> str:
    labels = {
        "why_company": "Why the candidate wants this job (their words; build the motivation on this)",
        "highlight": "Story or achievement the candidate wants featured (build the letter around it)",
        "referral": "Referral or connection at the company",
        "context": "Context the candidate wants addressed (handle it briefly and positively)",
        "instructions": "Extra instructions from the candidate (follow them unless they conflict with truthfulness)",
    }
    lines = [f"{label}:\n{inputs[key]}" for key, label in labels.items() if inputs.get(key)]
    if not lines:
        return (
            "Candidate's notes: none given. Ground the motivation in what the "
            "posting says about the work, without inventing company facts."
        )
    return "Candidate's notes:\n\n" + "\n\n".join(lines)


def build_draft_prompt(
    job_application,
    settings: dict,
    experience_text: str,
    candidate_name: str = "",
    personal_statement: str = "",
    keywords: list[str] | None = None,
) -> tuple[str, str]:
    """Returns (system, user) prompts for one draft. Pure, for testability."""
    template = TEMPLATES[settings["template"]]
    tone = TONES[settings["tone"]]
    length = LENGTHS[settings["length"]]
    inputs = settings["inputs"]

    focus_block = ""
    if settings["focus"]:
        focus_block = "\n\nEmphasis:\n" + "\n".join(
            f"- {FOCUSES[f].name}: {FOCUSES[f].instruction}" for f in settings["focus"]
        )

    sign_name = candidate_name or "[Your Name]"
    greeting = _greeting(tone, inputs.get("recipient", ""), job_application.company)

    system = (
        "You write cover letters that hiring managers finish reading. You write "
        "as the candidate, in the first person, and never refer to them in the "
        "third person.\n\n"
        f"{CORE_PRINCIPLES}\n\n"
        f"{TRUTH_RULES}\n\n"
        f"{_structure_block(template, length)}\n\n"
        f"Tone: {tone.name}. {tone.instruction}"
        f"{focus_block}\n\n"
        f"Style: {STYLE_RULES}\n\n"
        "Format: return the letter as an array of paragraphs. The first item is "
        f"the greeting alone, exactly: {greeting} The last item is the sign-off "
        f"alone, exactly: {tone.closing},\\n{sign_name} (with a real line break). "
        "Body paragraphs go in between.\n\n"
        "Also return 'coverage': the two to five requirements from the posting "
        "that the letter argues the candidate meets, each with the specific "
        "experience used as evidence, in a few words each."
    )

    keyword_block = ""
    if settings.get("mirror_keywords") and keywords:
        keyword_block = (
            "\n\nKeywords from the posting that the candidate's experience backs "
            "(use the posting's exact wording for a few of these where they fit "
            "naturally; never force them in):\n" + ", ".join(keywords)
        )
    statement_block = (
        "\n\nCandidate's personal statement (draw on it for voice and motivation "
        f"only where it strengthens the letter):\n{personal_statement}"
        if personal_statement.strip()
        else ""
    )
    user = (
        f"{_job_context(job_application)}\n\n"
        f"Candidate name: {candidate_name or 'not provided'}\n\n"
        f"Candidate's relevant experience:\n{experience_text}"
        f"{statement_block}\n\n"
        f"{_notes_block(inputs)}"
        f"{keyword_block}"
    )
    return system, user


DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "paragraphs": {"type": "array", "items": {"type": "string"}},
        "coverage": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "requirement": {"type": "string"},
                    "evidence": {"type": "string"},
                },
                "required": ["requirement", "evidence"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["paragraphs", "coverage"],
    "additionalProperties": False,
}


def generate_draft(
    job_application,
    settings: dict,
    experience_text: str,
    candidate_name: str = "",
    personal_statement: str = "",
    keywords: list[str] | None = None,
) -> dict:
    """Writes one draft and returns it as a storable dict."""
    system, user = build_draft_prompt(
        job_application, settings, experience_text, candidate_name, personal_statement, keywords
    )
    result = _structured_call(system, user, "cover_letter_draft", DRAFT_SCHEMA)
    paragraphs = [_strip_dashes(p).strip() for p in result["paragraphs"] if p.strip()]
    coverage = [
        {"requirement": _strip_dashes(c["requirement"]), "evidence": _strip_dashes(c["evidence"])}
        for c in result["coverage"][:5]
    ]
    return new_draft(settings, paragraphs, coverage)


def build_rewrite_prompt(
    job_application,
    draft: dict,
    index: int,
    experience_text: str,
    mode: str = "fresh",
    custom: str = "",
) -> tuple[str, str]:
    template = TEMPLATES.get(draft.get("template"), TEMPLATES["proof_first"])
    tone = TONES.get(draft.get("tone"), TONES["professional"])
    paragraphs = draft["paragraphs"]
    numbered = "\n\n".join(f"[{i}] {p}" for i, p in enumerate(paragraphs))
    beats = " > ".join(name for name, _ in template.beats)
    change = custom.strip() or REWRITE_MODES[mode].instruction

    system = (
        "You edit one paragraph of an existing cover letter, written as the "
        "candidate in the first person. Rewrite ONLY the requested paragraph so "
        "it still flows with the paragraphs around it and keeps doing its job in "
        f"the letter's structure ({template.name}: {beats}).\n\n"
        f"Tone: {tone.name}. {tone.instruction}\n\n"
        f"{TRUTH_RULES}\n\n"
        f"Style: {STYLE_RULES}\n\n"
        f"The change the candidate wants: {change}"
    )
    user = (
        f"{_job_context(job_application)}\n\n"
        f"Candidate's relevant experience:\n{experience_text}\n\n"
        f"Current letter (numbered paragraphs):\n{numbered}\n\n"
        f"Rewrite paragraph [{index}]."
    )
    return system, user


def rewrite_paragraph(
    job_application,
    draft: dict,
    index: int,
    experience_text: str,
    mode: str = "fresh",
    custom: str = "",
) -> str:
    system, user = build_rewrite_prompt(job_application, draft, index, experience_text, mode, custom)
    schema = {
        "type": "object",
        "properties": {"paragraph": {"type": "string"}},
        "required": ["paragraph"],
        "additionalProperties": False,
    }
    return _strip_dashes(
        _structured_call(system, user, "rewritten_paragraph", schema)["paragraph"]
    ).strip()


# --------------------------------------------------------------------------
# Legacy migration
# --------------------------------------------------------------------------

LEGACY_VARIANTS = {
    "concise": {"tone": "professional", "length": "brief", "label": "Concise (original)"},
    "detailed": {"tone": "professional", "length": "detailed", "label": "Detailed (original)"},
    "enthusiastic": {"tone": "enthusiastic", "length": "standard", "label": "Enthusiastic (original)"},
}


def drafts_from_legacy(letters: dict, selected_variant: str) -> tuple[list[dict], str]:
    """Converts {variant: [paragraphs]} into drafts. Returns (drafts, selected_id)."""
    drafts, selected = [], ""
    for variant, spec in LEGACY_VARIANTS.items():
        paragraphs = (letters or {}).get(variant)
        if not paragraphs:
            continue
        settings = {
            **default_settings(),
            "template": "proof_first",
            "tone": spec["tone"],
            "length": spec["length"],
        }
        draft = new_draft(settings, list(paragraphs), [], label=spec["label"])
        drafts.append(draft)
        # First draft is the fallback; the previously selected variant wins.
        if variant == selected_variant or not selected:
            selected = draft["id"]
    return drafts, selected
