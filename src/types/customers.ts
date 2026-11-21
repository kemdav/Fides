export type CustomerAccountType = "registered" | "walk_in";

export type CustomerInviteDisplayStatus =
  | "registered"
  | "invite_not_sent"
  | "invite_sent"
  | "invite_expired";

export type CustomerInviteRecordStatus =
  | "pending"
  | "accepted"
  | "canceled"
  | "superseded"
  | "expired";

export type CustomerFilterOption =
  | "all"
  | "registered"
  | "walk_in"
  | "invite_sent"
  | "invite_not_sent"
  | "invite_expired"
  | "archived";

export interface CustomerRegistryItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  marketingOptIn: boolean;
  accountType: CustomerAccountType;
  inviteStatus: CustomerInviteDisplayStatus;
  archivedAt: string | null;
  notesCount: number;
  lastVisitAt: string | null;
  totalVisits: number;
  lifetimeSpendCents: number;
  createdAt: string;
}

export interface CustomerRegistryStats {
  totalCustomers: number;
  newThisMonth: number;
  returningPercentage: number;
  invitesPending: number;
}

export interface MerchantWorkspaceContext {
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

export interface CustomerRegistryWorkspaceData {
  meta: MerchantWorkspaceContext;
  stats: CustomerRegistryStats;
  customers: CustomerRegistryItem[];
}

export interface CustomerInvitationItem {
  id: string;
  email: string;
  status: CustomerInviteRecordStatus;
  effectiveStatus: CustomerInviteRecordStatus;
  sentAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  canceledAt: string | null;
  invitedByName: string | null;
}

export interface CustomerNoteItem {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export interface CustomerVisitItem {
  id: string;
  visitDate: string;
  serviceName: string;
  staffName: string;
  appointmentStatus: string;
  amountCents: number;
  paymentStatus: "paid" | "unpaid" | "pending" | "refunded" | "voided" | "failed";
}

export interface CustomerProfileDetail {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  marketingOptIn: boolean;
  accountType: CustomerAccountType;
  inviteStatus: CustomerInviteDisplayStatus;
  archivedAt: string | null;
  lastVisitAt: string | null;
  totalVisits: number;
  lifetimeSpendCents: number;
  activeInvite: CustomerInvitationItem | null;
  invitations: CustomerInvitationItem[];
  notes: CustomerNoteItem[];
  visits: CustomerVisitItem[];
}

export interface CustomerProfileWorkspaceData {
  meta: MerchantWorkspaceContext;
  customer: CustomerProfileDetail;
}

export interface CreateCustomerInput {
  fullName: string;
  email: string;
  phone: string;
  birthday: string;
  marketingOptIn: boolean;
  sendInvite: boolean;
}

export interface UpdateCustomerInput {
  fullName: string;
  email: string;
  phone: string;
  birthday: string;
  marketingOptIn: boolean;
}

export interface CustomerInvitePreview {
  valid: boolean;
  reason?: "invalid" | "expired" | "canceled" | "already_registered";
  businessName?: string;
  tenantSlug?: string;
  customerName?: string;
  email?: string;
  expiresAt?: string;
}