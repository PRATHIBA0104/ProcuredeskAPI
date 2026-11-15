import type { ReactNode } from "react";

type Tone = "green" | "amber" | "red" | "slate" | "blue" | "teal";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  teal: "bg-teal-50 text-teal-800 ring-teal-700/20",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

// Status wording and colour are decided here once, so every screen shows a status the same way.
export function contractStatusTone(status: string): Tone {
  switch (status) {
    case "active":
      return "green";
    case "expiring":
      return "amber";
    case "expired":
    case "terminated":
      return "red";
    case "draft":
      return "slate";
    default:
      return "slate";
  }
}

export function vendorStatusTone(status: string): Tone {
  return status === "active" ? "green" : status === "prospect" ? "blue" : "slate";
}
