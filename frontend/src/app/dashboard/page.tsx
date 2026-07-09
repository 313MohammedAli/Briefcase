"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/api";
import type { ApplicationStatus, ExperienceEntry, JobApplication } from "@/lib/types";
import FitScoreBadge from "@/components/FitScoreBadge";
import { STATUS_STYLES } from "@/components/StatusSelect";

interface Recommendation {
  title: string;
  body: string;
  href: string;
  cta: string;
}

function buildRecommendations(
  entries: ExperienceEntry[],
  apps: JobApplication[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  const bulletCount = entries.reduce((n, e) => n + e.bullets.length, 0);

  if (entries.length === 0) {
    recs.push({
      title: "Start your experience bank",
      body: "Import your resume or add your first job, project, or degree. Everything generation does draws from here.",
      href: "/experience/import",
      cta: "Import resume",
    });
  } else if (bulletCount < entries.length * 2) {
    recs.push({
      title: "Add more detail to your entries",
      body: "Entries with a few specific, quantified bullets each retrieve far better than sparse ones. Aim for 2 to 4 per entry.",
      href: "/experience",
      cta: "Edit experience",
    });
  }

  if (entries.length > 0 && apps.length === 0) {
    recs.push({
      title: "Create your first application",
      body: "Paste a job posting to generate a tailored cover letter, resume, and fit score in seconds.",
      href: "/applications/new",
      cta: "New application",
    });
  }

  // Surface the keywords job postings ask for most that the bank keeps missing.
  const missingTally = new Map<string, number>();
  for (const app of apps) {
    for (const kw of app.keyword_gap_analysis?.missing ?? []) {
      missingTally.set(kw, (missingTally.get(kw) ?? 0) + 1);
    }
  }
  const topMissing = [...missingTally.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([kw]) => kw);
  if (topMissing.length > 0) {
    recs.push({
      title: "Recurring keyword gaps",
      body: `Postings you've saved often ask for: ${topMissing.join(", ")}. If you have that experience, add it so future matches improve.`,
      href: "/experience",
      cta: "Add experience",
    });
  }

  const scored = apps.filter((a) => a.match_score !== null);
  const weak = scored.filter((a) => (a.match_score ?? 0) < 45);
  if (scored.length >= 2 && weak.length >= Math.ceil(scored.length / 2)) {
    recs.push({
      title: "Your fit scores are running low",
      body: "Several applications score under 45%. A richer experience bank usually lifts fit across the board.",
      href: "/experience",
      cta: "Strengthen bank",
    });
  }

  return recs;
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-leather-100 p-5">
      <div className="text-3xl font-semibold tracking-tight text-leather-900">{value}</div>
      <div className="text-sm text-leather-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-leather-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { request } = useApi();
  const { user } = useUser();
  const [entries, setEntries] = useState<ExperienceEntry[] | null>(null);
  const [apps, setApps] = useState<JobApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [e, a] = await Promise.all([
          request<ExperienceEntry[]>("/experience-entries/"),
          request<JobApplication[]>("/job-applications/"),
        ]);
        if (!cancelled) {
          setEntries(e);
          setApps(a);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const loading = entries === null || apps === null;
  const bulletCount = entries?.reduce((n, e) => n + e.bullets.length, 0) ?? 0;
  const scored = apps?.filter((a) => a.match_score !== null) ?? [];
  const avgFit =
    scored.length > 0
      ? Math.round(scored.reduce((n, a) => n + (a.match_score ?? 0), 0) / scored.length)
      : null;
  const statusCounts = (apps ?? []).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const recommendations = loading ? [] : buildRecommendations(entries!, apps!);
  const recentApps = (apps ?? []).slice(0, 5);
  const firstName = user?.firstName || user?.fullName?.split(" ")[0] || "";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Your dashboard"}
        </h1>
        <p className="text-sm text-leather-600 mt-1">
          An overview of your briefcase and what to do next.
        </p>
      </div>

      {error && (
        <p className="mb-6 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</p>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/applications/new" className="rounded-lg bg-leather-700 text-white px-4 py-2 text-sm font-medium">
          New application
        </Link>
        <Link href="/experience" className="rounded-lg border border-leather-200 px-4 py-2 text-sm font-medium">
          Add experience
        </Link>
        <Link href="/experience/import" className="rounded-lg border border-leather-200 px-4 py-2 text-sm font-medium">
          Import resume
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric label="Experience entries" value={loading ? "—" : entries!.length} sub={`${bulletCount} bullets`} />
        <Metric label="Applications" value={loading ? "—" : apps!.length} />
        <Metric label="Average fit" value={avgFit === null ? "—" : `${avgFit}%`} sub={loading ? undefined : `across ${scored.length} scored`} />
        <Metric label="Offers" value={loading ? "—" : statusCounts["offer"] ?? 0} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Recommendations */}
        <section>
          <h2 className="font-medium mb-3">Recommendations</h2>
          {loading ? (
            <p className="text-sm text-leather-500">Loading…</p>
          ) : recommendations.length === 0 ? (
            <div className="rounded-xl border border-leather-100 p-6 text-sm text-leather-600">
              Your briefcase is in good shape. Paste a new job posting whenever you&apos;re ready to apply.
            </div>
          ) : (
            <ul className="space-y-3">
              {recommendations.map((rec) => (
                <li key={rec.title} className="rounded-xl border border-leather-100 p-5">
                  <h3 className="font-medium text-leather-900">{rec.title}</h3>
                  <p className="text-sm text-leather-600 mt-1">{rec.body}</p>
                  <Link
                    href={rec.href}
                    className="inline-block mt-3 text-sm font-medium text-leather-700 hover:text-leather-900"
                  >
                    {rec.cta} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pipeline + recent */}
        <section className="space-y-6">
          <div>
            <h2 className="font-medium mb-3">Pipeline</h2>
            <div className="rounded-xl border border-leather-100 p-5 space-y-2">
              {(["applied", "interview", "offer", "rejected"] as ApplicationStatus[]).map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[s]}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                  <span className="text-leather-700 font-medium">{loading ? "—" : statusCounts[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-medium mb-3">Recent applications</h2>
            {loading ? (
              <p className="text-sm text-leather-500">Loading…</p>
            ) : recentApps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-leather-200 p-6 text-center text-sm text-leather-500">
                No applications yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {recentApps.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-leather-100 p-4 hover:border-leather-300 transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{app.job_title}</span>
                        <span className="block text-xs text-leather-500 truncate">{app.company}</span>
                      </span>
                      <FitScoreBadge score={app.match_score} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
