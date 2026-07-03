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
  bullets: ExperienceBullet[];
  created_at: string;
  updated_at: string;
}

export type ExperienceEntryInput = Omit<
  ExperienceEntry,
  "id" | "created_at" | "updated_at" | "bullets"
> & { bullets: { text: string; order: number }[] };

export type CoverLetterVariant = "concise" | "detailed" | "enthusiastic";

export const COVER_LETTER_VARIANTS: CoverLetterVariant[] = [
  "concise",
  "detailed",
  "enthusiastic",
];

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
  generated_cover_letters: Partial<Record<CoverLetterVariant, string[]>>;
  selected_variant: CoverLetterVariant | "";
  tailored_resume: TailoredResume;
  match_score: number | null;
  keyword_gap_analysis: { matched?: string[]; missing?: string[] };
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
