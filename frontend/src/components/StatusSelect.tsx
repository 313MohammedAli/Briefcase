"use client";

import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-leather-100 text-leather-800",
  interview: "bg-info-bg text-info-fg",
  rejected: "bg-bad-bg text-bad-fg",
  offer: "bg-good-bg text-good-fg",
};

/** Solid colour for bars and dots, paired with STATUS_STYLES. */
export const STATUS_STRONG: Record<ApplicationStatus, string> = {
  applied: "bg-leather-400",
  interview: "bg-info-strong",
  rejected: "bg-bad-strong",
  offer: "bg-good-strong",
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
};

export default function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: ApplicationStatus;
  onChange: (status: ApplicationStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ApplicationStatus)}
      onClick={(e) => e.stopPropagation()}
      className={`chip border-0 pr-6 cursor-pointer disabled:opacity-50 ${STATUS_STYLES[value]}`}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
