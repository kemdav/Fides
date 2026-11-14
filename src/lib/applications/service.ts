import "server-only";
import { nextBillingDate } from "@/lib/billing";
import { isMailConfigured } from "@/lib/mail/mailer";
import { sendApprovalEmail, sendBillingReminderEmail, sendRejectionEmail, sendSubmissionEmail } from "@/lib/mail/emails";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import {
  ALL_DOCUMENTS,
  DOCUMENT_BUCKET,
  FILE_LIMITS,
  GOVERNMENT_ID_SLOT,
  ID_TYPES,
  REQUIRED_DOCUMENT_KEYS,
  type DocumentKey,
} from "@/lib/registration/options";
import { registrationSchema, type RegistrationInput } from "@/lib/registration/schema";
import type { ActivityEvent } from "@/lib/admin/activity";
import type { PlanSummary, Tenant } from "@/lib/admin/tenants";
import type { Tier } from "@/lib/admin/tiers";
import type { Submission, SubmissionDocument, SubmissionStatus } from "@/lib/admin/verification";
import type {
  AccountApplicationRow,
  ActivityCategory,
  ApplicationBusinessRow,
  ApplicationDocumentRow,
  ApplicationIdentityRow,
  SubscriptionPlanRow,
} from "@/types/database.types";

const ACTOR = "Platform administrator";
const LOGO_BUCKET = "business-logos";

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new ServiceError(error?.message ? `${fallback} (${error.message})` : fallback, 500);
}

async function logActivity(
  admin: AdminClient,
  entry: {
    applicationId: string | null;
    business: string;
    action: string;
    category: ActivityCategory;
    before: string;
    after: string;
    reason: string;
    actor?: string;
  }
) {
  await admin.from("admin_activity_log").insert({
    application_id: entry.applicationId,
    business_name: entry.business,
    actor: entry.actor ?? ACTOR,
    action: entry.action,
    category: entry.category,
    before_value: entry.before,
    after_value: entry.after,
    reason: entry.reason,
  });
}

export type DocumentUploads = Partial<Record<DocumentKey, File>>;

type PreparedDocument = {
  key: DocumentKey;
  file: File;
  bytes: Buffer;
  mime: "application/pdf" | "image/jpeg" | "image/png";
  extension: "pdf" | "jpg" | "png";
};

/** Identify the real file type from its first bytes (never trust the browser's MIME type alone). */
function sniffDocument(bytes: Buffer): Pick<PreparedDocument, "mime" | "extension"> | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", extension: "pdf" };
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  return null;
}

async function prepareDocuments(documents: DocumentUploads): Promise<PreparedDocument[]> {
  const prepared: PreparedDocument[] = [];
  for (const key of REQUIRED_DOCUMENT_KEYS) {
    const title = ALL_DOCUMENTS.find((doc) => doc.key === key)?.title ?? key;
    const file = documents[key];
    if (!file || file.size === 0) throw new ServiceError(`${title} is required. Please upload this document.`, 400);
    if (file.size > FILE_LIMITS.documentBytes) {
      throw new ServiceError(`${title} must be ${Math.round(FILE_LIMITS.documentBytes / (1024 * 1024))} MB or smaller.`, 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const kind = sniffDocument(bytes);
    if (!kind) throw new ServiceError(`${title} must be a PDF, JPG or PNG file.`, 400);
    prepared.push({ key, file, bytes, ...kind });
  }
  return prepared;
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\\/]/g, "_").trim();
  return (cleaned || "document").slice(0, 180);
}

export async function submitApplication(
  raw: unknown,
  logo: File | null,
  documents: DocumentUploads
): Promise<{ referenceCode: string }> {
  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ServiceError(parsed.error.issues[0]?.message ?? "Invalid application details.", 400);
  }
  const data: RegistrationInput = parsed.data;

  if (logo) {
    if (!(FILE_LIMITS.logoTypes as readonly string[]).includes(logo.type)) {
      throw new ServiceError("The business logo must be a JPG, PNG, or WebP image.", 400);
    }
    if (logo.size > FILE_LIMITS.logoBytes) {
      throw new ServiceError("The business logo must be 2 MB or smaller.", 400);
    }
  }

  // Every document is required. Validate them all before anything is created.
  const preparedDocuments = await prepareDocuments(documents);

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("code, is_active")
    .eq("code", data.planCode)
    .maybeSingle();
  if (!plan || !plan.is_active) throw new ServiceError("The selected subscription package is not available.", 400);

  const { data: existing } = await admin
    .from("account_applications")
    .select("id")
    .ilike("email", data.email.replace(/[%_]/g, "\\$&"))
    .maybeSingle();
  if (existing) throw new ServiceError("An account with this email address already exists.", 409);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
    app_metadata: { role: "owner" },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      throw new ServiceError("An account with this email address already exists.", 409);
    }
    throw new ServiceError("We could not create your account. Please try again.", 500);
  }

  const userId = created.user.id;
  let logoPath: string | null = null;
  const uploadedDocumentPaths: string[] = [];

  try {
    const now = new Date().toISOString();
    const { data: application, error: applicationError } = await admin
      .from("account_applications")
      .insert({
        user_id: userId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        status: "pending",
        plan_code: data.planCode,
        terms_accepted_at: now,
        consent_accepted_at: now,
      })
      .select("id, reference_code")
      .single();
    if (applicationError || !application) fail(applicationError, "Could not save the application");

    // Documents: one private object per document type, inside this applicant's own folder.
    const documentRows: Omit<ApplicationDocumentRow, "id" | "created_at" | "updated_at">[] = [];
    for (const doc of preparedDocuments) {
      const path = `${application.id}/${doc.key}.${doc.extension}`;
      const { error: uploadError } = await admin.storage
        .from(DOCUMENT_BUCKET)
        .upload(path, doc.bytes, { contentType: doc.mime, upsert: true });
      if (uploadError) fail(uploadError, `Could not upload ${ALL_DOCUMENTS.find((item) => item.key === doc.key)?.title ?? doc.key}`);
      uploadedDocumentPaths.push(path);
      documentRows.push({
        application_id: application.id,
        user_id: userId,
        document_type: doc.key,
        file_name: safeFileName(doc.file.name),
        storage_path: path,
        mime_type: doc.mime,
        size_bytes: doc.bytes.length,
      });
    }

    const { count: previousRejections } = await admin
      .from("rejected_accounts")
      .select("id", { count: "exact", head: true })
      .ilike("email", data.email.replace(/[%_]/g, "\\$&"));

    const governmentIdPath = documentRows.find((row) => row.document_type === GOVERNMENT_ID_SLOT.key)?.storage_path ?? null;

    const { error: identityError } = await admin.from("application_identities").insert({
      application_id: application.id,
      owner_legal_name: data.ownerLegalName,
      date_of_birth: data.dateOfBirth,
      id_type: data.idType,
      id_document_path: governmentIdPath,
    });
    if (identityError) fail(identityError, "Could not save the identity details");

    let logoUrl: string | null = null;
    if (logo) {
      const extension = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
      logoPath = `${application.id}/logo.${extension}`;
      const { error: uploadError } = await admin.storage
        .from(LOGO_BUCKET)
        .upload(logoPath, Buffer.from(await logo.arrayBuffer()), { contentType: logo.type, upsert: true });
      if (uploadError) fail(uploadError, "Could not upload the business logo");
      logoUrl = admin.storage.from(LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl;
    }

    const { error: businessError } = await admin.from("application_businesses").insert({
      application_id: application.id,
      business_name: data.businessName,
      business_type: data.businessType,
      established_year: Number(data.establishedYear),
      street_address: data.streetAddress,
      city: data.city,
      province: data.province,
      zip_code: data.zipCode,
      logo_path: logoPath,
      logo_url: logoUrl,
    });
    if (businessError) fail(businessError, "Could not save the business details");

    const { error: documentsError } = await admin.from("application_documents").insert(documentRows);
    if (documentsError) fail(documentsError, "Could not save the uploaded documents");

    await logActivity(admin, {
      applicationId: application.id,
      business: data.businessName,
      action: "Application submitted",
      category: "verification",
      before: "None",
      after: "Pending",
      reason: `${data.fullName} submitted a new account application with ${documentRows.length} documents.${
        previousRejections ? ` This email was rejected ${previousRejections} time${previousRejections === 1 ? "" : "s"} before.` : ""
      }`,
      actor: data.fullName,
    });

    // Everything is saved: confirm by email. A mail failure must never undo a valid submission.
    try {
      await sendSubmissionEmail({
        to: data.email,
        ownerName: data.ownerLegalName,
        businessName: data.businessName,
        referenceCode: application.reference_code,
      });
    } catch (mailError) {
      console.error("Submission confirmation email failed:", mailError instanceof Error ? mailError.message : mailError);
    }

    return { referenceCode: application.reference_code };
  } catch (error) {
    if (logoPath) await admin.storage.from(LOGO_BUCKET).remove([logoPath]);
    if (uploadedDocumentPaths.length) await admin.storage.from(DOCUMENT_BUCKET).remove(uploadedDocumentPaths);
    await admin.auth.admin.deleteUser(userId);
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("We could not submit your application. Please try again.", 500);
  }
}

type Joined = {
  app: AccountApplicationRow;
  identity: ApplicationIdentityRow | undefined;
  business: ApplicationBusinessRow | undefined;
};

async function loadJoined(admin: AdminClient): Promise<Joined[]> {
  const [apps, identities, businesses] = await Promise.all([
    admin.from("account_applications").select("*").order("submitted_at", { ascending: true }),
    admin.from("application_identities").select("*"),
    admin.from("application_businesses").select("*"),
  ]);
  if (apps.error) fail(apps.error, "Could not load applications");
  const identityMap = new Map((identities.data ?? []).map((row) => [row.application_id, row]));
  const businessMap = new Map((businesses.data ?? []).map((row) => [row.application_id, row]));
  return (apps.data ?? []).map((app) => ({
    app,
    identity: identityMap.get(app.id),
    business: businessMap.get(app.id),
  }));
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

async function loadPlans(admin: AdminClient): Promise<SubscriptionPlanRow[]> {
  const { data, error } = await admin.from("subscription_plans").select("*").order("sort_order").order("price_php");
  if (error) fail(error, "Could not load subscription plans");
  return data ?? [];
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime: string | null): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg") return "JPG";
  return "File";
}

/** One entry per required document, in display order, flagged as uploaded or missing. */
function buildDocumentList(rows: ApplicationDocumentRow[]): SubmissionDocument[] {
  const byType = new Map(rows.map((row) => [row.document_type, row]));
  const list: SubmissionDocument[] = ALL_DOCUMENTS.map((doc) => {
    const row = byType.get(doc.key);
    const uploaded = !!row?.storage_path;
    return {
      id: row?.id ?? null,
      key: doc.key,
      label: doc.title,
      required: doc.required,
      status: uploaded ? "uploaded" : "missing",
      fileName: row?.file_name ?? null,
      mimeType: row?.mime_type ?? null,
      sizeBytes: row?.size_bytes ?? null,
      uploadedAt: row?.created_at ?? null,
      meta: uploaded ? `${formatSize(row?.size_bytes ?? null)} · ${mimeLabel(row?.mime_type ?? null)}` : "Not uploaded",
    };
  });
  // Rows with a type that is no longer in the catalog are still shown, never hidden.
  for (const row of rows) {
    if (ALL_DOCUMENTS.some((doc) => doc.key === row.document_type)) continue;
    list.push({
      id: row.id,
      key: row.document_type,
      label: row.document_type,
      required: false,
      status: row.storage_path ? "uploaded" : "missing",
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      uploadedAt: row.created_at,
      meta: `${formatSize(row.size_bytes)} · ${mimeLabel(row.mime_type)}`,
    });
  }
  return list;
}

export type AdminSnapshot = {
  now: string;
  submissions: Submission[];
  tenants: Tenant[];
  tiers: Tier[];
  plans: PlanSummary[];
  activity: ActivityEvent[];
  mailConfigured: boolean;
};

export async function loadAdminSnapshot(): Promise<AdminSnapshot> {
  const admin = createAdminClient();
  const now = new Date();
  const [joined, planRows, activityRes, documentsRes, rejectedRes] = await Promise.all([
    loadJoined(admin),
    loadPlans(admin),
    admin.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(500),
    admin.from("application_documents").select("*"),
    admin.from("rejected_accounts").select("*").order("rejected_at", { ascending: false }),
  ]);
  const rejectedRows = rejectedRes.data ?? [];
  const rejectionsByEmail = new Map<string, { rejectedAt: string; reason: string }[]>();
  for (const row of rejectedRows) {
    const key = row.email.toLowerCase();
    const list = rejectionsByEmail.get(key) ?? [];
    list.push({ rejectedAt: row.rejected_at, reason: row.rejection_reason });
    rejectionsByEmail.set(key, list);
  }
  const documentsByApplication = new Map<string, ApplicationDocumentRow[]>();
  for (const row of documentsRes.data ?? []) {
    const list = documentsByApplication.get(row.application_id) ?? [];
    list.push(row);
    documentsByApplication.set(row.application_id, list);
  }
  const planMap = new Map(planRows.map((plan) => [plan.code, plan]));

  const submissions: Submission[] = joined.map(({ app, identity, business }) => ({
    id: app.id,
    reference: app.reference_code,
    initials: initialsOf(business?.business_name ?? app.full_name),
    business: business?.business_name ?? "Unnamed business",
    category: business?.business_type ?? "Service business",
    owner: identity?.owner_legal_name ?? app.full_name,
    location: business ? `${business.city}, ${business.province}` : "—",
    email: app.email,
    phone: app.phone,
    plan: planMap.get(app.plan_code)?.name ?? app.plan_code,
    submittedAt: app.submitted_at,
    reviewedAt: app.reviewed_at,
    status: app.status as SubmissionStatus,
    idType: ID_TYPES.find((item) => item.value === identity?.id_type)?.label ?? identity?.id_type ?? "—",
    documents: buildDocumentList(documentsByApplication.get(app.id) ?? []),
    note: app.review_notes ? [app.review_notes] : undefined,
    decidedAt: app.status === "pending" ? null : (app.decided_at ?? app.approved_at ?? app.reviewed_at),
    previousRejections: rejectionsByEmail.get(app.email.toLowerCase()),
  }));

  // Rejected accounts no longer have an application row (it was deleted): show them from the permanent record.
  const liveIds = new Set(joined.map(({ app }) => app.id));
  for (const row of rejectedRows) {
    if (row.application_id && liveIds.has(row.application_id)) continue;
    submissions.push({
      id: row.id,
      reference: row.reference_code ?? "—",
      initials: initialsOf(row.business_name ?? row.full_name),
      business: row.business_name ?? "Unnamed business",
      category: row.business_type ?? "Service business",
      owner: row.owner_legal_name ?? row.full_name,
      location: row.location ?? "—",
      email: row.email,
      phone: row.phone ?? "—",
      plan: (row.plan_code ? planMap.get(row.plan_code)?.name : null) ?? row.plan_code ?? "—",
      submittedAt: row.submitted_at ?? row.rejected_at,
      reviewedAt: row.rejected_at,
      status: "rejected",
      idType: "—",
      documents: [],
      note: [row.rejection_reason],
      decidedAt: row.rejected_at,
      archived: true,
    });
  }

  const tenants: Tenant[] = joined
    .filter(({ app }) => app.status === "approved" || app.status === "suspended")
    .map(({ app, identity, business }) => {
      const plan = planMap.get(app.plan_code);
      const next = nextBillingDate(app.approved_at, now);
      return {
        id: app.id,
        name: business?.business_name ?? "Unnamed business",
        reference: app.reference_code,
        owner: identity?.owner_legal_name ?? app.full_name,
        email: app.email,
        nextBilling: next ? next.toISOString() : null,
        planCode: app.plan_code,
        plan: plan?.name ?? app.plan_code,
        price: Number(plan?.price_php ?? 0),
        access: app.status === "suspended" ? "suspended" : "active",
      };
    });

  const counts = new Map<string, number>();
  for (const tenant of tenants) counts.set(tenant.planCode, (counts.get(tenant.planCode) ?? 0) + 1);

  const tiers: Tier[] = planRows
    .filter((plan) => plan.is_active)
    .map((plan) => ({
      id: plan.code,
      eyebrow: plan.eyebrow,
      name: plan.name,
      price: Number(plan.price_php),
      staffLimit: plan.staff_limit,
      locationLimit: plan.location_limit,
      features: plan.features,
      subscribed: counts.get(plan.code) ?? 0,
    }));

  const activity: ActivityEvent[] = (activityRes.data ?? []).map((row) => ({
    id: row.id,
    title: `${row.business_name} · ${row.action}`,
    business: row.business_name,
    actor: row.actor,
    action: row.action,
    category: row.category,
    createdAt: row.created_at,
    before: row.before_value || "—",
    after: row.after_value || "—",
    reason: row.reason || "No additional details recorded.",
  }));

  return {
    now: now.toISOString(),
    submissions,
    tenants,
    tiers,
    plans: tiers.map((tier) => ({ code: tier.id, name: tier.name, price: tier.price })),
    activity,
    mailConfigured: isMailConfigured(),
  };
}

async function getJoined(admin: AdminClient, id: string): Promise<Joined> {
  const { data: app, error } = await admin.from("account_applications").select("*").eq("id", id).maybeSingle();
  if (error) fail(error, "Could not load the application");
  if (!app) throw new ServiceError("This application no longer exists.", 404);
  const [identity, business] = await Promise.all([
    admin.from("application_identities").select("*").eq("application_id", id).maybeSingle(),
    admin.from("application_businesses").select("*").eq("application_id", id).maybeSingle(),
  ]);
  return { app, identity: identity.data ?? undefined, business: business.data ?? undefined };
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base.length >= 3 ? base : `business-${base}`.replace(/-$/, "");
}

async function uniqueSlug(admin: AdminClient, name: string): Promise<string> {
  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await admin.from("tenants").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type DecisionResult = { message: string; warning?: string };

export async function approveApplication(id: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { app, business } = await getJoined(admin, id);
  if (app.status !== "pending") throw new ServiceError("Only pending applications can be approved.", 409);
  if (!business) throw new ServiceError("This application has no business details.", 409);

  const slug = await uniqueSlug(admin, business.business_name);
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: business.business_name,
      slug,
      status: "active",
      logo_url: business.logo_url,
      address: `${business.street_address}, ${business.city}, ${business.province} ${business.zip_code}`,
      phone: app.phone,
      timezone: "Asia/Manila",
    })
    .select("id")
    .single();
  if (tenantError || !tenant) fail(tenantError, "Could not create the business account");

  const rollback = async () => {
    await admin.from("tenants").delete().eq("id", tenant.id);
  };

  const { error: profileError } = await admin.from("profiles").upsert({
    id: app.user_id,
    email: app.email,
    full_name: app.full_name,
    role: "owner",
    tenant_id: tenant.id,
  });
  if (profileError) {
    await rollback();
    fail(profileError, "Could not link the owner profile");
  }

  const { error: membershipError } = await admin
    .from("tenant_memberships")
    .upsert({ tenant_id: tenant.id, profile_id: app.user_id, role: "owner" });
  if (membershipError) {
    await rollback();
    fail(membershipError, "Could not create the owner membership");
  }

  await admin.from("tenant_settings").upsert({
    tenant_id: tenant.id,
    display_name: business.business_name,
    currency: "PHP",
    locale: "en-PH",
  });

  const timestamp = new Date().toISOString();
  const { error: updateError } = await admin
    .from("account_applications")
    .update({
      status: "approved",
      approved_at: timestamp,
      decided_at: timestamp,
      reviewed_at: timestamp,
      reviewed_by: ACTOR,
      review_notes: null,
      tenant_id: tenant.id,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (updateError) {
    await rollback();
    fail(updateError, "Could not record the approval");
  }

  await logActivity(admin, {
    applicationId: id,
    business: business.business_name,
    action: "Verification completed",
    category: "verification",
    before: "Pending",
    after: "Approved",
    reason: "Application reviewed and approved by the platform administrator.",
  });

  const message = `${business.business_name} has been approved.`;
  const email = await dispatchApprovalEmail(admin, id);
  return email.ok
    ? { message: `${message} An approval email was sent to ${app.email}.` }
    : { message, warning: `The approval email could not be sent to ${app.email}: ${email.error}` };

}

async function dispatchApprovalEmail(admin: AdminClient, id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { app, identity, business } = await getJoined(admin, id);
    const { data: plan } = await admin.from("subscription_plans").select("name, price_php").eq("code", app.plan_code).maybeSingle();
    await sendApprovalEmail({
      to: app.email,
      ownerName: identity?.owner_legal_name ?? app.full_name,
      businessName: business?.business_name ?? "your business",
      planName: plan?.name ?? app.plan_code,
      planPrice: Number(plan?.price_php ?? 0),
      referenceCode: app.reference_code,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown mail error." };
  }
}

export async function resendApprovalEmail(id: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { app } = await getJoined(admin, id);
  if (app.status !== "approved" && app.status !== "suspended") {
    throw new ServiceError("Only approved accounts can receive an approval email.", 409);
  }
  const result = await dispatchApprovalEmail(admin, id);
  if (!result.ok) throw new ServiceError(`The approval email could not be sent: ${result.error}`, 502);
  return { message: `The approval email was sent to ${app.email}.` };
}

/**
 * Reject a pending application: email the applicant the reason (with a link to register again),
 * then erase the account, documents and images so the same email/details can be submitted afresh.
 */
export async function rejectApplication(id: string, reason: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const joined = await getJoined(admin, id);
  const { app, identity, business } = joined;
  if (app.status !== "pending") throw new ServiceError("Only pending applications can be rejected.", 409);

  const name = business?.business_name ?? app.full_name;
  let mailError: string | null = null;
  try {
    await sendRejectionEmail({
      to: app.email,
      ownerName: identity?.owner_legal_name ?? app.full_name,
      businessName: name,
      reason,
    });
  } catch (error) {
    mailError = error instanceof Error ? error.message : "Unknown mail error.";
  }

  // Permanent record first: if this fails nothing is deleted, so no history is ever lost.
  const rejectedAt = new Date().toISOString();
  const { error: recordError } = await admin.from("rejected_accounts").upsert(
    {
      application_id: app.id,
      reference_code: app.reference_code,
      email: app.email,
      full_name: app.full_name,
      owner_legal_name: identity?.owner_legal_name ?? app.full_name,
      phone: app.phone,
      business_name: business?.business_name ?? null,
      business_type: business?.business_type ?? null,
      location: business ? `${business.city}, ${business.province}` : null,
      plan_code: app.plan_code,
      rejection_reason: reason,
      submitted_at: app.submitted_at,
      rejected_at: rejectedAt,
      rejected_by: ACTOR,
      email_sent: mailError === null,
    },
    { onConflict: "application_id" }
  );
  if (recordError) fail(recordError, "Could not save the rejection record. Nothing was deleted");

  await purgeApplication(admin, joined);
  await logActivity(admin, {
    applicationId: null,
    business: name,
    action: "Application rejected",
    category: "verification",
    before: "Pending",
    after: "Rejected and removed",
    reason: `${reason} — ${mailError ? "rejection email failed to send" : `rejection email sent to ${app.email}`}; all submitted data was deleted.`,
  });

  const message = `${name} was rejected and all submitted data was removed.`;
  return mailError
    ? { message, warning: `The rejection email could not be sent to ${app.email}: ${mailError}` }
    : { message: `${message} A rejection email with a link to register again was sent to ${app.email}.` };
}

/** Remove every file stored under `<folder>/` in a bucket (handles more than one page of results). */
async function emptyFolder(admin: AdminClient, bucket: string, folder: string) {
  for (let round = 0; round < 10; round++) {
    const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
    if (!data?.length) return;
    const { error } = await admin.storage.from(bucket).remove(data.map((file) => `${folder}/${file.name}`));
    if (error) fail(error, "Could not remove the uploaded files");
  }
}

/**
 * Permanently erase everything tied to an application: uploaded documents and logo images,
 * the business tenant, every related row, and the login itself, so the email can be registered again.
 */
async function purgeApplication(admin: AdminClient, { app }: Joined) {
  const id = app.id;

  // Files: by recorded path and by folder, so nothing is left behind.
  const { data: docRows } = await admin.from("application_documents").select("storage_path").eq("application_id", id);
  const documentPaths = (docRows ?? []).map((row) => row.storage_path).filter((path): path is string => Boolean(path));
  if (documentPaths.length) await admin.storage.from(DOCUMENT_BUCKET).remove(documentPaths);
  await emptyFolder(admin, DOCUMENT_BUCKET, id);
  await emptyFolder(admin, LOGO_BUCKET, id);

  if (app.tenant_id) await admin.from("tenants").delete().eq("id", app.tenant_id);

  // Related rows (most also cascade from the login, but do not rely on it).
  await admin.from("application_documents").delete().eq("application_id", id);
  await admin.from("application_identities").delete().eq("application_id", id);
  await admin.from("application_businesses").delete().eq("application_id", id);
  await admin.from("password_reset_codes").delete().eq("user_id", app.user_id);
  await admin.from("tenant_memberships").delete().eq("profile_id", app.user_id);
  await admin.from("profiles").delete().eq("id", app.user_id);

  // The login must go, otherwise the email stays "taken".
  const { error } = await admin.auth.admin.deleteUser(app.user_id);
  if (error && !/not.?found/i.test(error.message)) fail(error, "Could not delete the account login");

  const { error: applicationError } = await admin.from("account_applications").delete().eq("id", id);
  if (applicationError) fail(applicationError, "Could not delete the application record");

  const { data: leftover } = await admin.from("account_applications").select("id").eq("id", id).maybeSingle();
  if (leftover) throw new ServiceError("The account could not be fully removed. Please try again.", 500);
}

export type AccountDirectoryEntry = { id: string; email: string; business: string; owner: string; status: SubmissionStatus };

/** Every account (any status), for the Settings delete picker. */
export async function listAccountDirectory(): Promise<AccountDirectoryEntry[]> {
  const admin = createAdminClient();
  const joined = await loadJoined(admin);
  return joined
    .map(({ app, identity, business }) => ({
      id: app.id,
      email: app.email,
      business: business?.business_name ?? "Unnamed business",
      owner: identity?.owner_legal_name ?? app.full_name,
      status: app.status as SubmissionStatus,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export type PendingSummary = {
  count: number;
  items: { id: string; business: string; owner: string; plan: string; submittedAt: string }[];
};

/** Light query for the notification bell: accounts waiting for review, newest first. */
export async function loadPendingSummary(): Promise<PendingSummary> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_applications")
    .select("id, full_name, plan_code, submitted_at")
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });
  if (error) fail(error, "Could not load pending applications");
  const rows = data ?? [];
  const ids = rows.slice(0, 5).map((row) => row.id);
  const [businesses, identities, plans] = await Promise.all([
    ids.length ? admin.from("application_businesses").select("application_id, business_name").in("application_id", ids) : { data: [] },
    ids.length ? admin.from("application_identities").select("application_id, owner_legal_name").in("application_id", ids) : { data: [] },
    admin.from("subscription_plans").select("code, name"),
  ]);
  const businessMap = new Map((businesses.data ?? []).map((row) => [row.application_id, row.business_name]));
  const identityMap = new Map((identities.data ?? []).map((row) => [row.application_id, row.owner_legal_name]));
  const planMap = new Map((plans.data ?? []).map((row) => [row.code, row.name]));
  return {
    count: rows.length,
    items: rows.slice(0, 5).map((row) => ({
      id: row.id,
      business: businessMap.get(row.id) ?? "Unnamed business",
      owner: identityMap.get(row.id) ?? row.full_name,
      plan: planMap.get(row.plan_code) ?? row.plan_code,
      submittedAt: row.submitted_at,
    })),
  };
}

export async function deleteApplication(id: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const joined = await getJoined(admin, id);
  const { app, business } = joined;
  const name = business?.business_name ?? app.full_name;

  await purgeApplication(admin, joined);

  await logActivity(admin, {
    applicationId: null,
    business: name,
    action: "Account deleted",
    category: "account",
    before: app.status.charAt(0).toUpperCase() + app.status.slice(1),
    after: "Deleted",
    reason: `The account (${app.email}), its documents, images and records were permanently removed by the platform administrator.`,
  });
  return { message: `${name} has been deleted.` };
}

export async function setAccess(ids: string[], access: "active" | "suspended", reason: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  let changed = 0;
  for (const id of ids) {
    const { app, business } = await getJoined(admin, id);
    const target = access === "suspended" ? "suspended" : "approved";
    if (app.status === target || (app.status !== "approved" && app.status !== "suspended")) continue;

    const { error } = await admin.from("account_applications").update({ status: target }).eq("id", id);
    if (error) fail(error, "Could not update account access");
    if (app.tenant_id) {
      await admin.from("tenants").update({ status: access === "suspended" ? "suspended" : "active" }).eq("id", app.tenant_id);
    }
    await logActivity(admin, {
      applicationId: id,
      business: business?.business_name ?? app.full_name,
      action: access === "suspended" ? "Account suspended" : "Account reactivated",
      category: "account",
      before: access === "suspended" ? "Active" : "Suspended",
      after: access === "suspended" ? "Suspended" : "Active",
      reason,
    });
    changed += 1;
  }
  return { message: `${changed} ${changed === 1 ? "tenant" : "tenants"} ${access === "suspended" ? "suspended" : "reactivated"}.` };
}

export async function changePlan(id: string, planCode: string, reason: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { app, business } = await getJoined(admin, id);
  const { data: plan } = await admin.from("subscription_plans").select("name, is_active").eq("code", planCode).maybeSingle();
  if (!plan || !plan.is_active) throw new ServiceError("The selected plan is not available.", 400);
  const { data: previous } = await admin.from("subscription_plans").select("name").eq("code", app.plan_code).maybeSingle();

  const { error } = await admin.from("account_applications").update({ plan_code: planCode }).eq("id", id);
  if (error) fail(error, "Could not change the plan");

  const name = business?.business_name ?? app.full_name;
  await logActivity(admin, {
    applicationId: id,
    business: name,
    action: "Plan changed",
    category: "pricing",
    before: previous?.name ?? app.plan_code,
    after: plan.name,
    reason,
  });
  return { message: `${name} moves to ${plan.name}.` };
}

export async function sendReminders(ids: string[]): Promise<DecisionResult> {
  const admin = createAdminClient();
  const now = new Date();
  let sent = 0;
  const failures: string[] = [];
  for (const id of ids) {
    const { app, identity, business } = await getJoined(admin, id);
    if (app.status !== "approved") continue;
    const { data: plan } = await admin.from("subscription_plans").select("name, price_php").eq("code", app.plan_code).maybeSingle();
    const next = nextBillingDate(app.approved_at, now);
    try {
      await sendBillingReminderEmail({
        to: app.email,
        ownerName: identity?.owner_legal_name ?? app.full_name,
        businessName: business?.business_name ?? "your business",
        planName: plan?.name ?? app.plan_code,
        planPrice: Number(plan?.price_php ?? 0),
        billingDate: (next ?? now).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }),
      });
      sent += 1;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Unknown mail error.");
    }
  }
  if (sent === 0 && failures.length) throw new ServiceError(`Reminders could not be sent: ${failures[0]}`, 502);
  return {
    message: `Billing reminders were sent to ${sent} ${sent === 1 ? "tenant" : "tenants"}.`,
    warning: failures.length ? `${failures.length} could not be sent: ${failures[0]}` : undefined,
  };
}

export type PlanInput = {
  code?: string;
  name: string;
  price: number;
  staffLimit: number | null;
  locationLimit: number | null;
};

export async function savePlan(input: PlanInput): Promise<DecisionResult> {
  const admin = createAdminClient();
  const name = input.name.trim();
  if (!name || !(input.price > 0)) throw new ServiceError("Enter a tier name and a price above zero.", 400);

  if (input.code) {
    const { data: before } = await admin.from("subscription_plans").select("name, price_php").eq("code", input.code).maybeSingle();
    const { error } = await admin
      .from("subscription_plans")
      .update({ name, price_php: input.price, staff_limit: input.staffLimit, location_limit: input.locationLimit })
      .eq("code", input.code);
    if (error) fail(error, "Could not save the tier");
    await logActivity(admin, {
      applicationId: null,
      business: name,
      action: "Tier updated",
      category: "pricing",
      before: before ? `${before.name} · ₱${Number(before.price_php)}` : "—",
      after: `${name} · ₱${input.price}`,
      reason: "Subscription tier pricing or limits were edited.",
    });
    return { message: `${name} has been updated.` };
  }

  const code = slugify(name);
  const { data: clash } = await admin.from("subscription_plans").select("code").eq("code", code).maybeSingle();
  if (clash) throw new ServiceError("A tier with this name already exists.", 409);
  const { data: last } = await admin.from("subscription_plans").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const { error } = await admin.from("subscription_plans").insert({
    code,
    name,
    eyebrow: "CUSTOM",
    price_php: input.price,
    billing_cycle: "monthly",
    staff_limit: input.staffLimit,
    location_limit: input.locationLimit,
    features: ["Online booking"],
    is_active: true,
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
  });
  if (error) fail(error, "Could not create the tier");
  await logActivity(admin, {
    applicationId: null,
    business: name,
    action: "Tier created",
    category: "pricing",
    before: "None",
    after: `${name} · ₱${input.price}`,
    reason: "A new subscription tier was added to the catalog.",
  });
  return { message: `${name} is now in the subscription catalog.` };
}

export async function deactivatePlan(code: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { data: plan } = await admin.from("subscription_plans").select("name").eq("code", code).maybeSingle();
  if (!plan) throw new ServiceError("This tier no longer exists.", 404);
  const { error } = await admin.from("subscription_plans").update({ is_active: false }).eq("code", code);
  if (error) fail(error, "Could not remove the tier");
  await logActivity(admin, {
    applicationId: null,
    business: plan.name,
    action: "Tier removed",
    category: "pricing",
    before: "Available",
    after: "Removed",
    reason: "The tier was removed from the subscription catalog.",
  });
  return { message: `${plan.name} has been removed from the catalog.` };
}

export type AccountAccess =
  | { ok: true; applicationId: string; tenantId: string | null }
  | { ok: false; reason: "none" | "pending" | "rejected" | "suspended" };

export async function getAccountAccess(userId: string): Promise<AccountAccess> {
  const admin = createAdminClient();
  const { data } = await admin.from("account_applications").select("id, status, tenant_id").eq("user_id", userId).maybeSingle();
  if (!data) return { ok: false, reason: "none" };
  if (data.status === "approved") return { ok: true, applicationId: data.id, tenantId: data.tenant_id };
  return { ok: false, reason: data.status };
}

export async function getDashboardProfile(userId: string) {
  const admin = createAdminClient();
  const { data: app } = await admin.from("account_applications").select("*").eq("user_id", userId).maybeSingle();
  if (!app) return null;
  const [business, plan] = await Promise.all([
    admin.from("application_businesses").select("*").eq("application_id", app.id).maybeSingle(),
    admin.from("subscription_plans").select("*").eq("code", app.plan_code).maybeSingle(),
  ]);
  return { app, business: business.data, plan: plan.data };
}

export type DocumentLink = { url: string; fileName: string; mimeType: string; label: string };

/**
 * Short-lived signed URL so the platform administrator can open a private document.
 * The bucket stays private; links expire after 5 minutes.
 */
export async function createDocumentLink(documentId: string, download: boolean): Promise<DocumentLink> {
  const admin = createAdminClient();
  const { data: row, error } = await admin.from("application_documents").select("*").eq("id", documentId).maybeSingle();
  if (error) fail(error, "Could not load the document");
  if (!row || !row.storage_path) throw new ServiceError("This document is not available.", 404);

  const fileName = row.file_name ?? `${row.document_type}`;
  const { data, error: signError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(row.storage_path, 300, download ? { download: fileName } : undefined);
  if (signError || !data?.signedUrl) fail(signError, "Could not open the document");

  return {
    url: data.signedUrl,
    fileName,
    mimeType: row.mime_type ?? "application/octet-stream",
    label: ALL_DOCUMENTS.find((doc) => doc.key === row.document_type)?.title ?? row.document_type,
  };
}
