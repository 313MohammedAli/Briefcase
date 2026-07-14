export default function KeywordGapPanel({
  analysis,
  stacked = false,
}: {
  analysis: { matched?: string[]; missing?: string[] };
  stacked?: boolean;
}) {
  const matched = analysis.matched ?? [];
  const missing = analysis.missing ?? [];

  if (matched.length === 0 && missing.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-leather-100 p-5">
      <h2 className="font-medium mb-1">ATS keyword analysis</h2>
      <p className="text-xs text-leather-500 mb-4">
        Keywords an applicant tracking system would scan for, compared against your experience
        bank. Consider addressing missing ones you actually have.
      </p>
      <div className={stacked ? "space-y-4" : "grid grid-cols-2 gap-4"}>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-emerald-700 mb-2">
            Matched ({matched.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-xs"
              >
                {keyword}
              </span>
            ))}
            {matched.length === 0 && <span className="text-xs text-leather-500">None matched</span>}
          </div>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-wide text-red-700 mb-2">
            Missing ({missing.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-red-50 text-red-800 px-2.5 py-0.5 text-xs"
              >
                {keyword}
              </span>
            ))}
            {missing.length === 0 && <span className="text-xs text-leather-500">No gaps found</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
