"use client";

import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-leather-100 text-leather-800",
  interview: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  offer: "bg-emerald-50 text-emerald-700",
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
