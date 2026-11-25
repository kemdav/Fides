export type SubscriptionTierCode = "basic" | "business" | "enterprise";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type InvoiceStatus = "paid" | "unpaid" | "overdue" | "void";

export type InvoiceKind = "renewal" | "activation" | "reactivation" | "plan_change";

export type PaymentSubmissionStatus =
  | "pending_verification"
  | "verified"
  | "rejected";

export interface SubscriptionTierOption {
  id: string;
  code: SubscriptionTierCode;
  name: string;
  priceCents: number;
  billingInterval: "month" | "year";
  sortOrder: number;
  limits: {
    staffAccounts: number;
    branches: number;
    appointmentsPerMonth: number;
  };
  features: {
    bookingWebsite: boolean;
    appointmentManagement: boolean;
    customerRegistry: boolean;
    customDomainQr: boolean;
    reportsCommissions: boolean;
    multipleBranches: boolean;
  };
}

export interface IncludedFeatureItem {
  key: string;
  title: string;
  description: string;
}

export interface SubscriptionUsageMetrics {
  activeStaffCount: number;
  pendingInvitationsCount: number;
  totalStaffSeatsUsed: number;
  branchesCount: number;
  appointmentsThisPeriod: number;
}

export interface TenantBillingProfile {
  tenantId: string;
  billingName: string;
  billingEmail: string;
  ccEmail: string;
  sameAsBusinessEmail: boolean;
  streetBarangay: string;
  city: string;
  province: string;
  postalCode: string;
  tin: string;
  branchCode: string;
  updatedAt: string | null;
}

export interface BusinessContactDefaults {
  businessName: string;
  businessEmail: string;
  streetBarangay: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface SubscriptionPaymentSubmission {
  id: string;
  invoiceId: string;
  bankTransferReference: string;
  transferDate: string;
  amountCents: number;
  receiptStoragePath: string | null;
  receiptFileName: string | null;
  status: PaymentSubmissionStatus;
  submittedAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  invoiceKind: InvoiceKind;
  tierName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  amountPaidCents: number;
  balanceDueCents: number;
  status: InvoiceStatus;
  billedToName: string;
  billedToAddress: string;
  billedToTin: string | null;
  billedToBranch: string | null;
  billedToEmail: string;
  latestPaymentSubmission: SubscriptionPaymentSubmission | null;
}

export interface TenantSubscriptionSummary {
  id: string;
  tenantId: string;
  tierId: string;
  tierCode: SubscriptionTierCode;
  tierName: string;
  priceCents: number;
  billingInterval: "month" | "year";
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  scheduledTierId: string | null;
  scheduledTierCode: SubscriptionTierCode | null;
  scheduledTierName: string | null;
  scheduledTierPriceCents: number | null;
  scheduledChangeEffectiveAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  trialConversionScheduled: boolean;
  reactivationRequestedAt: string | null;
  addOnBranches: number;
  renewalRemindersEnabled: boolean;
  renewalReminderDays: number[];
}

export interface SubscriptionWorkspaceData {
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  timezone: string;
  userName: string;
  userEmail: string;
  userRoleLabel: string;
  canEdit: boolean;
  subscription: TenantSubscriptionSummary;
  tiers: SubscriptionTierOption[];
  usage: SubscriptionUsageMetrics;
  billingProfile: TenantBillingProfile;
  businessDefaults: BusinessContactDefaults;
  invoices: SubscriptionInvoice[];
}

export const SUPPLIER_BILLING_INFO = {
  legalName: "Fides Platform, Inc. · Sample supplier",
  shortName: "Fides Platform, Inc.",
  address: "123 Platform Avenue, Cebu City 6000, Philippines (sample)",
  tin: "000-000-000-000 (sample)",
  bankName: "Sample Bank · Fides Platform, Inc.",
  accountMask: "•••• 6789 (sample)",
} as const;

export const FEATURE_CATALOG: {
  key: keyof SubscriptionTierOption["features"];
  title: string;
  description: string;
}[] = [
  {
    key: "bookingWebsite",
    title: "Booking website",
    description: "Let customers book online.",
  },
  {
    key: "appointmentManagement",
    title: "Appointment management",
    description: "Organize bookings and schedules.",
  },
  {
    key: "customerRegistry",
    title: "Customer registry",
    description: "Keep profiles and visit history.",
  },
  {
    key: "customDomainQr",
    title: "Custom domain & QR",
    description: "Connect your domain and check in.",
  },
  {
    key: "reportsCommissions",
    title: "Reports & commissions",
    description: "Track revenue and staff earnings.",
  },
  {
    key: "multipleBranches",
    title: "Multiple branches",
    description: "Operate up to 3 business locations.",
  },
];