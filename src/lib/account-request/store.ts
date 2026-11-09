import { getMailer } from "@/lib/mail/mailer";
import { publicEnv, requireServerEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
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

function generateReferenceCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
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

export function validateSlugAvailability(
  rawSlug: string,
  excludeRequestId?: string
): SlugValidationResult {
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

  // Note: For client-side validation, we don't check database here.
  // The actual availability check happens server-side on submit.
  // We could add an API call here, but for now we return available=true
  // and let the server validate on actual submission.

  return {
    slug: rawSlug,
    normalizedSlug: normalized,
    available: true,
    reason: `Available — ${previewHost} can be reserved for your business.`,
    previewHost,
    suggestions: [],
  };
}

export async function listAccountRequests(filters?: {
  status?: TenantStatus | "all";
  search?: string;
}): Promise<{
  requests: AccountRequestRecord[];
  counts: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    archived: number;
  };
  recentEmails: DispatchedEmailRecord[];
}> {
  const admin = getAdminClient();
  if (!admin) {
    // Fallback to empty data if no admin client
    return {
      requests: [],
      counts: { total: 0, pending: 0, active: 0, suspended: 0, archived: 0 },
      recentEmails: [],
    };
  }

  let query = admin
    .from("account_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.search && filters.search.trim() !== "") {
    const q = filters.search.trim();
    query = query.or(`business_name.ilike.%${q}%,slug.ilike.%${q}%,owner_name.ilike.%${q}%,owner_email.ilike.%${q}%,reference_code.ilike.%${q}%`);
  }

  const { data: requests, error } = await query;

  if (error) {
    console.error("Error fetching account requests:", error);
    return {
      requests: [],
      counts: { total: 0, pending: 0, active: 0, suspended: 0, archived: 0 },
      recentEmails: [],
    };
  }

  const all = requests || [];
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
        r.business_name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.owner_name.toLowerCase().includes(q) ||
        r.owner_email.toLowerCase().includes(q) ||
        r.reference_code.toLowerCase().includes(q)
    );
  }

  return {
    requests: filtered.map(mapAccountRequest),
    counts,
    recentEmails: [], // Emails not stored in DB for now
  };
}

function mapAccountRequest(r: any): AccountRequestRecord {
  return {
    id: r.id,
    referenceCode: r.reference_code,
    businessName: r.business_name,
    category: r.category,
    slug: r.slug,
    status: r.status,
    ownerName: r.owner_name,
    ownerEmail: r.owner_email,
    phone: r.phone,
    address: r.address,
    estimatedStaff: r.estimated_staff,
    licenseOrTaxId: r.license_or_tax_id || "",
    notes: r.notes || "",
    reviewerNotes: r.reviewer_notes,
    reviewedBy: r.reviewed_by,
    resetToken: r.reset_token,
    resetRequestedAt: r.reset_requested_at,
    revisionCount: r.revision_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getActiveTenants(): Promise<AccountRequestRecord[]> {
  const admin = getAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("account_requests")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching active tenants:", error);
    return [];
  }

  return (data || []).map(mapAccountRequest);
}

export async function createAccountRequest(
  input: AccountRequestInput
): Promise<{
  record: AccountRequestRecord;
  emailDispatched: DispatchedEmailRecord;
}> {
  const admin = getAdminClient();
  if (!admin) {
    throw new Error("Database connection not available.");
  }

  // Validate slug on server side
  const slugCheck = validateSlugAvailability(input.slug);
  if (!slugCheck.available) {
    throw new Error(slugCheck.reason);
  }

  // Double-check against database
  const { data: existingSlug } = await admin
    .from("account_requests")
    .select("id")
    .eq("slug", slugCheck.normalizedSlug)
    .neq("status", "archived")
    .maybeSingle();

  if (existingSlug) {
    throw new Error(`Subdomain "${slugCheck.normalizedSlug}" is already taken.`);
  }

  const now = new Date().toISOString();
  const referenceCode = generateReferenceCode();
  const activationToken = generateShortToken("ACT");

  const { data: record, error } = await admin
    .from("account_requests")
    .insert({
      reference_code: referenceCode,
      business_name: input.businessName,
      category: input.category,
      slug: slugCheck.normalizedSlug,
      status: "pending",
      owner_name: input.ownerName,
      owner_email: input.ownerEmail.toLowerCase(),
      phone: input.phone,
      address: input.address,
      estimated_staff: input.estimatedStaff,
      license_or_tax_id: input.licenseOrTaxId || "PENDING-REVIEW",
      notes: input.notes || "",
      reviewer_notes: null,
      reviewed_by: null,
      reset_token: activationToken,
      reset_requested_at: null,
      revision_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating account request:", error);
    throw new Error("Failed to create account request.");
  }

  const mappedRecord = mapAccountRequest(record);

  const subject = `[Fides] Account Request Received — ${referenceCode}`;
  const summary = `Thank you, ${mappedRecord.ownerName}. Your request for ${mappedRecord.businessName} (${mappedRecord.slug}.${publicEnv.platformDomain || "fides.app"}) is queued for Fides Admin review. Reference: ${referenceCode}.`;

  await getMailer().send({
    to: { name: mappedRecord.ownerName, address: mappedRecord.ownerEmail },
    subject,
    text: `${summary}\nActivation/Tracking Token: ${activationToken}`,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: mappedRecord.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(referenceCode)}`,
    referenceCode,
    token: activationToken,
    sentAt: now,
  };

  return { record: mappedRecord, emailDispatched: emailLog };
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
  const admin = getAdminClient();
  if (!admin) {
    throw new Error("Database connection not available.");
  }

  const { data: existing } = await admin
    .from("account_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    throw new Error("Account request not found.");
  }

  const now = new Date().toISOString();
  const mappedStatus = status === "active" ? "active" : status === "suspended" ? "suspended" : "archived";

  const { data: record, error } = await admin
    .from("account_requests")
    .update({
      status: mappedStatus,
      reviewer_notes:
        reviewerNotes.trim() ||
        (mappedStatus === "active"
          ? "Verified and approved by Fides Platform Administration."
          : mappedStatus === "suspended"
            ? "Additional verification required. Please review notes and reset your request."
            : "Updated by platform administrator."),
      reviewed_by: reviewedBy,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating account request:", error);
    throw new Error("Failed to update account request.");
  }

  const mappedRecord = mapAccountRequest(record);

  // If approved, create tenant and user account
  if (mappedStatus === "active") {
    await createTenantAndUser(mappedRecord);
  }

  const subject =
    mappedStatus === "active"
      ? `[Fides] Approved — ${mappedRecord.businessName} (${mappedRecord.slug}.fides.app) is Active`
      : mappedStatus === "suspended"
        ? `[Fides] Action Required on Account Request ${mappedRecord.referenceCode}`
        : `[Fides] Status Update for ${mappedRecord.referenceCode} (${mappedStatus})`;

  const summary =
    mappedStatus === "active"
      ? `Congratulations ${mappedRecord.ownerName}! ${mappedRecord.businessName} is now active on ${mappedRecord.slug}.${publicEnv.platformDomain || "fides.app"}.`
      : `Your account request ${mappedRecord.referenceCode} for ${mappedRecord.businessName} was marked as "${mappedStatus}". Reviewer note: ${mappedRecord.reviewer_notes}`;

  await getMailer().send({
    to: { name: mappedRecord.ownerName, address: mappedRecord.ownerEmail },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: mappedRecord.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(mappedRecord.referenceCode)}`,
    referenceCode: mappedRecord.referenceCode,
    token: mappedRecord.resetToken ?? undefined,
    sentAt: now,
  };

  return { record: mappedRecord, emailDispatched: emailLog };
}

async function createTenantAndUser(record: AccountRequestRecord) {
  const admin = getAdminClient();
  if (!admin) return;

  // Create tenant
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: record.businessName,
      slug: record.slug,
      status: "active",
      address: record.address,
      phone: record.phone,
      timezone: "Asia/Manila",
    })
    .select()
    .single();

  if (tenantError) {
    console.error("Error creating tenant:", tenantError);
    return;
  }

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: record.ownerEmail,
    password: record.resetToken || "TempPass123!", // Use reset token as temp password
    email_confirm: true,
    user_metadata: {
      full_name: record.ownerName,
      role: "owner",
      tenant_id: tenant.id,
    },
  });

  if (authError) {
    console.error("Error creating auth user:", authError);
    return;
  }

  // Create profile
  const { error: profileError } = await admin
    .from("profiles")
    .insert({
      id: authData.user.id,
      email: record.ownerEmail,
      full_name: record.ownerName,
      role: "owner",
      tenant_id: tenant.id,
    });

  if (profileError) {
    console.error("Error creating profile:", profileError);
  }

  // Create tenant membership
  const { error: membershipError } = await admin
    .from("tenant_memberships")
    .insert({
      tenant_id: tenant.id,
      profile_id: authData.user.id,
      role: "owner",
    });

  if (membershipError) {
    console.error("Error creating tenant membership:", membershipError);
  }
}

export function lookupApplicationByIdentifier(
  identifier: string
): AccountRequestRecord | null {
  // This is a synchronous function used by client components
  // For server-side lookups, use the API route
  return null;
}

export async function resendApplicationActivation(requestId: string): Promise<{
  record: AccountRequestRecord;
  emailDispatched: DispatchedEmailRecord;
}> {
  const admin = getAdminClient();
  if (!admin) {
    throw new Error("Database connection not available.");
  }

  const { data: existing } = await admin
    .from("account_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!existing) {
    throw new Error("Account request record not found.");
  }

  const now = new Date().toISOString();
  const newToken = generateShortToken("ACT");

  const { data: record, error } = await admin
    .from("account_requests")
    .update({
      reset_token: newToken,
      reset_requested_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error resending activation:", error);
    throw new Error("Failed to resend activation.");
  }

  const mappedRecord = mapAccountRequest(record);

  const subject = `[Fides] Resent Activation & Verification Link — ${mappedRecord.referenceCode}`;
  const summary = `A fresh verification/activation token (${newToken}) was issued for ${mappedRecord.businessName} (${mappedRecord.slug}.fides.app).`;

  await getMailer().send({
    to: { name: mappedRecord.ownerName, address: mappedRecord.ownerEmail },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: mappedRecord.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(mappedRecord.referenceCode)}`,
    referenceCode: mappedRecord.referenceCode,
    token: newToken,
    sentAt: now,
  };

  return { record: mappedRecord, emailDispatched: emailLog };
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
  const admin = getAdminClient();
  if (!admin) {
    throw new Error("Database connection not available.");
  }

  const { data: existing } = await admin
    .from("account_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!existing) {
    throw new Error("Account request not found.");
  }

  const slugValidation = validateSlugAvailability(updates.slug, requestId);
  if (!slugValidation.available) {
    throw new Error(slugValidation.reason);
  }

  // Double-check against database
  const { data: existingSlug } = await admin
    .from("account_requests")
    .select("id")
    .eq("slug", slugValidation.normalizedSlug)
    .neq("id", requestId)
    .neq("status", "archived")
    .maybeSingle();

  if (existingSlug) {
    throw new Error(`Subdomain "${slugValidation.normalizedSlug}" is already taken.`);
  }

  const now = new Date().toISOString();
  const newToken = generateShortToken("RST");

  const { data: record, error } = await admin
    .from("account_requests")
    .update({
      business_name: updates.businessName,
      category: updates.category,
      slug: slugValidation.normalizedSlug,
      owner_name: updates.ownerName,
      owner_email: updates.ownerEmail.toLowerCase(),
      phone: updates.phone,
      address: updates.address,
      estimated_staff: updates.estimatedStaff,
      notes: updates.notes || "",
      status: "pending",
      reviewer_notes: `Application reset and revised by applicant (Revision #${(existing.revision_count || 0) + 1}). Ready for re-verification.`,
      reset_token: newToken,
      reset_requested_at: now,
      revision_count: (existing.revision_count || 0) + 1,
      updated_at: now,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error resetting application:", error);
    throw new Error("Failed to reset application.");
  }

  const mappedRecord = mapAccountRequest(record);

  const subject = `[Fides] Account Request Reset & Revised — ${mappedRecord.referenceCode}`;
  const summary = `Your revised application for ${mappedRecord.businessName} (${mappedRecord.slug}.fides.app) has been reset to Pending Review (Revision #${mappedRecord.revisionCount}).`;

  await getMailer().send({
    to: { name: mappedRecord.ownerName, address: mappedRecord.ownerEmail },
    subject,
    text: summary,
  });

  const emailLog: DispatchedEmailRecord = {
    id: crypto.randomUUID(),
    to: mappedRecord.ownerEmail,
    subject,
    summary,
    actionUrl: `/reset-request?ref=${encodeURIComponent(mappedRecord.referenceCode)}`,
    referenceCode: mappedRecord.referenceCode,
    token: newToken,
    sentAt: now,
  };

  return { record: mappedRecord, emailDispatched: emailLog };
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
  // This is a complex function that would need to query auth.users and profiles
  // For now, throw an error indicating it needs implementation
  throw new Error("Password reset not yet implemented for Supabase Auth.");
}

export async function completeAccountPasswordReset(params: {
  email: string;
  resetToken: string;
  newPassword: string;
}): Promise<Omit<PlatformAccount, "passwordHash">> {
  throw new Error("Password reset not yet implemented for Supabase Auth.");
}

export async function listPlatformAccounts(tenantSlug?: string): Promise<
  Array<Omit<PlatformAccount, "passwordHash">>
> {
  const admin = getAdminClient();
  if (!admin) return [];

  let query = admin.from("profiles").select(`
    *,
    tenant:tenants(name, slug)
  `);

  if (tenantSlug) {
    const { data: tenant } = await admin.from("tenants").select("id").eq("slug", tenantSlug).single();
    if (tenant) {
      query = query.eq("tenant_id", tenant.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching platform accounts:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    email: p.email || "",
    fullName: p.full_name || "",
    role: p.role,
    scope: p.tenant_id ? "client_owner" : "fides_admin",
    tenantId: p.tenant_id,
    tenantSlug: p.tenant?.slug || null,
    tenantName: p.tenant?.name || null,
    status: "active",
    createdAt: p.created_at,
  }));
}