export function fitScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950";
  if (score >= 40) return "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950";
  return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950";
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
      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-500">
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
