import type { ContractStatus, PaymentTerms, PricingModel } from "@/types";

export const PRICING_LABEL: Record<PricingModel, string> = {
  fixed: "Fixed price",
  subscription: "Subscription",
  per_seat: "Per seat",
  usage_based: "Usage based",
  milestone: "Milestone",
};
export const PAYMENT_LABEL: Record<PaymentTerms, string> = {
  advance: "Advance",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  net_90: "Net 90",
  milestone_based: "Milestone based",
};
export const PRICING_MODELS = Object.keys(PRICING_LABEL) as PricingModel[];
export const PAYMENT_TERMS = Object.keys(PAYMENT_LABEL) as PaymentTerms[];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Draft",
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  terminated: "Terminated",
};

// Mirrors the server's rule so vendor pages can show the status that is true today.
export function effectiveStatus(stored: string, endDate: string): ContractStatus {
  if (stored !== "active") return stored as ContractStatus;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end < now) return "expired";
  if (end <= now + 90 * 86400000) return "expiring";
  return "active";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
