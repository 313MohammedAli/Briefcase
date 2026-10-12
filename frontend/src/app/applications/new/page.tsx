"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/api";
import type { JobApplication } from "@/lib/types";

export default function NewApplicationPage() {
  const { request } = useApi();
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchFromUrl = async () => {
    if (!url.trim()) {
      setError("Paste a job posting URL first.");
      return;
    }
    setFetching(true);
    setError(null);
    setNotice(null);
    try {
      const data = await request<{
        job_title: string;
        company: string;
        job_description: string;
      }>("/job-applications/from-url/", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      if (data.job_title) setJobTitle(data.job_title);
      if (data.company) setCompany(data.company);
      if (data.job_description) setJobDescription(data.job_description);
      setNotice("Pulled the posting in. Review the fields below, then generate.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch that URL");
    } finally {
      setFetching(false);
    }
  };

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
    <main className="mx-auto w-full max-w-3xl 2xl:max-w-4xl px-6 py-10">
      <Link href="/applications" className="text-sm text-leather-500 hover:text-leather-800">
        ← Applications
      </Link>
      <h1 className="font-serif text-[34px] leading-tight tracking-tight text-leather-900 mt-3">
        New application
      </h1>
      <p className="text-[15px] text-leather-600 mt-1.5 mb-8 max-w-prose">
        Paste the job posting. Briefcase embeds the description, retrieves your most relevant
        experience, and generates cover letter drafts, a fit score, and an ATS keyword analysis.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-bg text-bad-fg px-3 py-2 text-sm">{error}</p>
      )}

      <div className="card p-5 mb-6">
        <label className="block">
          <span className="eyebrow block mb-2">Auto-fill from a URL</span>
          <div className="flex gap-2">
            <input
              type="url"
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/senior-engineer"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void fetchFromUrl();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void fetchFromUrl()}
              disabled={fetching}
              className="btn btn-secondary shrink-0"
            >
              {fetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
        </label>
        <p className="mt-2.5 text-xs text-leather-500">
          Works best on direct company career pages. Some job boards block automated access; if
          that happens, paste the description below.
        </p>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg bg-good-bg text-good-fg px-3 py-2 text-sm">{notice}</p>
      )}

      <form onSubmit={submit} className="card p-5 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm space-y-1.5 block">
            <span className="text-leather-700">Job title</span>
            <input
              className="input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Senior Backend Engineer"
            />
          </label>
          <label className="text-sm space-y-1.5 block">
            <span className="text-leather-700">Company</span>
            <input
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Corp"
            />
          </label>
        </div>
        <label className="text-sm space-y-1.5 block">
          <span className="text-leather-700">Job description</span>
          <textarea
            className="input min-h-[18rem] leading-relaxed"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
          />
        </label>
        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Creating…" : "Create & generate"}
          </button>
          <span className="text-xs text-leather-500">All three fields are required.</span>
        </div>
      </form>
    </main>
  );
}
