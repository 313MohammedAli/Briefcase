"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useApi } from "@/lib/api";
import type { EntryType, ExperienceEntryInput } from "@/lib/types";

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: "job", label: "Job" },
  { value: "project", label: "Project" },
  { value: "certification", label: "Certification" },
  { value: "education", label: "Education" },
];

const inputClass = "input";

interface ExtractedEntry {
  type: EntryType;
  title: string;
  organization: string;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  bullets: string[];
}

interface DraftEntry extends ExtractedEntry {
  include: boolean;
}

export default function ImportResumePage() {
  const { request, upload } = useApi();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drafts, setDrafts] = useState<DraftEntry[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setFileName(file.name);
    try {
      const result = await upload<{ entries: ExtractedEntry[] }>(
        "/experience-entries/import-resume/",
        file
      );
      if (result.entries.length === 0) {
        setError("No experience could be extracted from this file.");
        setDrafts(null);
      } else {
        setDrafts(result.entries.map((entry) => ({ ...entry, include: true })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process the resume");
      setDrafts(null);
    } finally {
      setUploading(false);
    }
  };

  const updateDraft = (i: number, patch: Partial<DraftEntry>) => {
    setDrafts((d) => d?.map((entry, j) => (j === i ? { ...entry, ...patch } : entry)) ?? null);
  };

  const included = drafts?.filter((d) => d.include) ?? [];

  const submit = async () => {
    if (included.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const entries: ExperienceEntryInput[] = included.map((d) => ({
        type: d.type,
        title: d.title.trim(),
        organization: d.organization.trim(),
        start_date: d.start_date || null,
        end_date: d.end_date || null,
        tags: d.tags.map((t) => t.trim()).filter(Boolean),
        bullets: d.bullets
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text, order) => ({ text, order })),
      }));
      await request("/experience-entries/bulk-create/", {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
      router.push("/experience");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add entries");
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl 2xl:max-w-6xl px-6 py-10">
      <Link href="/experience" className="text-sm text-leather-500 hover:text-leather-800">
        ← Experience bank
      </Link>
      <h1 className="font-serif text-[34px] leading-tight tracking-tight text-leather-900 mt-3">
        Import your resume
      </h1>
      <p className="text-[15px] text-leather-600 mt-1.5 mb-8 max-w-prose">
        Upload a PDF, DOCX, or TXT resume. Briefcase extracts your experience so you can review,
        edit, and add it to your bank. Nothing is saved until you confirm.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-bg text-bad-fg px-3 py-2 text-sm">{error}</p>
      )}

      {drafts === null && (
        <div className="rounded-xl border-2 border-dashed border-leather-200 bg-white/60 p-14 text-center">
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {uploading ? (
            <div>
              <p className="font-serif text-xl text-leather-900 animate-pulse">Reading {fileName}…</p>
              <p className="text-sm text-leather-600 mt-1.5">
                Extracting your experience. This takes a few seconds.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-serif text-xl text-leather-900 mb-1.5">Unpack an existing resume</p>
              <p className="text-sm text-leather-600 mb-5">
                Choose a file from your computer
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="btn btn-primary"
              >
                Choose resume file
              </button>
              <p className="text-xs text-leather-500 mt-3">PDF, DOCX, or TXT, up to 5 MB</p>
            </div>
          )}
        </div>
      )}

      {drafts !== null && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] text-leather-700">
              Extracted {drafts.length} {drafts.length === 1 ? "entry" : "entries"} from{" "}
              <span className="font-medium">{fileName}</span>. Uncheck anything you don&apos;t
              want, edit freely, then confirm.
            </p>
            <button
              onClick={() => {
                setDrafts(null);
                setFileName(null);
              }}
              className="btn btn-ghost btn-sm shrink-0 ml-4"
            >
              Start over
            </button>
          </div>

          <ul className="space-y-4">
            {drafts.map((draft, i) => (
              <li
                key={i}
                className={`card p-6 transition-opacity duration-150 ${draft.include ? "" : "opacity-50"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.include}
                      onChange={(e) => updateDraft(i, { include: e.target.checked })}
                      className="accent-leather-700 w-4 h-4"
                    />
                    Include this entry
                  </label>
                  <select
                    className="input w-auto py-1.5 text-[13px]"
                    value={draft.type}
                    onChange={(e) => updateDraft(i, { type: e.target.value as EntryType })}
                  >
                    {ENTRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    className={inputClass}
                    value={draft.title}
                    onChange={(e) => updateDraft(i, { title: e.target.value })}
                    placeholder="Title"
                  />
                  <input
                    className={inputClass}
                    value={draft.organization}
                    onChange={(e) => updateDraft(i, { organization: e.target.value })}
                    placeholder="Organization"
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.start_date ?? ""}
                    onChange={(e) => updateDraft(i, { start_date: e.target.value || null })}
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.end_date ?? ""}
                    onChange={(e) => updateDraft(i, { end_date: e.target.value || null })}
                  />
                </div>

                <input
                  className={`${inputClass} mt-3`}
                  value={draft.tags.join(", ")}
                  onChange={(e) =>
                    updateDraft(i, { tags: e.target.value.split(",").map((t) => t.trim()) })
                  }
                  placeholder="Tags (comma-separated)"
                />

                <div className="mt-3 space-y-2">
                  {draft.bullets.map((bullet, j) => (
                    <div key={j} className="flex gap-2">
                      <textarea
                        className={`${inputClass} min-h-[2.5rem] field-sizing-content`}
                        rows={2}
                        value={bullet}
                        onChange={(e) => {
                          const bullets = [...draft.bullets];
                          bullets[j] = e.target.value;
                          updateDraft(i, { bullets });
                        }}
                      />
                      <button
                        onClick={() =>
                          updateDraft(i, { bullets: draft.bullets.filter((_, k) => k !== j) })
                        }
                        className="btn btn-ghost btn-sm shrink-0 self-start"
                        aria-label="Remove bullet"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateDraft(i, { bullets: [...draft.bullets, ""] })}
                    className="btn btn-ghost btn-sm -ml-2"
                  >
                    + Add bullet
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 mt-6 py-4 bg-leather-50/95 backdrop-blur border-t border-leather-200 flex items-center gap-3">
            <button
              onClick={() => void submit()}
              disabled={submitting || included.length === 0}
              className="btn btn-primary"
            >
              {submitting
                ? "Adding…"
                : `Add ${included.length} ${included.length === 1 ? "entry" : "entries"} to bank`}
            </button>
            <span className="text-xs text-leather-500">
              Bullets are embedded on save and immediately usable for generation.
            </span>
          </div>
        </>
      )}
    </main>
  );
}
