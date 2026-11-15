// Shapes of what the API returns. Kept in one place so a backend change is a one-file fix here.

export type Role = "admin" | "manager" | "analyst" | "viewer";

export interface User {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Organization {
  _id: string;
  name: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type ContractStatus = "draft" | "active" | "expiring" | "expired" | "terminated";

export interface Contract {
  _id: string;
  vendorId: string;
  vendor: { _id: string; name: string; category: string; status: string } | null;
  title: string;
  contractNumber?: string;
  status: "draft" | "active" | "terminated" | "expired";
  effectiveStatus: ContractStatus;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  nextRenewalDate: string;
  noticePeriodDays: number;
  noticeDeadline: string;
  daysToExpiry: number;
  daysToNoticeDeadline: number;
  totalValue: number;
  annualValue?: number;
  documentCount?: number;
  pricingModel?: PricingModel;
  paymentTerms?: PaymentTerms;
  notes?: string;
  documents?: ContractDocument[];
  terminatedAt?: string;
  autoRenew: boolean;
}

export type PricingModel = "fixed" | "subscription" | "per_seat" | "usage_based" | "milestone";
export type PaymentTerms = "advance" | "net_15" | "net_30" | "net_45" | "net_60" | "net_90" | "milestone_based";

export interface ContractDocument {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export type VendorCategory =
  | "software"
  | "cloud_infrastructure"
  | "security"
  | "hardware"
  | "professional_services"
  | "telecom"
  | "marketing"
  | "other";
export type VendorStatus = "active" | "inactive" | "prospect";

export interface VendorContact {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface Vendor {
  _id: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  website?: string;
  contacts: VendorContact[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Only on list responses:
  activeContracts?: number;
  activeAnnualValue?: number;
}

/** A contract as listed on a vendor's detail page (stored status, not the computed one). */
export interface VendorContractRow {
  _id: string;
  title: string;
  contractNumber?: string;
  status: "draft" | "active" | "terminated" | "expired";
  startDate: string;
  endDate: string;
  annualValue?: number;
  totalValue: number;
}

export interface DashboardRenewal {
  _id: string;
  title: string;
  vendorName: string;
  endDate: string;
  daysToExpiry: number;
  noticeDeadline: string;
  daysToNoticeDeadline: number;
  annualValue: number;
  autoRenew: boolean;
}

export interface DashboardSummary {
  asOf: string;
  expiringWindowDays: number;
  kpis: {
    activeVendors: number;
    totalVendors: number;
    activeContracts: number;
    expiringContracts: number;
    annualCommitment: number;
    noticeAlerts: number;
  };
  statusCounts: Record<ContractStatus, number>;
  spendByCategory: { category: VendorCategory; annualValue: number; contracts: number }[];
  upcomingRenewals: DashboardRenewal[];
  recentActivity: { _id: string; action: string; entityType: string; summary: string; userName: string; createdAt: string }[];
}
