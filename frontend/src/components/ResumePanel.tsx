"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import type { JobApplication, TailoredResume } from "@/lib/types";

const inputClass =
  "w-full field-sizing-content rounded-md border border-transparent hover:border-leather-100 focus:border-leather-300 bg-transparent px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none";

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
    <section className="rounded-xl border border-leather-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-medium">Tailored resume</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void tailor()}
            disabled={tailoring}
            className="rounded-md bg-leather-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {tailoring ? "Tailoring…" : hasResume ? "Re-tailor" : "Tailor resume"}
          </button>
          <button
            onClick={() => void exportFile("pdf")}
            disabled={exporting || !hasResume}
            className="rounded-md border border-leather-200 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Export PDF
          </button>
          <button
            onClick={() => void exportFile("docx")}
            disabled={exporting || !hasResume}
            className="rounded-md border border-leather-200 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            Export DOCX
          </button>
        </div>
      </div>

      {!hasResume ? (
        <p className="text-sm text-leather-500">
          {tailoring
            ? "Reordering and reweighting your experience for this job…"
            : "No tailored resume yet. Briefcase will reorder and reweight your experience bullets for this job description."}
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-leather-500 mb-1 px-3">Summary</h3>
            <textarea
              value={resume.summary ?? ""}
              rows={3}
              onChange={(e) => setDraft({ ...resume, summary: e.target.value })}
              className={inputClass}
            />
          </div>
          {(resume.entries ?? []).map((entry, i) => (
            <div key={i} className="border-t border-leather-100 pt-3">
              <div className="px-3">
                <p className="text-sm font-medium">
                  {entry.title}
                  {entry.organization && (
                    <span className="text-leather-500"> — {entry.organization}</span>
                  )}
                </p>
                {entry.dates && <p className="text-xs text-leather-500">{entry.dates}</p>}
              </div>
              <div className="mt-1 space-y-1">
                {entry.bullets.map((bullet, j) => (
                  <div key={j} className="flex items-start gap-1">
                    <span className="text-leather-400 pt-2 pl-3 text-sm">•</span>
                    <textarea
                      value={bullet}
                      rows={Math.max(1, Math.ceil(bullet.length / 90))}
                      onChange={(e) => {
                        const bullets = [...entry.bullets];
                        bullets[j] = e.target.value;
                        updateEntry(i, { bullets });
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => void save()}
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
