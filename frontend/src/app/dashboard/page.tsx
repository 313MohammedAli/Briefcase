"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useApi } from "@/lib/api";
import type { ApplicationStatus, ExperienceEntry, JobApplication } from "@/lib/types";
import FitScoreBadge, { fitScoreInk } from "@/components/FitScoreBadge";
import { STATUS_LABELS, STATUS_STRONG } from "@/components/StatusSelect";

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

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="px-6 py-5">
      <div className={`font-serif text-[36px] leading-none tracking-tight tabular-nums ${tone ?? "text-leather-900"}`}>
        {value}
      </div>
      <div className="text-sm text-leather-700 mt-2.5">{label}</div>
      {sub && <div className="text-xs text-leather-500 mt-0.5">{sub}</div>}
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


  const PIPELINE: ApplicationStatus[] = ["applied", "interview", "offer", "rejected"];
  const total = apps?.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl 2xl:max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-serif text-[34px] leading-tight tracking-tight text-leather-900">
            {firstName ? `Welcome back, ${firstName}` : "Your dashboard"}
          </h1>
          <p className="text-[15px] text-leather-600 mt-1.5">
            An overview of your briefcase and what to do next.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/experience/import" className="btn btn-secondary">
            Import resume
          </Link>
          <Link href="/experience" className="btn btn-secondary">
            Add experience
          </Link>
          <Link href="/applications/new" className="btn btn-primary">
            New application
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-6 rounded-lg bg-bad-bg text-bad-fg px-3 py-2 text-sm">{error}</p>
      )}

      {/* Metrics: one strip with dividers, so the numbers read as a row of
          facts rather than four competing boxes. Average fit carries colour
          because it is the one that changes what you do next. */}
      <div className="card grid grid-cols-2 md:grid-cols-4 mb-10 divide-y md:divide-y-0 md:divide-x divide-leather-100">
        <Metric label="Experience entries" value={loading ? "—" : entries!.length} sub={`${bulletCount} bullets`} />
        <Metric label="Applications" value={loading ? "—" : apps!.length} />
        <Metric
          label="Average fit"
          value={avgFit === null ? "—" : `${avgFit}%`}
          sub={loading ? undefined : `across ${scored.length} scored`}
          tone={avgFit === null ? undefined : fitScoreInk(avgFit)}
        />
        <Metric label="Offers" value={loading ? "—" : statusCounts["offer"] ?? 0} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        {/* Recommendations */}
        <section>
          <h2 className="eyebrow mb-4">What to do next</h2>
          {loading ? (
            <p className="text-sm text-leather-500">Loading…</p>
          ) : recommendations.length === 0 ? (
            <div className="card p-6 text-[15px] text-leather-600">
              Your briefcase is in good shape. Paste a new job posting whenever you&apos;re ready to apply.
            </div>
          ) : (
            <ul className="card divide-y divide-leather-100">
              {recommendations.map((rec) => (
                <li key={rec.title} className="p-6">
                  <h3 className="font-serif text-[20px] leading-snug text-leather-900">{rec.title}</h3>
                  <p className="text-[15px] leading-relaxed text-leather-600 mt-1.5 max-w-prose">{rec.body}</p>
                  <Link
                    href={rec.href}
                    className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-leather-700 hover:text-leather-900"
                  >
                    {rec.cta}
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pipeline + recent */}
        <section className="space-y-10">
          <div>
            <h2 className="eyebrow mb-4">Pipeline</h2>
            <div className="card p-6">
              {/* Segmented bar: each status takes its share of the total. */}
              <div className="flex h-2.5 rounded-full overflow-hidden bg-leather-100 mb-5">
                {!loading &&
                  total > 0 &&
                  PIPELINE.map((s) => {
                    const n = statusCounts[s] ?? 0;
                    if (n === 0) return null;
                    return (
                      <span
                        key={s}
                        className={STATUS_STRONG[s]}
                        style={{ width: `${(n / total) * 100}%` }}
                        title={`${STATUS_LABELS[s]}: ${n}`}
                      />
                    );
                  })}
              </div>
              <dl className="space-y-2.5">
                {PIPELINE.map((s) => (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <dt className="flex items-center gap-2.5 text-leather-700">
                      <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${STATUS_STRONG[s]}`} />
                      {STATUS_LABELS[s]}
                    </dt>
                    <dd className="font-medium tabular-nums text-leather-900">
                      {loading ? "—" : statusCounts[s] ?? 0}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="eyebrow">Recent applications</h2>
              <Link href="/applications" className="text-sm text-leather-600 hover:text-leather-900">
                View all
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-leather-500">Loading…</p>
            ) : recentApps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-leather-200 p-6 text-center text-sm text-leather-500">
                No applications yet.
              </div>
            ) : (
              <ul className="card divide-y divide-leather-100">
                {recentApps.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-leather-50 transition-colors first:rounded-t-[12px] last:rounded-b-[12px]"
                    >
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium truncate">{app.job_title}</span>
                        <span className="block text-sm text-leather-500 truncate">{app.company}</span>
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
