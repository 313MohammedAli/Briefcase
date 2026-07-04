export function fitScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-700 bg-emerald-50";
  if (score >= 40) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export default function FitScoreBadge({
  score,
  size = "sm",
}: {
  score: number | null;
  size?: "sm" | "lg";
}) {
  if (score === null) {
    return (
      <span className="rounded-full bg-leather-100 px-2.5 py-0.5 text-xs text-leather-500">
        no score
      </span>
    );
  }
  const sizeClass = size === "lg" ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`rounded-full font-medium ${sizeClass} ${fitScoreColor(score)}`}
      title="Fit score: aggregate similarity between the job description and your experience bank"
    >
      {Math.round(score)}% fit
    </span>
  );
}
