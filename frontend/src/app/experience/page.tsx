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
  accent: string; // text + bg for the section chip
  ring: string; // left border accent on cards
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
    ring: "border-l-leather-400",
    singleDate: false,
    hasCompleted: false,
  },
  education: {
    label: "Education",
    plural: "Education",
    orgLabel: "School",
    orgPlaceholder: "State University",
    titlePlaceholder: "B.S. Computer Science",
    accent: "bg-blue-50 text-blue-700",
    ring: "border-l-blue-400",
    singleDate: false,
    hasCompleted: true,
  },
  project: {
    label: "Project",
    plural: "Projects",
    orgLabel: "Role or context",
    orgPlaceholder: "Personal project",
    titlePlaceholder: "Briefcase — AI job app tool",
    accent: "bg-amber-50 text-amber-700",
    ring: "border-l-amber-400",
    singleDate: false,
    hasCompleted: false,
  },
  certification: {
    label: "Certification",
    plural: "Certifications",
    orgLabel: "Issuer",
    orgPlaceholder: "Amazon Web Services",
    titlePlaceholder: "AWS Solutions Architect",
    accent: "bg-emerald-50 text-emerald-700",
    ring: "border-l-emerald-400",
    singleDate: true,
    hasCompleted: false,
  },
};

const SECTION_ORDER: EntryType[] = ["job", "education", "project", "certification"];

const inputClass =
  "w-full rounded-md border border-leather-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-400";

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
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Experience Bank</h1>
        <p className="text-sm text-leather-600 mt-1">
          Everything you&apos;ve done, organized by type. It powers every cover letter, resume, and
          fit score.{" "}
          <Link href="/experience/import" className="text-leather-700 underline">
            Import from a resume
          </Link>
          .
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</p>
      )}

      {/* Personal statement */}
      <section className="mb-8 rounded-xl border border-leather-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium">Personal statement</h2>
          {statementDirty && (
            <button
              onClick={() => void saveStatement()}
              disabled={savingStatement}
              className="rounded-lg bg-leather-700 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {savingStatement ? "Saving…" : "Save"}
            </button>
          )}
        </div>
        <p className="text-xs text-leather-500 mb-3">
          A few sentences about who you are, what drives you, and what you&apos;re looking for.
          Briefcase weaves this into cover letters where it strengthens them.
        </p>
        <textarea
          value={statementValue}
          onChange={(e) => setStatementDraft(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="I'm a backend engineer who cares about reliable systems and mentoring…"
        />
      </section>

      {/* Add / edit form */}
      {editing && (
        <div className="mb-8 rounded-xl border border-leather-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">
              {editing === "new" ? `New ${meta.label.toLowerCase()}` : `Edit ${meta.label.toLowerCase()}`}
            </h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.accent}`}>
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm space-y-1">
              <span className="text-leather-600">Type</span>
              <select
                className={inputClass}
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
            <label className="text-sm space-y-1">
              <span className="text-leather-600">Title *</span>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={meta.titlePlaceholder}
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-leather-600">{meta.orgLabel}</span>
              <input
                className={inputClass}
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder={meta.orgPlaceholder}
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-leather-600">Tags (comma-separated)</span>
              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Python, Django, AWS"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-leather-600">{meta.singleDate ? "Issued" : "Start date"}</span>
              <input
                type="date"
                className={inputClass}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </label>
            {!meta.singleDate && (
              <label className="text-sm space-y-1">
                <span className="text-leather-600">
                  End date {meta.hasCompleted ? "(or expected)" : "(blank = present)"}
                </span>
                <input
                  type="date"
                  className={inputClass}
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
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
              />
              Completed / graduated
            </label>
          )}

          <div className="space-y-2">
            <span className="text-sm text-leather-600">
              {form.type === "certification"
                ? "Details (optional) — what it covers, credential ID"
                : "Bullets — one accomplishment or responsibility each"}
            </span>
            {form.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  className={`${inputClass} min-h-[2.5rem]`}
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
                  className="text-leather-400 hover:text-red-600 text-sm px-1 shrink-0"
                  aria-label="Remove bullet"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, bullets: [...f.bullets, ""] }))}
              className="text-sm text-leather-600 hover:text-leather-900"
            >
              + Add bullet
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-leather-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save entry"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-leather-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sectioned listing */}
      {entries === null ? (
        <p className="text-sm text-leather-500">Loading…</p>
      ) : (
        <div className="space-y-8">
          {SECTION_ORDER.map((type) => {
            const meta = TYPE_META[type];
            const items = entries.filter((e) => e.type === type);
            return (
              <section key={type}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.accent}`}>
                      {meta.plural}
                    </span>
                    <span className="text-xs text-leather-400">{items.length}</span>
                  </div>
                  <button
                    onClick={() => openNew(type)}
                    className="text-sm text-leather-600 hover:text-leather-900"
                  >
                    + Add
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-leather-200 p-5 text-center text-sm text-leather-400">
                    No {meta.plural.toLowerCase()} yet.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {items.map((entry) => (
                      <li
                        key={entry.id}
                        className={`rounded-xl border border-leather-100 border-l-4 ${meta.ring} p-5`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="font-medium">
                              {entry.title}
                              {entry.organization && (
                                <span className="text-leather-500"> · {entry.organization}</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {dateRange(entry) && (
                                <span className="text-xs text-leather-500">{dateRange(entry)}</span>
                              )}
                              {meta.hasCompleted && entry.completed === false && (
                                <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-medium">
                                  In progress
                                </span>
                              )}
                              {meta.hasCompleted && entry.completed && (
                                <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-medium">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-3 text-sm shrink-0">
                            <button
                              onClick={() => openEdit(entry)}
                              className="text-leather-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(entry.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {entry.bullets.length > 0 && (
                          <ul className="mt-3 list-disc pl-5 space-y-1 text-sm text-leather-800">
                            {entry.bullets.map((b) => (
                              <li key={b.id ?? b.text}>{b.text}</li>
                            ))}
                          </ul>
                        )}
                        {entry.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-leather-100 px-2.5 py-0.5 text-xs text-leather-700"
                              >
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
