"use client";

import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
  interview: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
  rejected: "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300",
  offer: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
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
      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-50 ${STATUS_STYLES[value]}`}
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}
