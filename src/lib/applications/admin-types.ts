export type SubmissionStatus = "pending" | "approved" | "rejected" | "suspended";

export type SubmissionDocument = {
  /** application_documents.id (null while the document has not been uploaded). */
  id: string | null;
  key: string;
  label: string;
  required: boolean;
  status: "uploaded" | "missing";
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  meta: string;
};

export type Submission = {
  id: string;
  reference: string;
  initials: string;
  business: string;
  category: string;
  owner: string;
  location: string;
  email: string;
  phone: string;
  plan: string;
  submittedAt: string;
  reviewedAt: string | null;
  status: SubmissionStatus;
  idType: string;
  documents: SubmissionDocument[];
  note?: string[];
  /** When the account was approved or rejected (null while pending). */
  decidedAt: string | null;
  /** Rejected accounts are history only: their documents and login were deleted. */
  archived?: boolean;
  /** Earlier rejections recorded for this email (from rejected_accounts). */
  previousRejections?: { rejectedAt: string; reason: string }[];
};

export type TenantAccess = "active" | "suspended";

export type Tenant = {
  id: string;
  name: string;
  reference: string;
  owner: string;
  email: string;
  nextBilling: string | null;
  planCode: string;
  plan: string;
  price: number;
  access: TenantAccess;
};

export type PlanSummary = {
  code: string;
  name: string;
  price: number;
};

export type Tier = {
  id: string;
  eyebrow: string;
  name: string;
  price: number;
  staffLimit: number | null;
  locationLimit: number | null;
  features: string[];
  subscribed: number;
};

export type ActivityCategory = "verification" | "account" | "pricing";

export type ActivityEvent = {
  id: string;
  title: string;
  business: string;
  actor: string;
  action: string;
  category: ActivityCategory;
  createdAt: string;
  before: string;
  after: string;
  reason: string;
};
