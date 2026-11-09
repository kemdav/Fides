import "server-only";
import { nextBillingDate } from "@/lib/billing";
import { isMailConfigured } from "@/lib/mail/mailer";
import { sendApprovalEmail, sendBillingReminderEmail } from "@/lib/mail/emails";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { FILE_LIMITS } from "@/lib/registration/options";
import { registrationSchema, type RegistrationInput } from "@/lib/registration/schema";
import type { ActivityEvent } from "@/lib/admin/activity";
import type { PlanSummary, Tenant } from "@/lib/admin/tenants";
import type { Tier } from "@/lib/admin/tiers";
import type { Submission, SubmissionStatus } from "@/lib/admin/verification";
import type {
  AccountApplicationRow,
  ActivityCategory,
  ApplicationBusinessRow,
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

export async function submitApplication(raw: unknown, logo: File | null): Promise<{ referenceCode: string }> {
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

    const { error: identityError } = await admin.from("application_identities").insert({
      application_id: application.id,
      owner_legal_name: data.ownerLegalName,
      date_of_birth: data.dateOfBirth,
      id_type: data.idType,
      id_document_path: null,
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

    await logActivity(admin, {
      applicationId: application.id,
      business: data.businessName,
      action: "Application submitted",
      category: "verification",
      before: "None",
      after: "Pending",
      reason: `${data.fullName} submitted a new account application.`,
      actor: data.fullName,
    });

    return { referenceCode: application.reference_code };
  } catch (error) {
    if (logoPath) await admin.storage.from(LOGO_BUCKET).remove([logoPath]);
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
  const [joined, planRows, activityRes] = await Promise.all([
    loadJoined(admin),
    loadPlans(admin),
    admin.from("admin_activity_log").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
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
    documents: [],
    note: app.review_notes ? [app.review_notes] : undefined,
  }));

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

export async function rejectApplication(id: string, reason: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { app, business } = await getJoined(admin, id);
  if (app.status !== "pending") throw new ServiceError("Only pending applications can be rejected.", 409);

  const { error } = await admin
    .from("account_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: ACTOR,
      review_notes: reason,
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) fail(error, "Could not record the rejection");

  const name = business?.business_name ?? app.full_name;
  await logActivity(admin, {
    applicationId: id,
    business: name,
    action: "Application rejected",
    category: "verification",
    before: "Pending",
    after: "Rejected",
    reason,
  });
  return { message: `${name} has been rejected.` };
}

export async function deleteApplication(id: string): Promise<DecisionResult> {
  const admin = createAdminClient();
  const { app, business } = await getJoined(admin, id);
  const name = business?.business_name ?? app.full_name;

  const { data: files } = await admin.storage.from(LOGO_BUCKET).list(id);
  if (files?.length) await admin.storage.from(LOGO_BUCKET).remove(files.map((file) => `${id}/${file.name}`));

  if (app.tenant_id) await admin.from("tenants").delete().eq("id", app.tenant_id);

  const { error } = await admin.auth.admin.deleteUser(app.user_id);
  if (error) {
    const { error: fallback } = await admin.from("account_applications").delete().eq("id", id);
    if (fallback) fail(fallback, "Could not delete the account");
  }

  await logActivity(admin, {
    applicationId: null,
    business: name,
    action: "Account deleted",
    category: "account",
    before: app.status.charAt(0).toUpperCase() + app.status.slice(1),
    after: "Deleted",
    reason: "The application and its records were permanently removed by the platform administrator.",
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
