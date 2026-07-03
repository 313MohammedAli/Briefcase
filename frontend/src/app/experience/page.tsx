"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import type { EntryType, ExperienceEntry, ExperienceEntryInput } from "@/lib/types";

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: "job", label: "Job" },
  { value: "project", label: "Project" },
  { value: "certification", label: "Certification" },
  { value: "education", label: "Education" },
];

const inputClass =
  "w-full rounded-md border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400";

interface FormState {
  type: EntryType;
  title: string;
  organization: string;
  start_date: string;
  end_date: string;
  tags: string;
  bullets: string[];
}

const emptyForm: FormState = {
  type: "job",
  title: "",
  organization: "",
  start_date: "",
  end_date: "",
  tags: "",
  bullets: [""],
};

function formFromEntry(entry: ExperienceEntry): FormState {
  return {
    type: entry.type,
    title: entry.title,
    organization: entry.organization,
    start_date: entry.start_date ?? "",
    end_date: entry.end_date ?? "",
    tags: entry.tags.join(", "),
    bullets: entry.bullets.length ? entry.bullets.map((b) => b.text) : [""],
  };
}

function payloadFromForm(form: FormState): ExperienceEntryInput {
  return {
    type: form.type,
    title: form.title.trim(),
    organization: form.organization.trim(),
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
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
  // null = closed, "new" = creating, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await request<ExperienceEntry[]>("/experience-entries/"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load entries");
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await request<ExperienceEntry[]>("/experience-entries/");
        if (!cancelled) setEntries(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load entries");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const openNew = () => {
    setForm(emptyForm);
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
        await request("/experience-entries/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
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

  const setBullet = (i: number, text: string) => {
    setForm((f) => ({ ...f, bullets: f.bullets.map((b, j) => (j === i ? text : b)) }));
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Experience Bank</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Jobs, projects, certifications, and education. Each bullet is embedded and
            retrieved when generating cover letters and resumes.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium shrink-0"
        >
          Add entry
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {editing && (
        <div className="mb-8 rounded-xl border border-black/10 dark:border-white/15 p-5 space-y-4">
          <h2 className="font-medium">{editing === "new" ? "New entry" : "Edit entry"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm space-y-1">
              <span className="text-zinc-600 dark:text-zinc-400">Type</span>
              <select
                className={inputClass}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EntryType })}
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-zinc-600 dark:text-zinc-400">Title *</span>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Software Engineer"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-zinc-600 dark:text-zinc-400">Organization</span>
              <input
                className={inputClass}
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="Acme Corp"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-zinc-600 dark:text-zinc-400">Tags (comma-separated)</span>
              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Python, Django, AWS"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-zinc-600 dark:text-zinc-400">Start date</span>
              <input
                type="date"
                className={inputClass}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-zinc-600 dark:text-zinc-400">End date (blank = present)</span>
              <input
                type="date"
                className={inputClass}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Bullets — one accomplishment or responsibility each
            </span>
            {form.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  className={`${inputClass} min-h-[2.5rem]`}
                  rows={2}
                  value={bullet}
                  onChange={(e) => setBullet(i, e.target.value)}
                  placeholder="Led migration of the billing service to Django, cutting p95 latency 40%"
                />
                <button
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      bullets:
                        f.bullets.length > 1 ? f.bullets.filter((_, j) => j !== i) : [""],
                    }))
                  }
                  className="text-zinc-400 hover:text-red-600 text-sm px-1 shrink-0"
                  aria-label="Remove bullet"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, bullets: [...f.bullets, ""] }))}
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              + Add bullet
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save entry"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border border-black/15 dark:border-white/20 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {entries === null ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : entries.length === 0 && !editing ? (
        <div className="rounded-xl border border-dashed border-black/15 dark:border-white/20 p-10 text-center text-sm text-zinc-500">
          No entries yet. Add your jobs, projects, certifications, and education to power
          generation.
        </div>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-black/10 dark:border-white/15 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    {entry.type}
                  </span>
                  <h2 className="font-medium">
                    {entry.title}
                    {entry.organization && (
                      <span className="text-zinc-500"> · {entry.organization}</span>
                    )}
                  </h2>
                  {(entry.start_date || entry.end_date) && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {entry.start_date ?? "?"} → {entry.end_date ?? "present"}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 text-sm shrink-0">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-zinc-600 dark:text-zinc-400 hover:underline"
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
                <ul className="mt-3 list-disc pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
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
                      className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-700 dark:text-zinc-300"
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
    </main>
  );
}
