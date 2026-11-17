import type { CheckItem, CheckStatus } from "@/lib/letterCheck";
import type { CoverLetterDraft } from "@/lib/types";

const DOT: Record<CheckStatus, string> = {
  good: "bg-good-strong",
  warn: "bg-warn-strong",
  bad: "bg-bad-strong",
  info: "bg-info-strong",
};

const STATUS_TEXT: Record<CheckStatus, string> = {
  good: "Looks good",
  warn: "Worth a look",
  bad: "Fix before sending",
  info: "Suggestion",
};

export default function LetterCheck({
  items,
  coverage,
}: {
  items: CheckItem[];
  coverage: CoverLetterDraft["coverage"];
}) {
  const good = items.filter((i) => i.status === "good").length;

  return (
    <section className="border-t border-leather-100 px-6 py-5" aria-label="Letter check">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">Letter check</h3>
        <span className="text-xs text-leather-500 tabular-nums">
          {good} of {items.length} look good
        </span>
      </div>
      <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2.5 text-[13px] leading-snug">
            <span aria-hidden className={`mt-[5px] size-2 shrink-0 rounded-full ${DOT[item.status]}`} />
            <span className="min-w-0">
              <span className="sr-only">{STATUS_TEXT[item.status]}: </span>
              <span className="text-leather-800">{item.label}</span>
              {item.detail && <span className="block text-xs text-leather-500 mt-0.5">{item.detail}</span>}
            </span>
          </li>
        ))}
      </ul>

      {coverage.length > 0 && (
        <div className="mt-6">
          <h3 className="eyebrow">What this draft argues</h3>
          <p className="text-xs text-leather-500 mt-1">
            The requirements it claims you meet, and the evidence it uses. Check each one is true.
          </p>
          <ul className="mt-3 divide-y divide-leather-100 rounded-lg border border-leather-100">
            {coverage.map((c, i) => (
              <li key={i} className="grid gap-x-4 gap-y-0.5 px-3.5 py-2.5 text-[13px] sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <span className="font-medium text-leather-800">{c.requirement}</span>
                <span className="text-leather-600">{c.evidence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
