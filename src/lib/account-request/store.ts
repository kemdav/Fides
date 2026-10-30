import { getMailer } from "@/lib/mail/mailer";
import { publicEnv } from "@/lib/env";
import { RESERVED_SUBDOMAINS } from "@/lib/tenant/constants";

import {
  type AccountRequestInput,
  type AccountRequestRecord,
  type AuthScope,
  type BusinessCategory,
  type DispatchedEmailRecord,
  type PlatformAccount,
  type SlugValidationResult,
  type TenantStatus,
  SLUG_REGEX,
  normalizeSlugInput,
  getCategoryLabel,
} from "./schema";

export { getCategoryLabel, type SlugValidationResult };

function sanitizeAccount(
  account: PlatformAccount
): Omit<PlatformAccount, "passwordHash"> {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    scope: account.scope,
    clientSubrole: account.clientSubrole,
    tenantId: account.tenantId,
    tenantSlug: account.tenantSlug,
    tenantName: account.tenantName,
    status: account.status,
    resetToken: account.resetToken,
    createdAt: account.createdAt,
  };
}

interface GlobalFidesStore {
  requests: AccountRequestRecord[];
  accounts: PlatformAccount[];
  emails: DispatchedEmailRecord[];
}

const globalForFides = globalThis as unknown as {
  __fidesOnboardingStore?: GlobalFidesStore;
};

function generateReferenceCode(num?: number): string {
  const digits = num ?? Math.floor(1000 + Math.random() * 9000);
  return `REQ-2026-${digits}`;
}

function generateShortToken(prefix = "RST"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

function createInitialStore(): GlobalFidesStore {
  const requests: AccountRequestRecord[] = [
    {
      id: "b19f3d21-6c40-4c9a-9f88-100000000001",
      referenceCode: "REQ-2026-1042",
      businessName: "Apex Dental Clinic",
      category: "dental",
      slug: "apexdental",
      status: "active",
      ownerName: "Dr. Elena Rostova",
      ownerEmail: "elena@apexdental.ph",
      phone: "+63 2 8812 4400",
      address: "Unit 402, One Ayala Medical Tower, Makati City",
      estimatedStaff: "6-15",
      licenseOrTaxId: "DOH-2026-DNT-4410",
      notes: "Full-service general dentistry, prosthodontics, and pediatric dental chairs.",
      reviewerNotes: "Verified PRC clinic registration and business permit. Subdomain active.",
      reviewedBy: "admin@fides.app",
      resetToken: null,
      resetRequestedAt: null,
      revisionCount: 0,
      createdAt: "2026-10-14T08:30:00.000Z",
      updatedAt: "2026-10-15T10:15:00.000Z",
    },
    {
      id: "b19f3d21-6c40-4c9a-9f88-100000000002",
      referenceCode: "REQ-2026-1089",
      businessName: "Lumina Orthodontics & Oral Surgery",
      category: "dental",
      slug: "luminaortho",
      status: "active",
      ownerName: "Dr. Marco Santos",
      ownerEmail: "marco@luminaortho.ph",
      phone: "+63 2 8705 1190",
      address: "High Street South Corporate Plaza, BGC, Taguig",
      estimatedStaff: "16-50",
      licenseOrTaxId: "DOH-2026-ORT-8821",
      notes: "Multi-chair orthodontic studio requiring 3D scan booking slots and walk-in triage.",
      reviewerNotes: "Approved after credential review. Active on luminaortho.fides.app.",
      reviewedBy: "admin@fides.app",
      resetToken: null,
      resetRequestedAt: null,
      revisionCount: 0,
      createdAt: "2026-10-16T09:10:00.000Z",
      updatedAt: "2026-10-17T14:20:00.000Z",
    },
    {
      id: "b19f3d21-6c40-4c9a-9f88-100000000003",
      referenceCode: "REQ-2026-4821",
      businessName: "BrightSmiles Family Dental",
      category: "dental",
      slug: "brightsmiles",
      status: "pending",
      ownerName: "Dr. Camille Reyes",
      ownerEmail: "camille@brightsmiles.ph",
      phone: "+63 917 550 2310",
      address: "312 Katipunan Ave, Loyola Heights, Quezon City",
      estimatedStaff: "6-15",
      licenseOrTaxId: "DOH-2026-DNT-7719",
      notes: "Requesting onboarding for 4 dental chairs and automated SMS/email patient reminders.",
      reviewerNotes: null,
      reviewedBy: null,
      resetToken: "ACT-7K9P2M",
      resetRequestedAt: null,
      revisionCount: 0,
      createdAt: "2026-10-21T11:45:00.000Z",
      updatedAt: "2026-10-21T11:45:00.000Z",
    },
    {
      id: "b19f3d21-6c40-4c9a-9f88-100000000004",
      referenceCode: "REQ-2026-5104",
      businessName: "Veritas Diagnostic & Medical Clinic",
      category: "medical",
      slug: "veritasmedical",
      status: "pending",
      ownerName: "Dr. Julian Chua",
      ownerEmail: "julian@veritasmedical.ph",
      phone: "+63 918 402 9912",
      address: "Cebu IT Park, Lahug, Cebu City",
      estimatedStaff: "16-50",
      licenseOrTaxId: "DOH-2026-MED-3012",
      notes: "Outpatient consultations and laboratory diagnostics scheduling.",
      reviewerNotes: null,
      reviewedBy: null,
      resetToken: "ACT-4M8Q1X",
      resetRequestedAt: null,
      revisionCount: 0,
      createdAt: "2026-10-22T01:15:00.000Z",
      updatedAt: "2026-10-22T01:15:00.000Z",
    },
    {
      id: "b19f3d21-6c40-4c9a-9f88-100000000005",
      referenceCode: "REQ-2026-3910",
      businessName: "Metro Care Dental Center",
      category: "dental",
      slug: "metrocaredental",
      status: "suspended",
      ownerName: "Dr. Ramon Bautista",
      ownerEmail: "ramon@metrocaredental.ph",
      phone: "+63 917 889 0011",
      address: "Emerald Ave, Ortigas Center, Pasig City",
      estimatedStaff: "1-5",
      licenseOrTaxId: "PENDING-VERIFICATION",
      notes: "Dental prophylaxis, root canal therapy, and cosmetic veneers.",
      reviewerNotes:
        "Clinic license number was incomplete. Use Reset Account Request (CPG-62) to update your registration details and resubmit.",
      reviewedBy: "admin@fides.app",
      resetToken: "RST-9N2V5K",
      resetRequestedAt: "2026-10-20T16:00:00.000Z",
      revisionCount: 1,
      createdAt: "2026-10-19T13:20:00.000Z",
      updatedAt: "2026-10-20T16:00:00.000Z",
    },
  ];

  const accounts: PlatformAccount[] = [
    {
      id: "acc-owner-apexdental",
      email: "elena@apexdental.ph",
      fullName: "Dr. Elena Rostova",
      passwordHash: "ClinicOwner2026!",
      role: "owner",
      scope: "client_owner",
      tenantId: "b19f3d21-6c40-4c9a-9f88-100000000001",
      tenantSlug: "apexdental",
      tenantName: "Apex Dental Clinic",
      status: "active",
      resetToken: null,
      createdAt: "2026-10-15T10:15:00.000Z",
    },
    {
      id: "acc-owner-luminaortho",
      email: "marco@luminaortho.ph",
      fullName: "Dr. Marco Santos",
      passwordHash: "ClinicOwner2026!",
      role: "owner",
      scope: "client_owner",
      tenantId: "b19f3d21-6c40-4c9a-9f88-100000000002",
      tenantSlug: "luminaortho",
      tenantName: "Lumina Orthodontics & Oral Surgery",
      status: "active",
      resetToken: null,
      createdAt: "2026-10-17T14:20:00.000Z",
    },
    {
      id: "acc-user-sofia",
      email: "sofia.cruz@apexdental.ph",
      fullName: "Sofia Cruz (Lead Receptionist)",
      passwordHash: "ClinicStaff2026!",
      role: "receptionist",
      scope: "client_user",
      clientSubrole: "receptionist",
      tenantId: "b19f3d21-6c40-4c9a-9f88-100000000001",
      tenantSlug: "apexdental",
      tenantName: "Apex Dental Clinic",
      status: "active",
      resetToken: null,
      createdAt: "2026-10-16T08:00:00.000Z",
    },
    {
      id: "acc-user-dr-lim",
      email: "dr.miguel@apexdental.ph",
      fullName: "Dr. Miguel Lim (Associate Dentist)",
      passwordHash: "ClinicStaff2026!",
      role: "staff",
      scope: "client_user",
      clientSubrole: "staff",
      tenantId: "b19f3d21-6c40-4c9a-9f88-100000000001",
      tenantSlug: "apexdental",
      tenantName: "Apex Dental Clinic",
      status: "active",
      resetToken: null,
      createdAt: "2026-10-16T09:30:00.000Z",
    },
    {
      id: "acc-user-patient-juan",
      email: "juan.delacruz@patient.ph",
      fullName: "Juan Dela Cruz (Dental Patient)",
      passwordHash: "PatientPass2026!",
      role: "staff",
      scope: "client_user",
      clientSubrole: "patient",
      tenantId: "b19f3d21-6c40-4c9a-9f88-100000000001",
      tenantSlug: "apexdental",
      tenantName: "Apex Dental Clinic",
      status: "active",
      resetToken: null,
      createdAt: "2026-10-18T11:00:00.000Z",
    },
    {
      id: "acc-fides-admin",
      email: "admin@fides.app",
      fullName: "Fides Platform Administrator",
      passwordHash: "FidesAdmin2026!",
      role: "admin",
      scope: "fides_admin",
      tenantId: null,
      tenantSlug: null,
      tenantName: "Fides Platform Operations",
      status: "active",
      resetToken: null,
      createdAt: "2026-10-01T00:00:00.000Z",
    },
  ];

  const emails: DispatchedEmailRecord[] = [
    {
      id: "mail-1",
      to: "camille@brightsmiles.ph",
      subject: "[Fides] Account Request Received — REQ-2026-4821",
      summary:
        "Your onboarding request for BrightSmiles Family Dental (brightsmiles.fides.app) has been received and queued for Fides Admin verification.",
      actionUrl: "/reset-request?ref=REQ-2026-4821",
      referenceCode: "REQ-2026-4821",
      token: "ACT-7K9P2M",
      sentAt: "2026-10-21T11:45:02.000Z",
    },
  ];

  return { requests, accounts, emails };
}

function getStore(): GlobalFidesStore {
  if (!globalForFides.__fidesOnboardingStore) {
    globalForFides.__fidesOnboardingStore = createInitialStore();
  }
  return globalForFides.__fidesOnboardingStore;
}

export function validateSlugAvailability(
  rawSlug: string,
  excludeRequestId?: string
): SlugValidationResult {
  const store = getStore();
  const normalized = normalizeSlugInput(rawSlug);
  const domain = publicEnv.platformDomain || "fides.app";
  const previewHost = `${normalized || "yourclinic"}.${domain}`;

  if (!normalized || normalized.length < 3) {
    return {
      slug: rawSlug,
      normalizedSlug: normalized,
      available: false,
      reason: "Subdomain must be at least 3 lowercase characters.",
      previewHost,
      suggestions: [],
    };
  }

  if (!SLUG_REGEX.test(normalized)) {
    return {
      slug: rawSlug,
      normalizedSlug: normalized,
      available: false,
      reason: "Only lowercase letters, numbers, and interior hyphens are permitted.",
      previewHost,
      suggestions: [],
    };
  }

  if (RESERVED_SUBDOMAINS.has(normalized)) {
    const suggestions = [`${normalized}clinic`, `${normalized}dental`, `my${normalized}`];
    return {
      slug: rawSlug,
      normalizedSlug: normalized,
      available: false,
      reason: `"${normalized}" is a reserved Fides platform subdomain.`,
      previewHost,
      suggestions,
    };
  }

  const collision = store.requests.find(
    (req) =>
      req.slug === normalized &&
      req.id !== excludeRequestId &&
      req.status !== "archived"
  );

  if (collision) {
    const suggestions = [
      `${normalized}ph`,
      `${normalized}clinic`,
      `${normalized}-care`,
    ].filter(
      (candidate) =>
        !store.requests.some((r) => r.slug === candidate) &&
        !RESERVED_SUBDOMAINS.has(candidate)
    );

    return {
      slug: rawSlug,
      normalizedSlug: normalized,
      available: false,
      reason:
        collision.status === "active"
          ? `Already claimed by active tenant "${collision.businessName}".`
          : `Currently reserved by a pending request (${collision.referenceCode}).`,
      previewHost,
      suggestions,
    };
  }

  return {
    slug: rawSlug,
    normalizedSlug: normalized,
    available: true,
    reason: `Available — ${previewHost} can be reserved for your business.`,
    previewHost,
    suggestions: [],
  };
}

export function listAccountRequests(filters?: {
  status?: TenantStatus | "all";
  search?: string;
}): {
  requests: AccountRequestRecord[];
  counts: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    archived: number;
  };
  recentEmails: DispatchedEmailRecord[];
} {
  const store = getStore();
  const all = [...store.requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const counts = {
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    active: all.filter((r) => r.status === "active").length,
    suspended: all.filter((r) => r.status === "suspended").length,
    archived: all.filter((r) => r.status === "archived").length,
  };

  let filtered = all;
  if (filters?.status && filters.status !== "all") {
    filtered = filtered.filter((r) => r.status === filters.status);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.businessName.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.ownerEmail.toLowerCase().includes(q) ||
        r.referenceCode.toLowerCase().includes(q)
    );
  }

  return {
    requests: filtered,
    counts,
    recentEmails: store.emails.slice(0, 8),
  };
}

export function getActiveTenants(): AccountRequestRecord[] {
  const store = getStore();
  return store.requests.filter((r) => r.status === "active");
}

export async function createAccountRequest(
  input: AccountRequestInput
): Promise<{
  record: AccountRequestRecord;
  emailDispatched: DispatchedEmailRecord;
}> {
  const store = getStore();
  const slugCheck = validateSlugAvailability(input.slug);
  if (!slugCheck.available) {
    throw new Error(slugCheck.reason);
  }

  const now = new Date().toISOString();
  const referenceCode = generateReferenceCode();
  const activationToken = generateShortToken("ACT");

  const record: AccountRequestRecord = {
    id: crypto.randomUUID(),
    referenceCode,
    businessName: input.businessName,
    category: input.category,
    slug: slugCheck.normalizedSlug,
    status: "pending",
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail.toLowerCase(),
    phone: input.phone,
    address: input.address,
    estimatedStaff: input.estimatedStaff,
    licenseOrTaxId: input.licenseOrTaxId || "PENDING-REVIEW",
    notes: input.notes || "",
    reviewerNotes: null,
    reviewedBy: null,
    resetToken: activationToken,
    resetRequestedAt: null,
    revisionCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  store.requests.unshift(record);

  const subject = `[Fides] Account Request Received — ${referenceCode}`;
  const summary = `Thank you, ${record.ownerName}. Your request for ${record.businessName} (${record.slug}.${publicEnv.platformDomain || "fides.app"}) is queued for Fides Admin review. Reference: ${referenceCode}.`;

  await getMailer().send({
    to: { name: record.ownerName, address: record.ownerEmail },
    subject,
    text: `${summary}\nActivation/Tracking Token: ${activationToken}`,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: record.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(referenceCode)}`,
    referenceCode,
    token: activationToken,
    sentAt: now,
  };
  store.emails.unshift(emailLog);

  return { record, emailDispatched: emailLog };
}

export async function updateAccountRequestStatus(
  id: string,
  status: TenantStatus,
  reviewerNotes: string,
  reviewedBy = "admin@fides.app"
): Promise<{
  record: AccountRequestRecord;
  emailDispatched: DispatchedEmailRecord;
}> {
  const store = getStore();
  const target = store.requests.find((r) => r.id === id);
  if (!target) {
    throw new Error("Account request not found.");
  }

  const now = new Date().toISOString();
  target.status = status;
  target.reviewerNotes =
    reviewerNotes.trim() ||
    (status === "active"
      ? "Verified and approved by Fides Platform Administration."
      : status === "suspended"
        ? "Additional verification required. Please review notes and reset your request."
        : "Updated by platform administrator.");
  target.reviewedBy = reviewedBy;
  target.updatedAt = now;

  const subject =
    status === "active"
      ? `[Fides] Approved — ${target.businessName} (${target.slug}.fides.app) is Active`
      : status === "suspended"
        ? `[Fides] Action Required on Account Request ${target.referenceCode}`
        : `[Fides] Status Update for ${target.referenceCode} (${status})`;

  const summary =
    status === "active"
      ? `Congratulations ${target.ownerName}! ${target.businessName} is now active on ${target.slug}.${publicEnv.platformDomain || "fides.app"}.`
      : `Your account request ${target.referenceCode} for ${target.businessName} was marked as "${status}". Reviewer note: ${target.reviewerNotes}`;

  await getMailer().send({
    to: { name: target.ownerName, address: target.ownerEmail },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: target.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(target.referenceCode)}`,
    referenceCode: target.referenceCode,
    token: target.resetToken ?? undefined,
    sentAt: now,
  };
  store.emails.unshift(emailLog);

  return { record: target, emailDispatched: emailLog };
}

export function lookupApplicationByIdentifier(
  identifier: string
): AccountRequestRecord | null {
  const store = getStore();
  const normalized = identifier.trim().toLowerCase();
  return (
    store.requests.find(
      (r) =>
        r.referenceCode.toLowerCase() === normalized ||
        r.ownerEmail.toLowerCase() === normalized ||
        r.slug.toLowerCase() === normalized
    ) ?? null
  );
}

export async function resendApplicationActivation(requestId: string): Promise<{
  record: AccountRequestRecord;
  emailDispatched: DispatchedEmailRecord;
}> {
  const store = getStore();
  const target = store.requests.find((r) => r.id === requestId);
  if (!target) {
    throw new Error("Account request record not found.");
  }

  const now = new Date().toISOString();
  const newToken = generateShortToken("ACT");
  target.resetToken = newToken;
  target.resetRequestedAt = now;
  target.updatedAt = now;

  const subject = `[Fides] Resent Activation & Verification Link — ${target.referenceCode}`;
  const summary = `A fresh verification/activation token (${newToken}) was issued for ${target.businessName} (${target.slug}.fides.app).`;

  await getMailer().send({
    to: { name: target.ownerName, address: target.ownerEmail },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: target.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(target.referenceCode)}`,
    referenceCode: target.referenceCode,
    token: newToken,
    sentAt: now,
  };
  store.emails.unshift(emailLog);

  return { record: target, emailDispatched: emailLog };
}

export async function resetAndReviseApplication(
  requestId: string,
  updates: {
    businessName: string;
    category: BusinessCategory;
    slug: string;
    ownerName: string;
    ownerEmail: string;
    phone: string;
    address: string;
    estimatedStaff: "1-5" | "6-15" | "16-50" | "50+";
    notes?: string;
  }
): Promise<{
  record: AccountRequestRecord;
  emailDispatched: DispatchedEmailRecord;
}> {
  const store = getStore();
  const target = store.requests.find((r) => r.id === requestId);
  if (!target) {
    throw new Error("Account request not found.");
  }

  const slugValidation = validateSlugAvailability(updates.slug, target.id);
  if (!slugValidation.available) {
    throw new Error(slugValidation.reason);
  }

  const now = new Date().toISOString();
  const newToken = generateShortToken("RST");

  target.businessName = updates.businessName;
  target.category = updates.category;
  target.slug = slugValidation.normalizedSlug;
  target.ownerName = updates.ownerName;
  target.ownerEmail = updates.ownerEmail.toLowerCase();
  target.phone = updates.phone;
  target.address = updates.address;
  target.estimatedStaff = updates.estimatedStaff;
  if (updates.notes !== undefined) {
    target.notes = updates.notes;
  }
  target.status = "pending";
  target.reviewerNotes = `Application reset and revised by applicant (Revision #${target.revisionCount + 1}). Ready for re-verification.`;
  target.resetToken = newToken;
  target.resetRequestedAt = now;
  target.revisionCount += 1;
  target.updatedAt = now;

  const subject = `[Fides] Account Request Reset & Revised — ${target.referenceCode}`;
  const summary = `Your revised application for ${target.businessName} (${target.slug}.fides.app) has been reset to Pending Review (Revision #${target.revisionCount}).`;

  await getMailer().send({
    to: { name: target.ownerName, address: target.ownerEmail },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: target.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(target.referenceCode)}`,
    referenceCode: target.referenceCode,
    token: newToken,
    sentAt: now,
  };
  store.emails.unshift(emailLog);

  return { record: target, emailDispatched: emailLog };
}

export async function requestAccountPasswordReset(params: {
  email: string;
  scope: AuthScope;
  tenantSlug?: string;
}): Promise<{
  account: Omit<PlatformAccount, "passwordHash">;
  resetToken: string;
  emailDispatched: DispatchedEmailRecord;
}> {
  const store = getStore();
  const normalizedEmail = params.email.trim().toLowerCase();

  const account = store.accounts.find((acc) => {
    const emailMatch = acc.email.toLowerCase() === normalizedEmail;
    const scopeMatch = acc.scope === params.scope;
    const tenantMatch =
      params.scope === "fides_admin" ||
      !params.tenantSlug ||
      acc.tenantSlug === params.tenantSlug;
    return emailMatch && scopeMatch && tenantMatch;
  });

  if (!account) {
    throw new Error(
      `No matching ${
        params.scope === "client_owner"
          ? "Client Business Owner"
          : params.scope === "client_user"
            ? "Clinic Staff / Client User"
            : "Fides Platform Admin"
      } account found for "${params.email}".`
    );
  }

  const now = new Date().toISOString();
  const resetToken = generateShortToken("PWD");
  account.resetToken = resetToken;
  account.status = "pending_reset";

  const subject = `[Fides] Reset Account Credentials — Token ${resetToken}`;
  const summary = `Password reset requested for ${account.fullName} (${account.email}) under ${account.tenantName ?? "Fides Platform"}. Use recovery token: ${resetToken}`;

  await getMailer().send({
    to: { name: account.fullName, address: account.email },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: account.email,
    subject,
    summary,
    actionUrl: `/reset-request?mode=password&email=${encodeURIComponent(account.email)}&token=${encodeURIComponent(resetToken)}`,
    token: resetToken,
    sentAt: now,
  };
  store.emails.unshift(emailLog);

  return {
    account: sanitizeAccount(account),
    resetToken,
    emailDispatched: emailLog,
  };
}

export async function completeAccountPasswordReset(params: {
  email: string;
  resetToken: string;
  newPassword: string;
}): Promise<Omit<PlatformAccount, "passwordHash">> {
  const store = getStore();
  const normalizedEmail = params.email.trim().toLowerCase();
  const normalizedToken = params.resetToken.trim().toUpperCase();

  const account = store.accounts.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail
  );

  if (!account) {
    throw new Error(`No account found for ${params.email}.`);
  }

  if (
    account.resetToken &&
    account.resetToken.toUpperCase() !== normalizedToken
  ) {
    throw new Error(
      `Invalid recovery token "${params.resetToken}". Expected "${account.resetToken}".`
    );
  }

  account.passwordHash = params.newPassword;
  account.status = "active";
  account.resetToken = null;

  return sanitizeAccount(account);
}

export function listPlatformAccounts(tenantSlug?: string): Array<
  Omit<PlatformAccount, "passwordHash">
> {
  const store = getStore();
  const filtered = tenantSlug
    ? store.accounts.filter((a) => a.tenantSlug === tenantSlug)
    : store.accounts;
  return filtered.map(sanitizeAccount);
}
