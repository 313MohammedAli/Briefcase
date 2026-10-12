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

  const total = matched.length + missing.length;
  const matchedPct = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  return (
    <section className="card p-6">
      <h2 className="font-medium text-leather-900">ATS keywords</h2>
      <p className="text-sm text-leather-600 mt-1 mb-4">
        What an applicant tracking system would scan for, checked against your experience bank.
      </p>

      {/* Coverage at a glance before the lists. */}
      <div className="flex items-baseline justify-between text-sm mb-1.5">
        <span className="text-leather-700">Coverage</span>
        <span className="font-medium tabular-nums text-leather-900">
          {matched.length} of {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-bad-bg overflow-hidden mb-6" aria-hidden>
        <div className="h-full rounded-full bg-good-strong" style={{ width: `${matchedPct}%` }} />
      </div>

      <div className={stacked ? "space-y-5" : "grid grid-cols-2 gap-5"}>
        <div>
          <h3 className="eyebrow mb-2 flex items-center gap-2">
            <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-good-strong" />
            Matched ({matched.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((keyword) => (
              <span key={keyword} className="chip bg-good-bg text-good-fg font-normal">
                {keyword}
              </span>
            ))}
            {matched.length === 0 && <span className="text-sm text-leather-500">None matched</span>}
          </div>
        </div>
        <div>
          <h3 className="eyebrow mb-2 flex items-center gap-2">
            <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-bad-strong" />
            Missing ({missing.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((keyword) => (
              <span key={keyword} className="chip bg-bad-bg text-bad-fg font-normal">
                {keyword}
              </span>
            ))}
            {missing.length === 0 && <span className="text-sm text-leather-500">No gaps found</span>}
          </div>
          {missing.length > 0 && (
            <p className="text-xs text-leather-500 mt-3">
              Add the ones you genuinely have to your experience bank.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
