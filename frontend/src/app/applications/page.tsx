"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import type { ApplicationStatus, JobApplication } from "@/lib/types";
import FitScoreBadge from "@/components/FitScoreBadge";
import StatusSelect from "@/components/StatusSelect";

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-leather-600 mt-1">
            Paste a job description to generate a tailored cover letter, resume, and fit score.
          </p>
        </div>
        <Link
          href="/applications/new"
          className="rounded-lg bg-leather-700 text-white px-4 py-2 text-sm font-medium shrink-0"
        >
          New application
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {applications === null ? (
        <p className="text-sm text-leather-500">Loading…</p>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-leather-200 p-10 text-center text-sm text-leather-500">
          No applications yet. Create one by pasting a job description.
        </div>
      ) : (
        <ul className="space-y-3">
          {applications.map((app) => (
            <li
              key={app.id}
              className="relative flex items-center justify-between gap-4 rounded-xl border border-leather-100 p-5 hover:border-leather-400 transition-colors"
            >
              {/* Overlay link covers the card for navigation; the status control
                  sits above it as a sibling so it stays interactive. */}
              <Link
                href={`/applications/${app.id}`}
                aria-label={`Open ${app.job_title} at ${app.company}`}
                className="absolute inset-0 rounded-xl"
              />
              <div className="min-w-0 pointer-events-none">
                <h2 className="font-medium truncate">
                  {app.job_title} <span className="text-leather-500">@ {app.company}</span>
                </h2>
                <p className="text-xs text-leather-500 mt-0.5">
                  Created {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="relative flex items-center gap-3 shrink-0">
                <span className="pointer-events-none">
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
