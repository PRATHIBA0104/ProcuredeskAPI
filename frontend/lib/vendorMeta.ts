import type { VendorCategory, VendorStatus } from "@/types";

export const CATEGORY_LABEL: Record<VendorCategory, string> = {
  software: "Software",
  cloud_infrastructure: "Cloud infrastructure",
  security: "Security",
  hardware: "Hardware",
  professional_services: "Professional services",
  telecom: "Telecom",
  marketing: "Marketing",
  other: "Other",
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as VendorCategory[];

export const STATUS_LABEL: Record<VendorStatus, string> = { active: "Active", inactive: "Inactive", prospect: "Prospect" };
