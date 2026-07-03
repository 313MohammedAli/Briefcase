export default function KeywordGapPanel({
  analysis,
}: {
  analysis: { matched?: string[]; missing?: string[] };
}) {
  const matched = analysis.matched ?? [];
  const missing = analysis.missing ?? [];

  if (matched.length === 0 && missing.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
      <h2 className="font-medium mb-1">ATS keyword analysis</h2>
      <p className="text-xs text-zinc-500 mb-4">
        Keywords an applicant tracking system would scan for, compared against your experience
        bank. Consider addressing missing ones you actually have.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">
            Matched ({matched.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-xs"
              >
                {keyword}
              </span>
            ))}
            {matched.length === 0 && <span className="text-xs text-zinc-500">None matched</span>}
          </div>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-red-700 dark:text-red-400 mb-2">
            Missing ({missing.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 px-2.5 py-0.5 text-xs"
              >
                {keyword}
              </span>
            ))}
            {missing.length === 0 && <span className="text-xs text-zinc-500">No gaps found</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
