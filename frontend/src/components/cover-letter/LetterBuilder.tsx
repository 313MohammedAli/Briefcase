"use client";

import { useId, useState } from "react";
import type {
  CoverLetterInputs,
  CoverLetterOptions,
  CoverLetterSettings,
} from "@/lib/types";

const MORE_INPUTS: (keyof CoverLetterInputs)[] = ["referral", "context", "instructions"];

export default function LetterBuilder({
  options,
  initial,
  company,
  recommended,
  hasKeywords,
  isFirst,
  focusInputs,
  onSubmit,
  onCancel,
}: {
  options: CoverLetterOptions;
  initial: CoverLetterSettings;
  company: string;
  recommended: string;
  hasKeywords: boolean;
  /** No drafts yet: there is nothing to cancel back to. */
  isFirst: boolean;
  /** Opened from the "make it yours" nudge: start with the cursor in the notes. */
  focusInputs?: boolean;
  onSubmit: (settings: CoverLetterSettings) => void;
  onCancel: () => void;
}) {
  const [settings, setSettings] = useState<CoverLetterSettings>(initial);
  const [moreOpen, setMoreOpen] = useState(() =>
    MORE_INPUTS.some((k) => initial.inputs[k])
  );
  const ids = useId();

  const template = options.templates.find((t) => t.key === settings.template) ?? options.templates[0];
  const tone = options.tones.find((t) => t.key === settings.tone);
  const length = options.lengths.find((l) => l.key === settings.length);
  const missing = template.requires.filter((k) => !settings.inputs[k].trim());
  const showMore = moreOpen || template.requires.some((k) => MORE_INPUTS.includes(k));

  const set = (patch: Partial<CoverLetterSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const setInput = (key: keyof CoverLetterInputs, value: string) =>
    setSettings((s) => ({ ...s, inputs: { ...s.inputs, [key]: value } }));

  const pickTemplate = (key: string) => {
    const t = options.templates.find((x) => x.key === key);
    if (!t) return;
    // Fixed-length templates (Quick note) snap the length picker.
    set({ template: key, length: t.lengths.includes(settings.length) ? settings.length : t.lengths[0] });
  };

  const toggleFocus = (key: string) => {
    const on = settings.focus.includes(key);
    if (!on && settings.focus.length >= options.limits.max_focus) return;
    set({ focus: on ? settings.focus.filter((f) => f !== key) : [...settings.focus, key] });
  };

  const field = (
    key: keyof CoverLetterInputs,
    label: string,
    placeholder: string,
    { multiline = false, autoFocus = false }: { multiline?: boolean; autoFocus?: boolean } = {}
  ) => {
    const id = `${ids}-${key}`;
    const required = template.requires.includes(key);
    const value = settings.inputs[key];
    const limit = options.limits.inputs[key];
    return (
      <label htmlFor={id} className="block text-sm space-y-1.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-leather-700">
            {label}
            {required && <span className="ml-1.5 text-xs text-warn-fg">Needed for {template.name}</span>}
          </span>
          {value.length > limit * 0.8 && (
            <span className="text-xs tabular-nums text-leather-500">
              {value.length}/{limit}
            </span>
          )}
        </span>
        {multiline ? (
          <textarea
            id={id}
            className="input field-sizing-content min-h-[4.5rem] resize-none"
            value={value}
            maxLength={limit}
            autoFocus={autoFocus}
            onChange={(e) => setInput(key, e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            id={id}
            className="input"
            value={value}
            maxLength={limit}
            autoFocus={autoFocus}
            onChange={(e) => setInput(key, e.target.value)}
            placeholder={placeholder}
          />
        )}
      </label>
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (missing.length === 0) onSubmit(settings);
      }}
      className="enter"
    >
      <div className="px-6 py-6 space-y-9">
        {isFirst && (
          <div>
            <p className="font-serif text-xl text-leather-900">Write your first draft</p>
            <p className="text-sm text-leather-600 mt-1">
              Pick a structure and a voice. Your experience bank supplies the evidence.
            </p>
          </div>
        )}

        <fieldset>
          <legend className="eyebrow mb-1">Template</legend>
          <p className="text-[13px] text-leather-500 mb-3">The structure: what the letter says, in what order.</p>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label="Template">
            {options.templates.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={t.key === settings.template}
                onClick={() => pickTemplate(t.key)}
                className="option-card"
              >
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-leather-900">{t.name}</span>
                  {t.key === recommended && (
                    <span className="chip bg-good-bg text-good-fg !py-0.5 !text-[11px]">Suggested</span>
                  )}
                </span>
                <span className="block text-[13px] leading-snug text-leather-600 mt-1">{t.tagline}</span>
                <span className="block text-xs leading-snug text-leather-500 mt-2">{t.best_for}</span>
              </button>
            ))}
          </div>
          <ol className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-leather-600" aria-label={`${template.name} structure`}>
            <span className="text-leather-500 mr-1">Structure:</span>
            {template.beats.map((beat, i) => (
              <li key={beat} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden className="text-leather-300">→</span>}
                <span className="rounded-md bg-leather-50 border border-leather-100 px-1.5 py-0.5">{beat}</span>
              </li>
            ))}
          </ol>
        </fieldset>

        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <fieldset>
            <legend className="eyebrow mb-3">Tone</legend>
            <div className="seg flex-wrap" role="group" aria-label="Tone">
              {options.tones.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={t.key === settings.tone}
                  onClick={() => set({ tone: t.key })}
                  className="seg-item"
                >
                  {t.name}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-leather-500 mt-2 min-h-[1.25rem]">{tone?.description}</p>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-3">Length</legend>
            <div className="seg" role="group" aria-label="Length">
              {options.lengths.map((l) => {
                const allowed = template.lengths.includes(l.key);
                return (
                  <button
                    key={l.key}
                    type="button"
                    aria-pressed={l.key === settings.length}
                    disabled={!allowed}
                    title={allowed ? undefined : `${template.name} is always brief`}
                    onClick={() => set({ length: l.key })}
                    className="seg-item disabled:opacity-40 disabled:cursor-default"
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
            {length && (
              <p className="text-[13px] text-leather-500 mt-2 tabular-nums">
                {length.min_words}–{length.max_words} words
                {length.key === "standard" && ", the range most hiring managers prefer"}
              </p>
            )}
          </fieldset>
        </div>

        <fieldset>
          <legend className="eyebrow mb-1">Emphasis</legend>
          <p className="text-[13px] text-leather-500 mb-3">
            Optional. Pick up to {options.limits.max_focus} to steer which evidence leads.
          </p>
          <div className="flex flex-wrap gap-2">
            {options.focuses.map((f) => {
              const on = settings.focus.includes(f.key);
              const full = !on && settings.focus.length >= options.limits.max_focus;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => toggleFocus(f.key)}
                  className="chip-toggle"
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rounded-xl bg-leather-50 border border-leather-100 p-5 space-y-4">
          <legend className="eyebrow float-left w-full">Make it yours</legend>
          <div className="clear-left pt-1.5">
            <p className="text-[13px] text-leather-600 max-w-prose">
              Hiring managers can tell when a letter could have gone to anyone. A sentence or two in
              your own words does more than any template. Everything here is optional.
            </p>
          </div>
          <div className="md:max-w-md">
            {field("recipient", "Addressed to", "e.g. Priya Raman (leave blank for the hiring team)")}
          </div>
          {field("why_company", `Why ${company}?`, "What genuinely draws you to this team, product, or mission?", {
            multiline: true,
            autoFocus: focusInputs,
          })}
          {field("highlight", "A story or win to feature", "A specific moment or result you want the letter built around.", {
            multiline: true,
          })}

          {showMore ? (
            <div className="space-y-4">
              {field("referral", "Referral or connection", "e.g. Sam Lee, Staff Engineer on Payments, suggested I apply")}
              {field("context", "Anything to address", "e.g. Relocating to Austin in March; returning after a career break")}
              {field("instructions", "Extra instructions", "e.g. Mention I’m fluent in Spanish. Don’t mention my startup.")}
            </div>
          ) : (
            <button type="button" onClick={() => setMoreOpen(true)} className="btn btn-ghost btn-sm -ml-2">
              + Referral, context to address, extra instructions
            </button>
          )}

          {hasKeywords && (
            <label className="flex items-start gap-2.5 text-sm text-leather-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mirror_keywords}
                onChange={(e) => set({ mirror_keywords: e.target.checked })}
                className="mt-0.5 size-4 accent-leather-700"
              />
              <span>
                Use the posting’s own keywords where my experience backs them
                <span className="block text-xs text-leather-500 mt-0.5">
                  Helps with applicant tracking systems. Never claims skills you haven’t listed.
                </span>
              </span>
            </label>
          )}
        </fieldset>
      </div>

      <footer className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-leather-100 bg-leather-50 rounded-b-[12px]">
        <button type="submit" disabled={missing.length > 0} className="btn btn-primary">
          Write {template.name.toLowerCase()} draft
        </button>
        {!isFirst && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        )}
        <span className="text-xs text-leather-500 sm:ml-auto">
          {missing.length > 0
            ? `Add your ${missing.join(", ")} to use ${template.name}.`
            : isFirst
              ? "Takes about 10 seconds."
              : "Takes about 10 seconds. Your other drafts stay as they are."}
        </span>
      </footer>
    </form>
  );
}
