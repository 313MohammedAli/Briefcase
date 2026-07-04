"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import {
  COVER_LETTER_VARIANTS,
  type CoverLetterVariant,
  type JobApplication,
} from "@/lib/types";

const VARIANT_LABELS: Record<CoverLetterVariant, string> = {
  concise: "Concise",
  detailed: "Detailed",
  enthusiastic: "Enthusiastic",
};

export default function CoverLetterPanel({
  application,
  onChange,
  onError,
}: {
  application: JobApplication;
  onChange: (app: JobApplication) => void;
  onError: (message: string) => void;
}) {
  const { request, download } = useApi();
  const [variant, setVariant] = useState<CoverLetterVariant>(
    application.selected_variant || "concise"
  );
  // Local paragraph edits; null = mirror server state
  const [draft, setDraft] = useState<string[] | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const serverParagraphs = application.generated_cover_letters[variant] ?? [];
  const paragraphs = draft ?? serverParagraphs;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(serverParagraphs);

  const switchVariant = async (v: CoverLetterVariant) => {
    setVariant(v);
    setDraft(null);
    try {
      const updated = await request<JobApplication>(
        `/job-applications/${application.id}/cover-letter/`,
        { method: "PATCH", body: JSON.stringify({ selected_variant: v }) }
      );
      onChange(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to select variant");
    }
  };

  const saveEdits = async () => {
    if (draft === null) return;
    setSaving(true);
    try {
      const updated = await request<JobApplication>(
        `/job-applications/${application.id}/cover-letter/`,
        { method: "PATCH", body: JSON.stringify({ variant, paragraphs: draft }) }
      );
      onChange(updated);
      setDraft(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save edits");
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async (index: number) => {
    if (dirty) {
      onError("Save or discard your edits before regenerating a paragraph.");
      return;
    }
    setRegenerating(index);
    try {
      const result = await request<{ paragraph: string }>(
        `/job-applications/${application.id}/regenerate-paragraph/`,
        { method: "POST", body: JSON.stringify({ variant, index }) }
      );
      const next = [...serverParagraphs];
      next[index] = result.paragraph;
      onChange({
        ...application,
        generated_cover_letters: {
          ...application.generated_cover_letters,
          [variant]: next,
        },
      });
      setDraft(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to regenerate paragraph");
    } finally {
      setRegenerating(null);
    }
  };

  const exportFile = async (format: "pdf" | "docx") => {
    setExporting(true);
    try {
      await download(
        `/job-applications/${application.id}/export/?document=cover_letter&file_format=${format}&variant=${variant}`,
        `cover-letter-${application.company.toLowerCase().replace(/\s+/g, "-")}.${format}`
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="rounded-xl border border-leather-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-medium">Cover letter</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void exportFile("pdf")}
            disabled={exporting || paragraphs.length === 0}
            className="rounded-md border border-leather-200 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Export PDF
          </button>
          <button
            onClick={() => void exportFile("docx")}
            disabled={exporting || paragraphs.length === 0}
            className="rounded-md border border-leather-200 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Export DOCX
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 rounded-lg bg-leather-100 p-1 w-fit">
        {COVER_LETTER_VARIANTS.map((v) => (
          <button
            key={v}
            onClick={() => void switchVariant(v)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              v === variant
                ? "bg-white shadow-sm font-medium"
                : "text-leather-600"
            }`}
          >
            {VARIANT_LABELS[v]}
          </button>
        ))}
      </div>

      {paragraphs.length === 0 ? (
        <p className="text-sm text-leather-500">No letter generated for this variant yet.</p>
      ) : (
        <div className="space-y-3">
          {paragraphs.map((paragraph, i) => (
            <div key={i} className="group relative">
              <textarea
                value={paragraph}
                onChange={(e) => {
                  const next = [...paragraphs];
                  next[i] = e.target.value;
                  setDraft(next);
                }}
                rows={Math.max(2, Math.ceil(paragraph.length / 90))}
                className="w-full rounded-md border border-transparent hover:border-leather-100 focus:border-leather-300 bg-transparent px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none"
              />
              <button
                onClick={() => void regenerate(i)}
                disabled={regenerating !== null}
                title="Regenerate this paragraph"
                className="absolute -right-1 top-1 opacity-0 group-hover:opacity-100 rounded-md border border-leather-200 bg-white px-2 py-1 text-xs disabled:opacity-50 transition-opacity"
              >
                {regenerating === i ? "…" : "↻ Regenerate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => void saveEdits()}
            disabled={saving}
            className="rounded-lg bg-leather-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save edits"}
          </button>
          <button
            onClick={() => setDraft(null)}
            className="rounded-lg border border-leather-200 px-4 py-2 text-sm"
          >
            Discard
          </button>
        </div>
      )}
    </section>
  );
}
