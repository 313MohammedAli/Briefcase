export type EntryType = "job" | "project" | "certification" | "education";

export interface ExperienceBullet {
  id?: string;
  text: string;
  order?: number;
}

export interface ExperienceEntry {
  id: string;
  type: EntryType;
  title: string;
  organization: string;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  completed: boolean | null;
  bullets: ExperienceBullet[];
  created_at: string;
  updated_at: string;
}

export type ExperienceEntryInput = Omit<
  ExperienceEntry,
  "id" | "created_at" | "updated_at" | "bullets" | "completed"
> & { completed?: boolean | null; bullets: { text: string; order: number }[] };

export interface Profile {
  name: string;
  email: string;
  personal_statement: string;
  resume_filename: string;
  resume_uploaded_at: string | null;
}

/** Free-text notes the candidate gives the builder (all optional). */
export interface CoverLetterInputs {
  recipient: string;
  why_company: string;
  highlight: string;
  referral: string;
  context: string;
  instructions: string;
}

export interface CoverLetterSettings {
  template: string;
  tone: string;
  length: string;
  focus: string[];
  inputs: CoverLetterInputs;
  mirror_keywords: boolean;
}

export interface CoverLetterDraft extends CoverLetterSettings {
  id: string;
  /** Set for drafts carried over from the old fixed variants. */
  label: string;
  paragraphs: string[];
  /** Requirement -> evidence pairs the draft argues. Empty for old drafts. */
  coverage: { requirement: string; evidence: string }[];
  /** True once the candidate has saved their own edits. */
  edited: boolean;
  created_at: string;
}

/** Served by /cover-letter-options/; the backend is the source of truth. */
export interface CoverLetterOptions {
  templates: {
    key: string;
    name: string;
    tagline: string;
    best_for: string;
    beats: string[];
    lengths: string[];
    requires: (keyof CoverLetterInputs)[];
  }[];
  tones: { key: string; name: string; description: string }[];
  lengths: { key: string; name: string; min_words: number; max_words: number }[];
  focuses: { key: string; name: string }[];
  rewrite_modes: { key: string; name: string }[];
  cliches: string[];
  stock_openers: string[];
  limits: {
    max_focus: number;
    max_drafts: number;
    inputs: Record<keyof CoverLetterInputs, number>;
    custom_rewrite: number;
  };
  defaults: CoverLetterSettings;
}

export type ApplicationStatus = "applied" | "interview" | "rejected" | "offer";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "applied",
  "interview",
  "rejected",
  "offer",
];

export interface TailoredResumeEntry {
  title: string;
  organization: string;
  dates: string;
  bullets: string[];
}

export interface TailoredResume {
  summary?: string;
  entries?: TailoredResumeEntry[];
}

export interface JobApplication {
  id: string;
  job_title: string;
  company: string;
  job_description: string;
  cover_letter_drafts: CoverLetterDraft[];
  selected_draft: string;
  recommended_template: string;
  tailored_resume: TailoredResume;
  match_score: number | null;
  keyword_gap_analysis: { matched?: string[]; missing?: string[] };
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
