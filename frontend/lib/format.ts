// Display helpers. Money is shown in Indian digit grouping (10,00,000), per the project assumptions.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

export function formatINR(value: number | null | undefined): string {
  return typeof value === "number" ? inr.format(value) : "—";
}

// 1,50,00,000 becomes "₹1.5Cr": useful in tight KPI cards.
export function formatINRCompact(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  // Number(x.toFixed(2)) rounds to 2 decimals and drops trailing zeros (1.50 -> 1.5, 10.00 -> 10).
  if (value >= 1e7) return `₹${Number((value / 1e7).toFixed(2))}Cr`;
  if (value >= 1e5) return `₹${Number((value / 1e5).toFixed(2))}L`;
  return `₹${compact.format(value)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  // Dates are stored as UTC midnight, so format in UTC to avoid showing the previous day.
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDaysLeft(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  if (days > 1) return `in ${days} days`;
  if (days === -1) return "1 day ago";
  return `${Math.abs(days)} days ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  analyst: "Analyst",
  viewer: "Viewer",
};
