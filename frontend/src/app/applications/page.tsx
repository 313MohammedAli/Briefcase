"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import type { ApplicationStatus, JobApplication } from "@/lib/types";
import FitScoreBadge from "@/components/FitScoreBadge";
import StatusSelect from "@/components/StatusSelect";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ApplicationsPage() {
  const { request } = useApi();
  const [applications, setApplications] = useState<JobApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setApplications(await request<JobApplication[]>("/job-applications/"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await request<JobApplication[]>("/job-applications/");
        if (!cancelled) setApplications(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load applications");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    setApplications(
      (apps) => apps?.map((a) => (a.id === id ? { ...a, status } : a)) ?? null
    );
    try {
      await request(`/job-applications/${id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
      await load();
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl 2xl:max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-[34px] leading-tight tracking-tight text-leather-900">
            Applications
            {applications && applications.length > 0 && (
              <span className="ml-3 font-sans text-base font-medium text-leather-500 tabular-nums align-middle">
                {applications.length}
              </span>
            )}
          </h1>
          <p className="text-[15px] text-leather-600 mt-1.5">
            Paste a job description to generate a tailored cover letter, resume, and fit score.
          </p>
        </div>
        <Link href="/applications/new" className="btn btn-primary">
          New application
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-bad-bg text-bad-fg px-3 py-2 text-sm">{error}</p>
      )}

      {applications === null ? (
        <p className="text-sm text-leather-500">Loading…</p>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-leather-200 p-12 text-center">
          <p className="font-serif text-xl text-leather-900">Nothing in the briefcase yet</p>
          <p className="text-sm text-leather-600 mt-1.5 mb-5">
            Paste a job posting and Briefcase will write the first draft.
          </p>
          <Link href="/applications/new" className="btn btn-primary">
            New application
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-leather-100 enter">
          {applications.map((app) => (
            <li
              key={app.id}
              className="row-link relative grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_7.5rem_6rem_auto] items-center gap-x-5 gap-y-1 px-5 py-4 first:rounded-t-[12px] last:rounded-b-[12px]"
            >
              {/* Overlay link covers the row for navigation; the status control
                  sits above it as a sibling so it stays interactive. */}
              <Link
                href={`/applications/${app.id}`}
                aria-label={`Open ${app.job_title} at ${app.company}`}
                className="absolute inset-0 rounded-[inherit]"
              />
              <div className="min-w-0 pointer-events-none">
                <h2 className="text-[15px] font-medium text-leather-900 truncate">{app.job_title}</h2>
                <p className="text-sm text-leather-500 truncate">{app.company}</p>
              </div>
              <p className="hidden sm:block text-sm text-leather-500 tabular-nums pointer-events-none">
                {formatDate(app.created_at)}
              </p>
              <span className="hidden sm:flex justify-end pointer-events-none">
                <FitScoreBadge score={app.match_score} />
              </span>
              <div className="relative flex items-center gap-2 justify-self-end">
                <span className="sm:hidden pointer-events-none">
                  <FitScoreBadge score={app.match_score} />
                </span>
                <StatusSelect
                  value={app.status}
                  onChange={(status) => void updateStatus(app.id, status)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
