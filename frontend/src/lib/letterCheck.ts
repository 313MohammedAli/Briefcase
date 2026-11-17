import type { CoverLetterDraft, CoverLetterOptions } from "./types";

/**
 * Live, client-side review of a cover letter against the constraints in
 * docs/cover-letter-playbook.md. Runs on every keystroke, so it is plain
 * string work with no API calls. The phrase lists come from the backend
 * (/cover-letter-options/) so the prompt and the check never drift apart.
 */

export type CheckStatus = "good" | "warn" | "bad" | "info";

export interface CheckItem {
  id: string;
  status: CheckStatus;
  label: string;
  detail?: string;
}

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function isGreeting(p: string) {
  return countWords(p) <= 8 && /,\s*$/.test(p.trim());
}

function isSignOff(p: string) {
  const firstLine = p.trim().split("\n")[0];
  return countWords(p) <= 6 && (p.includes("\n") || /,\s*$/.test(firstLine) || countWords(p) <= 3);
}

/** Body paragraphs only: drops the greeting and up to two sign-off lines. */
export function letterBody(paragraphs: string[]): string[] {
  const nonEmpty = paragraphs.filter((p) => p.trim());
  let start = 0;
  let end = nonEmpty.length;
  if (end > 0 && isGreeting(nonEmpty[0])) start = 1;
  for (let i = 0; i < 2 && end - 1 > start && isSignOff(nonEmpty[end - 1]); i++) end--;
  return nonEmpty.slice(start, end);
}

export function bodyWordCount(paragraphs: string[]): number {
  return letterBody(paragraphs).reduce((n, p) => n + countWords(p), 0);
}

function quoteList(items: string[], max = 3) {
  const shown = items.slice(0, max).map((s) => `“${s}”`);
  return items.length > max ? `${shown.join(", ")} and ${items.length - max} more` : shown.join(", ");
}

export function checkLetter(
  paragraphs: string[],
  draft: CoverLetterDraft,
  company: string,
  options: CoverLetterOptions,
  hasUnsavedEdits: boolean
): CheckItem[] {
  const body = letterBody(paragraphs);
  const bodyText = body.join("\n\n");
  const lower = bodyText.toLowerCase();
  const items: CheckItem[] = [];

  // Length: hiring managers prefer half a page to a page.
  const words = bodyWordCount(paragraphs);
  const target = options.lengths.find((l) => l.key === draft.length);
  if (target) {
    const range = `${target.min_words}–${target.max_words}`;
    const inRange = words >= target.min_words && words <= target.max_words;
    // A little slack: a few words either side is not worth a warning.
    const close = words >= target.min_words * 0.9 && words <= target.max_words * 1.1;
    items.push({
      id: "length",
      status: inRange || close ? "good" : "warn",
      label: `${words} words`,
      detail: inRange || close
        ? `Within the ${range} target for ${target.name.toLowerCase()}.`
        : words > target.max_words
          ? `Over the ${range} target. Most hiring managers want half a page to a page.`
          : `Under the ${range} target for ${target.name.toLowerCase()}.`,
    });
  }

  // Opening line.
  const opener = (body[0] ?? "").trim().toLowerCase();
  const stock = options.stock_openers.find((s) => opener.startsWith(s));
  items.push(
    stock
      ? {
          id: "opener",
          status: "warn",
          label: "Opens with a stock line",
          detail: "Lead with a result, a connection, or something specific about the role instead.",
        }
      : { id: "opener", status: "good", label: "Skips the stock opener" }
  );

  // Tailoring: does it name the company?
  const companyTokens = [company, company.split(/\s+/)[0]]
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3);
  const namesCompany = companyTokens.some((t) => lower.includes(t));
  items.push(
    namesCompany
      ? { id: "company", status: "good", label: `Names ${company}` }
      : {
          id: "company",
          status: "warn",
          label: `Doesn’t mention ${company}`,
          detail: "A letter that could go to any company reads as generic.",
        }
  );

  // Evidence: numbers that aren't years.
  const metrics = (bodyText.match(/[$£€]?\d[\d,.]*\s*(%|percent|x\b|k\b|m\b|million|billion)?/gi) ?? [])
    .map((m) => m.trim())
    .filter((m) => !/^(19|20)\d{2}$/.test(m));
  items.push(
    metrics.length > 0
      ? {
          id: "evidence",
          status: "good",
          label: `Backs claims with ${metrics.length} number${metrics.length === 1 ? "" : "s"}`,
        }
      : {
          id: "evidence",
          status: "warn",
          label: "No numbers yet",
          detail: "If you have a result you can quantify, one number does a lot of work.",
        }
  );

  // Stock and AI-sounding phrases.
  const cliches = options.cliches.filter((c) => lower.includes(c));
  items.push(
    cliches.length
      ? {
          id: "cliches",
          status: "warn",
          label: `${cliches.length} stock phrase${cliches.length === 1 ? "" : "s"}`,
          detail: `${quoteList(cliches)}. Say the specific thing instead.`,
        }
      : { id: "cliches", status: "good", label: "No stock phrases" }
  );

  // Sentence variety.
  const sentences = bodyText.split(/(?<=[.!?])\s+/).filter((s) => countWords(s) > 2);
  const iStarts = sentences.filter((s) => /^I(\b|’|')/.test(s.trim())).length;
  if (sentences.length >= 5 && iStarts / sentences.length > 0.4) {
    items.push({
      id: "variety",
      status: "warn",
      label: `${iStarts} of ${sentences.length} sentences start with “I”`,
      detail: "Vary the openings; start some with the work or the result.",
    });
  }

  // Long paragraphs.
  const longIdx = body.findIndex((p) => countWords(p) > 120);
  if (longIdx >= 0) {
    items.push({
      id: "paragraphs",
      status: "warn",
      label: `Paragraph ${longIdx + 2} runs ${countWords(body[longIdx])} words`,
      detail: "Short paragraphs with one idea each are easier to skim.",
    });
  }

  // Punctuation tells.
  const all = paragraphs.join("\n");
  const exclamations = (all.match(/!/g) ?? []).length;
  if (/[—–]/.test(all) || exclamations > 1) {
    items.push({
      id: "punctuation",
      status: "warn",
      label: exclamations > 1 ? `${exclamations} exclamation marks` : "Uses em dashes",
      detail:
        exclamations > 1
          ? "One at most. Let the specifics carry the energy."
          : "Many readers now take them as a sign of AI-written text.",
    });
  }

  // Unfilled placeholders: a hard stop before sending.
  const placeholders = all.match(/\[[^\]\n]{2,40}\]/g) ?? [];
  if (placeholders.length) {
    items.push({
      id: "placeholders",
      status: "bad",
      label: `Fill in ${quoteList([...new Set(placeholders)], 2)}`,
      detail: "Placeholders are still in the letter.",
    });
  }

  // The candidate's own revision: what keeps an AI draft from reading generic.
  items.push(
    draft.edited || hasUnsavedEdits
      ? { id: "personal", status: "good", label: "Revised in your own words" }
      : {
          id: "personal",
          status: "info",
          label: "Not edited by you yet",
          detail: "Read it aloud and change anything you wouldn’t say. Revised letters land better.",
        }
  );

  return items;
}
