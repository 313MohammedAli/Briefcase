"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/lib/api";
import { checkLetter } from "@/lib/letterCheck";
import { useCoverLetterOptions } from "@/lib/useCoverLetterOptions";
import type {
  CoverLetterDraft,
  CoverLetterOptions,
  CoverLetterSettings,
  JobApplication,
} from "@/lib/types";
import LetterBuilder from "./LetterBuilder";
import LetterCheck from "./LetterCheck";
import ParagraphEditor from "./ParagraphEditor";

function settingsOf(d: CoverLetterDraft): CoverLetterSettings {
  return {
    template: d.template,
    tone: d.tone,
    length: d.length,
    focus: [...(d.focus ?? [])],
    inputs: { ...d.inputs },
    mirror_keywords: d.mirror_keywords,
  };
}

const NO_PARAGRAPHS: string[] = [];

const nameOf = (list: { key: string; name: string }[], key: string) =>
  list.find((x) => x.key === key)?.name ?? key;

/** Tab text per draft: template name, plus tone (numbered if repeated). */
function tabLabels(drafts: CoverLetterDraft[], options: CoverLetterOptions) {
  const seen = new Map<string, number>();
  return new Map(
    drafts.map((d) => {
      const primary = d.label || nameOf(options.templates, d.template);
      let secondary = d.label ? "" : nameOf(options.tones, d.tone);
      const key = `${primary}|${secondary}`;
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if (n > 1) secondary = secondary ? `${secondary} ${n}` : String(n);
      return [d.id, { primary, secondary }];
    })
  );
}

export default function CoverLetterPanel({
  application,
  onChange,
}: {
  application: JobApplication;
  onChange: (app: JobApplication) => void;
}) {
  const { request, download } = useApi();
  const { options, error: optionsError } = useCoverLetterOptions();

  const drafts = application.cover_letter_drafts ?? [];
  const draft = drafts.find((d) => d.id === application.selected_draft) ?? drafts.at(-1) ?? null;

  // Unsaved paragraph edits, tied to the draft they were made on.
  const [edits, setEdits] = useState<{ id: string; paragraphs: string[] } | null>(null);
  const [builder, setBuilder] = useState<{ seed: CoverLetterSettings; focusInputs: boolean } | null>(null);
  const [writing, setWriting] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Shown inside the card: the builder can sit far below the page's own banner.
  const [error, setError] = useState<string | null>(null);
  const onError = setError;

  const editsHere = edits && draft && edits.id === draft.id ? edits.paragraphs : null;
  const paragraphs = editsHere ?? draft?.paragraphs ?? NO_PARAGRAPHS;
  const dirty = editsHere !== null && JSON.stringify(editsHere) !== JSON.stringify(draft?.paragraphs);

  const checks = useMemo(
    () => (options && draft ? checkLetter(paragraphs, draft, application.company, options, dirty) : []),
    [options, draft, paragraphs, application.company, dirty]
  );

  const api = `/job-applications/${application.id}`;
  const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

  /** Persists pending edits. Returns the latest application, or null on failure. */
  const saveEdits = async (): Promise<JobApplication | null> => {
    if (!dirty || !draft || !editsHere) return application;
    setSaving(true);
    try {
      const updated = await request<JobApplication>(`${api}/drafts/${draft.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ paragraphs: editsHere }),
      });
      onChange(updated);
      setEdits(null);
      return updated;
    } catch (e) {
      onError(message(e, "Failed to save edits"));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const select = async (id: string) => {
    setError(null);
    setConfirmDelete(false);
    if (id === draft?.id) {
      setBuilder(null);
      return;
    }
    const base = await saveEdits(); // switching never loses typing
    if (!base) return;
    setBuilder(null);
    onChange({ ...base, selected_draft: id });
    try {
      await request(`${api}/cover-letter/`, {
        method: "PATCH",
        body: JSON.stringify({ selected_draft: id }),
      });
    } catch (e) {
      onError(message(e, "Failed to select draft"));
    }
  };

  const openBuilder = async (focusInputs = false) => {
    setError(null);
    if (!options) return;
    if (!(await saveEdits())) return;
    setConfirmDelete(false);
    // New drafts start from the current one: same notes, easy to vary one thing.
    const seed = draft
      ? settingsOf(draft)
      : {
          ...options.defaults,
          template: application.recommended_template || options.defaults.template,
          inputs: { ...options.defaults.inputs },
        };
    setBuilder({ seed, focusInputs });
  };

  const createDraft = async (settings: CoverLetterSettings) => {
    setError(null);
    setBuilder(null);
    setWriting(options ? nameOf(options.templates, settings.template) : "new");
    try {
      const updated = await request<JobApplication>(`${api}/drafts/`, {
        method: "POST",
        body: JSON.stringify({ settings }),
      });
      onChange(updated);
      setEdits(null);
    } catch (e) {
      onError(message(e, "Failed to write the draft"));
      setBuilder({ seed: settings, focusInputs: false }); // keep what they typed
    } finally {
      setWriting(null);
    }
  };

  const rewrite = async (index: number, mode: string, instruction: string) => {
    setError(null);
    if (!draft) return;
    const base = await saveEdits();
    if (!base) return;
    setRewriting(index);
    try {
      const r = await request<{ draft_id: string; index: number; paragraph: string }>(
        `${api}/regenerate-paragraph/`,
        { method: "POST", body: JSON.stringify({ draft_id: draft.id, index, mode, instruction }) }
      );
      onChange({
        ...base,
        cover_letter_drafts: base.cover_letter_drafts.map((d) =>
          d.id === r.draft_id
            ? { ...d, paragraphs: d.paragraphs.map((p, i) => (i === r.index ? r.paragraph : p)) }
            : d
        ),
      });
    } catch (e) {
      onError(message(e, "Failed to rewrite the paragraph"));
    } finally {
      setRewriting(null);
    }
  };

  const deleteDraft = async () => {
    setError(null);
    if (!draft) return;
    try {
      const updated = await request<JobApplication>(`${api}/drafts/${draft.id}/`, { method: "DELETE" });
      onChange(updated);
      setEdits(null);
    } catch (e) {
      onError(message(e, "Failed to delete the draft"));
    } finally {
      setConfirmDelete(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(paragraphs.join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      onError("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const exportFile = async (format: "pdf" | "docx") => {
    if (!draft) return;
    setExporting(true);
    try {
      await download(
        `${api}/export/?document=cover_letter&file_format=${format}&draft=${draft.id}`,
        `cover-letter-${application.company.toLowerCase().replace(/\s+/g, "-")}.${format}`
      );
    } catch (e) {
      onError(message(e, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  if (!options) {
    return (
      <section className="card px-6 py-5">
        <h2 className="font-medium text-leather-900">Cover letter</h2>
        <p className="text-sm text-leather-500 mt-2">{optionsError ?? "Loading…"}</p>
      </section>
    );
  }

  const showBuilder = !writing && (builder !== null || drafts.length === 0);
  const labels = tabLabels(drafts, options);
  const atCap = drafts.length >= options.limits.max_drafts;
  const hasNotes = draft ? Object.values(draft.inputs ?? {}).some((v) => v.trim()) : false;
  const showNudge = draft && !draft.edited && !dirty && !hasNotes;
  const defaultSeed: CoverLetterSettings = {
    ...options.defaults,
    template: application.recommended_template || options.defaults.template,
    inputs: { ...options.defaults.inputs },
  };

  return (
    <section className="card">
      <header className="px-6 pt-4 border-b border-leather-100">
        <div className="flex flex-wrap items-center justify-between gap-3 min-h-[34px]">
          <h2 className="font-medium text-leather-900">Cover letter</h2>
          {draft && !showBuilder && !writing && (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void copyText()} disabled={paragraphs.length === 0} className="btn btn-secondary btn-sm">
                {copied ? "Copied" : "Copy text"}
              </button>
              <button onClick={() => void exportFile("pdf")} disabled={exporting || paragraphs.length === 0} className="btn btn-secondary btn-sm">
                PDF
              </button>
              <button onClick={() => void exportFile("docx")} disabled={exporting || paragraphs.length === 0} className="btn btn-secondary btn-sm">
                DOCX
              </button>
            </div>
          )}
        </div>

        {(drafts.length > 0 || writing) && (
          <div className="tabs -mx-6 px-6 mt-2" role="group" aria-label="Drafts">
            {drafts.map((d) => {
              const label = labels.get(d.id)!;
              return (
                <button
                  key={d.id}
                  onClick={() => void select(d.id)}
                  aria-pressed={d.id === draft?.id && !showBuilder && !writing}
                  disabled={!!writing || rewriting !== null}
                  className="tab"
                >
                  {label.primary}
                  {label.secondary && <span className="tab-meta">{label.secondary}</span>}
                </button>
              );
            })}
            {writing && (
              <span className="tab" aria-pressed="true">
                <span className="animate-pulse">Writing…</span>
              </span>
            )}
            <button
              onClick={() => void openBuilder()}
              aria-pressed={showBuilder && drafts.length > 0}
              disabled={!!writing || atCap || rewriting !== null}
              title={atCap ? `Up to ${options.limits.max_drafts} drafts. Delete one to make room.` : "Start a new draft from this one's settings"}
              className="tab"
            >
              + New draft
            </button>
          </div>
        )}
      </header>

      {error && (
        <div role="alert" className="mx-6 mt-4 flex items-start gap-3 rounded-lg bg-bad-bg px-3.5 py-2.5 text-sm text-bad-fg">
          <span className="min-w-0 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-xs underline underline-offset-2">
            Dismiss
          </button>
        </div>
      )}

      {writing ? (
        <div className="px-6 py-16 text-center">
          <p className="font-serif text-xl text-leather-900 animate-pulse">
            Writing a {writing.toLowerCase()} draft…
          </p>
          <p className="text-sm text-leather-600 mt-1.5">
            Pulling your most relevant experience. Usually about 10 seconds.
          </p>
        </div>
      ) : showBuilder ? (
        <LetterBuilder
          key={JSON.stringify(builder?.seed ?? defaultSeed)}
          options={options}
          initial={builder?.seed ?? defaultSeed}
          company={application.company}
          recommended={application.recommended_template}
          hasKeywords={(application.keyword_gap_analysis?.matched?.length ?? 0) > 0}
          isFirst={drafts.length === 0}
          focusInputs={builder?.focusInputs}
          onSubmit={(s) => void createDraft(s)}
          onCancel={() => setBuilder(null)}
        />
      ) : draft ? (
        <div key={draft.id} className="enter">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 pt-4 min-h-[44px] text-xs text-leather-500">
            <span className="min-w-0">
              {[
                nameOf(options.templates, draft.template),
                nameOf(options.tones, draft.tone),
                nameOf(options.lengths, draft.length),
                ...(draft.focus ?? []).map((f) => nameOf(options.focuses, f)),
              ].join(" · ")}
            </span>
            <span className="ml-auto flex items-center gap-1">
              {confirmDelete ? (
                <>
                  <span className="text-leather-700 mr-1">Delete this draft?</span>
                  <button onClick={() => void deleteDraft()} className="btn btn-danger-ghost btn-sm">
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost btn-sm">
                    Keep
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)} disabled={rewriting !== null} className="btn btn-ghost btn-sm">
                  Delete draft
                </button>
              )}
            </span>
          </div>

          {showNudge && (
            <div className="mx-6 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-lg bg-info-bg px-4 py-3 text-[13px] text-info-fg">
              <span className="min-w-0 flex-1 basis-64">
                This draft only knows your experience bank. Tell it why you want this job or a story to
                feature, and the next draft will sound like you.
              </span>
              <button onClick={() => void openBuilder(true)} className="btn btn-secondary btn-sm">
                Add your input
              </button>
            </div>
          )}

          {paragraphs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-leather-500">This draft is empty.</p>
          ) : (
            /* The letter reads as a page: serif, a comfortable measure, no inner
               scroll. Each paragraph is still editable in place. */
            <div className="sheet px-6 sm:px-10 py-7 max-w-[68ch] space-y-1">
              {paragraphs.map((paragraph, i) => (
                <ParagraphEditor
                  key={i}
                  index={i}
                  value={paragraph}
                  options={options}
                  rewriting={rewriting === i}
                  busy={rewriting !== null || saving}
                  onChange={(value) => {
                    const next = [...paragraphs];
                    next[i] = value;
                    setEdits({ id: draft.id, paragraphs: next });
                  }}
                  onRewrite={(mode, instruction) => void rewrite(i, mode, instruction)}
                />
              ))}
            </div>
          )}

          <LetterCheck items={checks} coverage={draft.coverage ?? []} />

          {dirty && (
            <div className="sticky bottom-0 flex items-center gap-2 px-6 py-4 border-t border-leather-100 bg-leather-50 rounded-b-[12px]">
              <button onClick={() => void saveEdits()} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? "Saving…" : "Save edits"}
              </button>
              <button onClick={() => setEdits(null)} className="btn btn-ghost btn-sm">
                Discard
              </button>
              <span className="ml-auto text-xs text-leather-500">Unsaved changes</span>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
