"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import type { ApplicationStatus, JobApplication } from "@/lib/types";
import CoverLetterPanel from "@/components/CoverLetterPanel";
import FitScoreBadge from "@/components/FitScoreBadge";
import KeywordGapPanel from "@/components/KeywordGapPanel";
import ResumePanel from "@/components/ResumePanel";
import StatusSelect from "@/components/StatusSelect";

function hasCoverLetters(app: JobApplication): boolean {
  return Object.values(app.generated_cover_letters ?? {}).some((p) => p && p.length > 0);
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { request } = useApi();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const generateStarted = useRef(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const updated = await request<JobApplication>(`/job-applications/${id}/generate/`, {
        method: "POST",
      });
      setApplication(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [id, request]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const app = await request<JobApplication>(`/job-applications/${id}/`);
        if (cancelled) return;
        setApplication(app);
        // Fresh application: kick off generation automatically, once.
        if (!hasCoverLetters(app) && !generateStarted.current) {
          generateStarted.current = true;
          void generate();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load application");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, request, generate]);

  const updateStatus = async (status: ApplicationStatus) => {
    if (!application) return;
    setApplication({ ...application, status });
    try {
      await request(`/job-applications/${id}/status/`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  if (application === null && !error) {
    return (
      <main className="mx-auto w-full max-w-4xl 2xl:max-w-5xl px-6 py-10">
        <p className="text-sm text-leather-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl 2xl:max-w-6xl px-6 py-10 space-y-5">
      <div>
        <Link href="/applications" className="text-sm text-leather-500 hover:underline">
          ← Applications
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {application && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {application.job_title}
              </h1>
              <p className="text-leather-500">{application.company}</p>
              <button
                onClick={() => setShowDescription((s) => !s)}
                className="mt-1 text-xs text-leather-500 hover:underline"
              >
                {showDescription ? "Hide job description" : "Show job description"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <FitScoreBadge score={application.match_score} size="lg" />
              <StatusSelect value={application.status} onChange={(s) => void updateStatus(s)} />
            </div>
          </div>

          {showDescription && (
            <pre className="rounded-xl border border-leather-100 p-5 text-sm whitespace-pre-wrap font-sans text-leather-800 max-h-80 overflow-y-auto">
              {application.job_description}
            </pre>
          )}

          {generating && (
            <div className="rounded-xl border border-leather-100 p-8 text-center">
              <p className="text-sm font-medium animate-pulse">
                Generating cover letters, fit score, and ATS analysis…
              </p>
              <p className="text-xs text-leather-500 mt-1">
                Retrieving your most relevant experience and writing three variants. This
                usually takes about 15 seconds.
              </p>
            </div>
          )}

          {!generating && !hasCoverLetters(application) && (
            <div className="rounded-xl border border-dashed border-leather-200 p-8 text-center">
              <p className="text-sm text-leather-500 mb-3">Nothing generated yet.</p>
              <button
                onClick={() => void generate()}
                className="rounded-lg bg-leather-700 text-white px-4 py-2 text-sm font-medium"
              >
                Generate
              </button>
            </div>
          )}

          {hasCoverLetters(application) &&
            (() => {
              const gap = application.keyword_gap_analysis ?? {};
              const hasAts = (gap.matched?.length ?? 0) + (gap.missing?.length ?? 0) > 0;
              const documents = (
                <div className="space-y-5 min-w-0">
                  <CoverLetterPanel
                    application={application}
                    onChange={setApplication}
                    onError={setError}
                  />
                  <ResumePanel
                    application={application}
                    onChange={setApplication}
                    onError={setError}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => void generate()}
                      disabled={generating}
                      className="text-xs text-leather-500 hover:underline disabled:opacity-50"
                      title="Re-run retrieval, cover letters, fit score, and ATS analysis. Overwrites manual cover letter edits."
                    >
                      ↻ Regenerate everything
                    </button>
                  </div>
                </div>
              );

              if (!hasAts) return documents;

              // Wide screens: documents on the left, ATS analysis in a sticky
              // sidebar so the extra width is used instead of left empty.
              return (
                <div className="grid gap-5 items-start lg:grid-cols-[minmax(0,1fr)_340px]">
                  {documents}
                  <aside className="lg:sticky lg:top-24">
                    <KeywordGapPanel analysis={gap} stacked />
                  </aside>
                </div>
              );
            })()}
        </>
      )}
    </main>
  );
}
