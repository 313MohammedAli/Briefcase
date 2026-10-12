"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/api";
import type {
  EntryType,
  ExperienceEntry,
  ExperienceEntryInput,
  Profile,
} from "@/lib/types";

type TypeMeta = {
  label: string;
  plural: string;
  orgLabel: string;
  orgPlaceholder: string;
  titlePlaceholder: string;
  accent: string; // chip colours for the type label
  singleDate: boolean; // certifications: one "issued" date
  hasCompleted: boolean; // education: completed checkbox
};

const TYPE_META: Record<EntryType, TypeMeta> = {
  job: {
    label: "Job",
    plural: "Work experience",
    orgLabel: "Company",
    orgPlaceholder: "Acme Corp",
    titlePlaceholder: "Senior Backend Engineer",
    accent: "bg-leather-100 text-leather-800",
    singleDate: false,
    hasCompleted: false,
  },
  education: {
    label: "Education",
    plural: "Education",
    orgLabel: "School",
    orgPlaceholder: "State University",
    titlePlaceholder: "B.S. Computer Science",
    accent: "bg-info-bg text-info-fg",
    singleDate: false,
    hasCompleted: true,
  },
  project: {
    label: "Project",
    plural: "Projects",
    orgLabel: "Role or context",
    orgPlaceholder: "Personal project",
    titlePlaceholder: "Briefcase — AI job app tool",
    accent: "bg-warn-bg text-warn-fg",
    singleDate: false,
    hasCompleted: false,
  },
  certification: {
    label: "Certification",
    plural: "Certifications",
    orgLabel: "Issuer",
    orgPlaceholder: "Amazon Web Services",
    titlePlaceholder: "AWS Solutions Architect",
    accent: "bg-good-bg text-good-fg",
    singleDate: true,
    hasCompleted: false,
  },
};

const SECTION_ORDER: EntryType[] = ["job", "education", "project", "certification"];

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function dateRange(entry: ExperienceEntry): string {
  const meta = TYPE_META[entry.type];
  if (meta.singleDate) return entry.start_date ? `Issued ${formatDate(entry.start_date)}` : "";
  const start = formatDate(entry.start_date);
  const end = entry.end_date ? formatDate(entry.end_date) : "Present";
  if (!start && !entry.end_date) return "";
  return `${start || "?"} → ${end}`;
}

interface FormState {
  type: EntryType;
  title: string;
  organization: string;
  start_date: string;
  end_date: string;
  tags: string;
  bullets: string[];
  completed: boolean;
}

const emptyForm = (type: EntryType = "job"): FormState => ({
  type,
  title: "",
  organization: "",
  start_date: "",
  end_date: "",
  tags: "",
  bullets: [""],
  completed: true,
});

function formFromEntry(entry: ExperienceEntry): FormState {
  return {
    type: entry.type,
    title: entry.title,
    organization: entry.organization,
    start_date: entry.start_date ?? "",
    end_date: entry.end_date ?? "",
    tags: entry.tags.join(", "),
    bullets: entry.bullets.length ? entry.bullets.map((b) => b.text) : [""],
    completed: entry.completed ?? true,
  };
}

function payloadFromForm(form: FormState): ExperienceEntryInput {
  const meta = TYPE_META[form.type];
  return {
    type: form.type,
    title: form.title.trim(),
    organization: form.organization.trim(),
    start_date: form.start_date || null,
    end_date: meta.singleDate ? null : form.end_date || null,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    completed: meta.hasCompleted ? form.completed : null,
    bullets: form.bullets
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text, order) => ({ text, order })),
  };
}

export default function ExperiencePage() {
  const { request } = useApi();
  const [entries, setEntries] = useState<ExperienceEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // null | "new" | id
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [statement, setStatement] = useState("");
  const [statementDraft, setStatementDraft] = useState<string | null>(null);
  const [savingStatement, setSavingStatement] = useState(false);

  const load = useCallback(async () => {
    const data = await request<ExperienceEntry[]>("/experience-entries/");
    setEntries(data);
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, profile] = await Promise.all([
          request<ExperienceEntry[]>("/experience-entries/"),
          request<Profile>("/profile/"),
        ]);
        if (cancelled) return;
        setEntries(data);
        setStatement(profile.personal_statement ?? "");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load experience");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const openNew = (type: EntryType) => {
    setForm(emptyForm(type));
    setEditing("new");
  };
  const openEdit = (entry: ExperienceEntry) => {
    setForm(formFromEntry(entry));
    setEditing(entry.id);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = payloadFromForm(form);
      if (editing === "new") {
        await request("/experience-entries/", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await request(`/experience-entries/${editing}/`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry? Its bullets will no longer be used for generation.")) return;
    try {
      await request(`/experience-entries/${id}/`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete entry");
    }
  };

  const saveStatement = async () => {
    if (statementDraft === null) return;
    setSavingStatement(true);
    try {
      const updated = await request<Profile>("/profile/", {
        method: "PATCH",
        body: JSON.stringify({ personal_statement: statementDraft }),
      });
      setStatement(updated.personal_statement ?? "");
      setStatementDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save personal statement");
    } finally {
      setSavingStatement(false);
    }
  };

  const meta = TYPE_META[form.type];
  const statementValue = statementDraft ?? statement;
  const statementDirty = statementDraft !== null && statementDraft !== statement;

  return (
    <main className="mx-auto w-full max-w-5xl 2xl:max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-[34px] leading-tight tracking-tight text-leather-900">
            Experience bank
          </h1>
          <p className="text-[15px] text-leather-600 mt-1.5 max-w-prose">
            Everything you&apos;ve done, organized by type. It powers every cover letter, resume,
            and fit score.
          </p>
        </div>
        <Link href="/experience/import" className="btn btn-secondary">
          Import from a resume
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-bg text-bad-fg px-3 py-2 text-sm">{error}</p>
      )}

      {/* Personal statement */}
      <section className="card p-6 mb-10">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-medium text-leather-900">Personal statement</h2>
          {statementDirty && (
            <button
              onClick={() => void saveStatement()}
              disabled={savingStatement}
              className="btn btn-primary btn-sm"
            >
              {savingStatement ? "Saving…" : "Save"}
            </button>
          )}
        </div>
        <p className="text-sm text-leather-600 mb-4 max-w-prose">
          A few sentences about who you are, what drives you, and what you&apos;re looking for.
          Briefcase weaves this into cover letters where it strengthens them.
        </p>
        <textarea
          value={statementValue}
          onChange={(e) => setStatementDraft(e.target.value)}
          rows={4}
          className="input leading-relaxed"
          placeholder="I'm a backend engineer who cares about reliable systems and mentoring…"
        />
      </section>

      {/* Add / edit form */}
      {editing && (
        <div className="card p-6 mb-10 space-y-5 border-leather-300 enter">
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-xl text-leather-900">
              {editing === "new" ? `New ${meta.label.toLowerCase()}` : `Edit ${meta.label.toLowerCase()}`}
            </h2>
            <span className={`chip ${meta.accent}`}>{meta.label}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm space-y-1.5 block">
              <span className="text-leather-700">Type</span>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EntryType })}
              >
                {SECTION_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1.5 block">
              <span className="text-leather-700">Title</span>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={meta.titlePlaceholder}
              />
            </label>
            <label className="text-sm space-y-1.5 block">
              <span className="text-leather-700">{meta.orgLabel}</span>
              <input
                className="input"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder={meta.orgPlaceholder}
              />
            </label>
            <label className="text-sm space-y-1.5 block">
              <span className="text-leather-700">Tags (comma-separated)</span>
              <input
                className="input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Python, Django, AWS"
              />
            </label>
            <label className="text-sm space-y-1.5 block">
              <span className="text-leather-700">{meta.singleDate ? "Issued" : "Start date"}</span>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </label>
            {!meta.singleDate && (
              <label className="text-sm space-y-1.5 block">
                <span className="text-leather-700">
                  End date {meta.hasCompleted ? "(or expected)" : "(blank = present)"}
                </span>
                <input
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </label>
            )}
          </div>

          {meta.hasCompleted && (
            <label className="flex items-center gap-2 text-sm text-leather-700">
              <input
                type="checkbox"
                className="accent-leather-700 w-4 h-4"
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
              />
              Completed / graduated
            </label>
          )}

          <div className="space-y-2">
            <span className="block text-sm text-leather-700">
              {form.type === "certification"
                ? "Details (optional): what it covers, credential ID"
                : "Bullets: one accomplishment or responsibility each"}
            </span>
            {form.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  className="input min-h-[2.5rem] field-sizing-content"
                  rows={2}
                  value={bullet}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bullets: f.bullets.map((b, j) => (j === i ? e.target.value : b)),
                    }))
                  }
                  placeholder="Led migration of the billing service to Django, cutting p95 latency 40%"
                />
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      bullets: f.bullets.length > 1 ? f.bullets.filter((_, j) => j !== i) : [""],
                    }))
                  }
                  className="btn btn-ghost btn-sm shrink-0 self-start"
                  aria-label="Remove bullet"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, bullets: [...f.bullets, ""] }))}
              className="btn btn-ghost btn-sm -ml-2"
            >
              + Add bullet
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? "Saving…" : "Save entry"}
            </button>
            <button onClick={() => setEditing(null)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sectioned listing */}
      {entries === null ? (
        <p className="text-sm text-leather-500">Loading…</p>
      ) : (
        <div className="space-y-10 enter">
          {SECTION_ORDER.map((type) => {
            const meta = TYPE_META[type];
            const items = entries.filter((e) => e.type === type);
            return (
              <section key={type}>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-serif text-[22px] text-leather-900">
                    {meta.plural}
                    <span className="ml-2.5 font-sans text-sm font-medium text-leather-500 tabular-nums">
                      {items.length}
                    </span>
                  </h2>
                  <button onClick={() => openNew(type)} className="btn btn-ghost btn-sm">
                    + Add {meta.label.toLowerCase()}
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-leather-200 p-6 text-center text-sm text-leather-500">
                    No {meta.plural.toLowerCase()} yet.
                  </div>
                ) : (
                  <ul className="card divide-y divide-leather-100">
                    {items.map((entry) => (
                      <li key={entry.id} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-medium text-leather-900">
                              {entry.title}
                              {entry.organization && (
                                <span className="font-normal text-leather-600"> · {entry.organization}</span>
                              )}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {dateRange(entry) && (
                                <span className="text-sm text-leather-500 tabular-nums">{dateRange(entry)}</span>
                              )}
                              {meta.hasCompleted && entry.completed === false && (
                                <span className="chip bg-warn-bg text-warn-fg">In progress</span>
                              )}
                              {meta.hasCompleted && entry.completed && (
                                <span className="chip bg-good-bg text-good-fg">Completed</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 -mr-2">
                            <button onClick={() => openEdit(entry)} className="btn btn-ghost btn-sm">
                              Edit
                            </button>
                            <button onClick={() => remove(entry.id)} className="btn btn-danger-ghost btn-sm">
                              Delete
                            </button>
                          </div>
                        </div>
                        {entry.bullets.length > 0 && (
                          <ul className="mt-3 list-disc pl-5 space-y-1 text-[15px] leading-relaxed text-leather-800 marker:text-leather-400">
                            {entry.bullets.map((b) => (
                              <li key={b.id ?? b.text}>{b.text}</li>
                            ))}
                          </ul>
                        )}
                        {entry.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {entry.tags.map((tag) => (
                              <span key={tag} className="chip bg-leather-100 text-leather-700 font-normal">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
