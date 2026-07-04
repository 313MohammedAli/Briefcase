"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/api";
import type { JobApplication } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-leather-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leather-400";

export default function NewApplicationPage() {
  const { request } = useApi();
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !company.trim() || !jobDescription.trim()) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const app = await request<JobApplication>("/job-applications/", {
        method: "POST",
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          company: company.trim(),
          job_description: jobDescription.trim(),
        }),
      });
      // The detail page auto-runs generation when it sees no cover letters.
      router.push(`/applications/${app.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create application");
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">New application</h1>
      <p className="text-sm text-leather-600 mb-6">
        Paste the job posting. Briefcase embeds the description, retrieves your most relevant
        experience, and generates cover letter drafts, a fit score, and an ATS keyword analysis.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm space-y-1">
            <span className="text-leather-600">Job title *</span>
            <input
              className={inputClass}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Senior Backend Engineer"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-leather-600">Company *</span>
            <input
              className={inputClass}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
            />
          </label>
        </div>
        <label className="text-sm space-y-1 block">
          <span className="text-leather-600">Job description *</span>
          <textarea
            className={`${inputClass} min-h-[16rem]`}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-leather-700 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create & generate"}
        </button>
      </form>
    </main>
  );
}
