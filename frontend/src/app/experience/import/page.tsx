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

const inputClass =
  "w-full rounded-md border border-leather-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-400";

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
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/experience" className="text-sm text-leather-500 hover:underline">
        ← Experience bank
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-3 mb-1">Import your resume</h1>
      <p className="text-sm text-leather-600 mb-6">
        Upload a PDF, DOCX, or TXT resume. Briefcase extracts your experience so you can review,
        edit, and add it to your bank — nothing is saved until you confirm.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</p>
      )}

      {drafts === null && (
        <div className="rounded-3xl border-2 border-dashed border-leather-200 p-12 text-center">
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
              <p className="text-sm font-medium animate-pulse">Reading {fileName}…</p>
              <p className="text-xs text-leather-500 mt-1">
                Extracting your experience. This takes a few seconds.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-leather-600 mb-4">
                Drag a file here or choose one from your computer
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="rounded-xl bg-leather-700 text-white px-5 py-2.5 text-sm font-medium hover:bg-leather-800 transition-colors"
              >
                Choose resume file
              </button>
              <p className="text-xs text-leather-400 mt-3">PDF, DOCX, or TXT — 5 MB max</p>
            </div>
          )}
        </div>
      )}

      {drafts !== null && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-leather-600">
              Extracted {drafts.length} {drafts.length === 1 ? "entry" : "entries"} from{" "}
              <span className="font-medium">{fileName}</span>. Uncheck anything you don&apos;t
              want, edit freely, then confirm.
            </p>
            <button
              onClick={() => {
                setDrafts(null);
                setFileName(null);
              }}
              className="text-xs text-leather-500 hover:underline shrink-0 ml-4"
            >
              Start over
            </button>
          </div>

          <ul className="space-y-4">
            {drafts.map((draft, i) => (
              <li
                key={i}
                className={`rounded-xl border p-5 transition-opacity ${
                  draft.include ? "border-leather-200" : "border-leather-100 opacity-50"
                }`}
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
                    className="rounded-md border border-leather-200 bg-transparent px-2 py-1 text-xs"
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

                <div className="grid grid-cols-2 gap-3">
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
                        className={`${inputClass} min-h-[2.5rem]`}
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
                        className="text-leather-400 hover:text-red-600 text-sm px-1 shrink-0"
                        aria-label="Remove bullet"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateDraft(i, { bullets: [...draft.bullets, ""] })}
                    className="text-sm text-leather-500 hover:text-leather-900"
                  >
                    + Add bullet
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 mt-6 py-4 bg-white/95 backdrop-blur border-t border-leather-100 flex items-center gap-3">
            <button
              onClick={() => void submit()}
              disabled={submitting || included.length === 0}
              className="rounded-xl bg-leather-700 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50 hover:bg-leather-800 transition-colors"
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
