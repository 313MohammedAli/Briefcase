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
    <section className="card">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-leather-100">
        <div className="flex items-center gap-4">
          <h2 className="font-medium text-leather-900">Cover letter</h2>
          <div className="seg" role="group" aria-label="Cover letter variant">
            {COVER_LETTER_VARIANTS.map((v) => (
              <button
                key={v}
                onClick={() => void switchVariant(v)}
                aria-pressed={v === variant}
                className="seg-item"
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void exportFile("pdf")}
            disabled={exporting || paragraphs.length === 0}
            className="btn btn-secondary btn-sm"
          >
            Export PDF
          </button>
          <button
            onClick={() => void exportFile("docx")}
            disabled={exporting || paragraphs.length === 0}
            className="btn btn-secondary btn-sm"
          >
            Export DOCX
          </button>
        </div>
      </header>

      {paragraphs.length === 0 ? (
        <p className="px-6 py-8 text-sm text-leather-500">No letter generated for this variant yet.</p>
      ) : (
        /* The letter reads as a page: serif, a comfortable measure, no inner
           scroll. Each paragraph is still editable in place. */
        <div className="sheet px-6 sm:px-10 py-8 max-w-[68ch] space-y-1">
          {paragraphs.map((paragraph, i) => (
            <div key={i} className="group relative">
              <textarea
                value={paragraph}
                onChange={(e) => {
                  const next = [...paragraphs];
                  next[i] = e.target.value;
                  setDraft(next);
                }}
                rows={Math.max(2, Math.ceil(paragraph.length / 80))}
                aria-label={`Paragraph ${i + 1}`}
                className="sheet-field field-sizing-content"
              />
              <button
                onClick={() => void regenerate(i)}
                disabled={regenerating !== null}
                title="Regenerate this paragraph"
                className="btn btn-secondary btn-sm absolute -right-2 top-1 font-sans opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
              >
                {regenerating === i ? "…" : "↻ Regenerate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <div className="flex items-center gap-2 px-6 py-4 border-t border-leather-100 bg-leather-50 rounded-b-[12px]">
          <button onClick={() => void saveEdits()} disabled={saving} className="btn btn-primary btn-sm">
            {saving ? "Saving…" : "Save edits"}
          </button>
          <button onClick={() => setDraft(null)} className="btn btn-ghost btn-sm">
            Discard
          </button>
          <span className="ml-auto text-xs text-leather-500">Unsaved changes</span>
        </div>
      )}
    </section>
  );
}
