export function fitScoreColor(score: number): string {
  if (score >= 70) return "text-good-fg bg-good-bg";
  if (score >= 40) return "text-warn-fg bg-warn-bg";
  return "text-bad-fg bg-bad-bg";
}

/** Ink-only variant for large numbers that sit on their own surface. */
export function fitScoreInk(score: number): string {
  if (score >= 70) return "text-good-fg";
  if (score >= 40) return "text-warn-fg";
  return "text-bad-fg";
}

export default function FitScoreBadge({
  score,
  size = "sm",
}: {
  score: number | null;
  size?: "sm" | "lg";
}) {
  if (score === null) {
    return <span className="chip bg-leather-100 text-leather-500 font-normal">No score</span>;
  }
  const sizeClass = size === "lg" ? "text-sm px-3.5 py-1.5" : "";
  return (
    <span
      className={`chip tabular-nums ${sizeClass} ${fitScoreColor(score)}`}
      title="Fit score: aggregate similarity between the job description and your experience bank"
    >
      {Math.round(score)}% fit
    </span>
  );
}
