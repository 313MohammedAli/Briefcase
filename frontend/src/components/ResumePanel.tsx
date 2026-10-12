"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import type { JobApplication, TailoredResume } from "@/lib/types";

export default function ResumePanel({
  application,
  onChange,
  onError,
}: {
  application: JobApplication;
  onChange: (app: JobApplication) => void;
  onError: (message: string) => void;
}) {
  const { request, download } = useApi();
  const [draft, setDraft] = useState<TailoredResume | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const resume = draft ?? application.tailored_resume;
  const hasResume = !!(resume?.summary || resume?.entries?.length);
  const dirty =
    draft !== null && JSON.stringify(draft) !== JSON.stringify(application.tailored_resume);

  const tailor = async () => {
    setTailoring(true);
    try {
      const updated = await request<JobApplication>(
        `/job-applications/${application.id}/tailor-resume/`,
        { method: "POST" }
      );
      onChange(updated);
      setDraft(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to tailor resume");
    } finally {
      setTailoring(false);
    }
  };

  const save = async () => {
    if (draft === null) return;
    setSaving(true);
    try {
      const updated = await request<JobApplication>(
        `/job-applications/${application.id}/resume/`,
        { method: "PATCH", body: JSON.stringify({ tailored_resume: draft }) }
      );
      onChange(updated);
      setDraft(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  const exportFile = async (format: "pdf" | "docx") => {
    setExporting(true);
    try {
      await download(
        `/job-applications/${application.id}/export/?document=resume&file_format=${format}`,
        `resume-${application.company.toLowerCase().replace(/\s+/g, "-")}.${format}`
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const updateEntry = (i: number, patch: Partial<NonNullable<TailoredResume["entries"]>[number]>) => {
    const entries = [...(resume.entries ?? [])];
    entries[i] = { ...entries[i], ...patch };
    setDraft({ ...resume, entries });
  };

  return (
    <section className="card">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-leather-100">
        <h2 className="font-medium text-leather-900">Tailored resume</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => void tailor()} disabled={tailoring} className="btn btn-primary btn-sm">
            {tailoring ? "Tailoring…" : hasResume ? "Re-tailor" : "Tailor resume"}
          </button>
          <button
            onClick={() => void exportFile("pdf")}
            disabled={exporting || !hasResume}
            className="btn btn-secondary btn-sm"
          >
            Export PDF
          </button>
          <button
            onClick={() => void exportFile("docx")}
            disabled={exporting || !hasResume}
            className="btn btn-secondary btn-sm"
          >
            Export DOCX
          </button>
        </div>
      </header>

      {!hasResume ? (
        <p className="px-6 py-8 text-sm text-leather-500">
          {tailoring
            ? "Reordering and reweighting your experience for this job…"
            : "No tailored resume yet. Briefcase will reorder and reweight your experience bullets for this job description."}
        </p>
      ) : (
        <div className="sheet px-6 sm:px-10 py-8 max-w-[68ch] space-y-7">
          <div>
            <h3 className="eyebrow font-sans mb-2">Summary</h3>
            <textarea
              value={resume.summary ?? ""}
              rows={3}
              onChange={(e) => setDraft({ ...resume, summary: e.target.value })}
              aria-label="Summary"
              className="sheet-field field-sizing-content"
            />
          </div>
          {(resume.entries ?? []).map((entry, i) => (
            <div key={i}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-semibold text-leather-900">
                  {entry.title}
                  {entry.organization && (
                    <span className="font-normal text-leather-600"> · {entry.organization}</span>
                  )}
                </p>
                {entry.dates && (
                  <p className="font-sans text-xs text-leather-500 tabular-nums">{entry.dates}</p>
                )}
              </div>
              <ul className="mt-2 space-y-0.5">
                {entry.bullets.map((bullet, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span aria-hidden className="text-leather-400 pt-1.5 select-none">•</span>
                    <textarea
                      value={bullet}
                      rows={Math.max(1, Math.ceil(bullet.length / 90))}
                      onChange={(e) => {
                        const bullets = [...entry.bullets];
                        bullets[j] = e.target.value;
                        updateEntry(i, { bullets });
                      }}
                      aria-label={`${entry.title} bullet ${j + 1}`}
                      className="sheet-field field-sizing-content"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <div className="flex items-center gap-2 px-6 py-4 border-t border-leather-100 bg-leather-50 rounded-b-[12px]">
          <button onClick={() => void save()} disabled={saving} className="btn btn-primary btn-sm">
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
