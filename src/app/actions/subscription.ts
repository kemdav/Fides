"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_BYTES,
  billingDetailsSchema,
  cancelSubscriptionSchema,
  invoiceDeliveryPreferencesSchema,
  renewalReminderSettingsSchema,
  schedulePlanChangeSchema,
  submitPaymentDetailsSchema,
  tenantActionSchema,
} from "@/lib/validations/subscription";
import type {
  InvoiceKind,
  InvoiceStatus,
  PaymentSubmissionStatus,
  SubscriptionInvoice,
  SubscriptionPaymentSubmission,
  SubscriptionTierCode,
  SubscriptionTierOption,
  SubscriptionWorkspaceData,
  TenantBillingProfile,
} from "@/types/subscription";

export type SubscriptionActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

interface ResolvedAccess {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  canEdit: boolean;
  tenantId: string;
  tenantSlug: string;
  businessName: string;
  timezone: string;
}

interface RawTierRow {
  id: string;
  code: SubscriptionTierCode;
  name: string;
  price_cents: number;
  billing_interval: "month" | "year";
  sort_order: number;
}

interface RawTierFeatureRow {
  tier_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value: number | null;
}

interface RawInvoiceRow {
  id: string;
  invoice_number: string;
  invoice_kind: InvoiceKind;
  tier_name: string;
  billing_period_start: string;
  billing_period_end: string;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  status: InvoiceStatus;
  billed_to_name: string;
  billed_to_address: string;
  billed_to_tin: string | null;
  billed_to_branch: string | null;
  billed_to_email: string;
}

interface RawPaymentSubmissionRow {
  id: string;
  invoice_id: string;
  bank_transfer_reference: string;
  transfer_date: string;
  amount_cents: number;
  receipt_storage_path: string | null;
  receipt_file_name: string | null;
  status: PaymentSubmissionStatus;
  submitted_at: string;
}

function asUntypedClient(
  client: Awaited<ReturnType<typeof createClient>>
): SupabaseClient {
  return client;
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Business owner";
    case "receptionist":
      return "Receptionist";
    case "staff":
      return "Staff member";
    case "admin":
      return "Administrator";
    default:
      return "Team member";
  }
}

function splitVatInclusive(totalCents: number): { subtotalCents: number; vatCents: number } {
  const subtotalCents = Math.round(totalCents / 1.12);
  return { subtotalCents, vatCents: totalCents - subtotalCents };
}

function composeAddress(profile: {
  streetBarangay: string;
  city: string;
  province: string;
  postalCode: string;
}): string {
  const parts = [profile.streetBarangay, profile.city, profile.province]
    .map((s) => s.trim())
    .filter(Boolean);
  const base = parts.join(", ");
  return profile.postalCode.trim()
    ? `${base} ${profile.postalCode.trim()}`.trim()
    : base;
}

function mapTierOptions(
  tiers: RawTierRow[],
  features: RawTierFeatureRow[]
): SubscriptionTierOption[] {
  const byTier = new Map<string, Map<string, RawTierFeatureRow>>();
  for (const row of features) {
    if (!byTier.has(row.tier_id)) {
      byTier.set(row.tier_id, new Map());
    }
    byTier.get(row.tier_id)?.set(row.feature_key, row);
  }

  return tiers.map((tier) => {
    const f = byTier.get(tier.id);
    return {
      id: tier.id,
      code: tier.code,
      name: tier.name,
      priceCents: tier.price_cents,
      billingInterval: tier.billing_interval,
      sortOrder: tier.sort_order,
      limits: {
        staffAccounts: f?.get("staff_accounts")?.limit_value ?? 15,
        branches: f?.get("branches")?.limit_value ?? 1,
        appointmentsPerMonth: f?.get("appointments_per_month")?.limit_value ?? 1000,
      },
      features: {
        bookingWebsite: Boolean(f?.get("booking_website")?.enabled ?? true),
        appointmentManagement: Boolean(f?.get("appointment_management")?.enabled ?? true),
        customerRegistry: Boolean(f?.get("customer_registry")?.enabled ?? true),
        customDomainQr: Boolean(f?.get("custom_domain_qr")?.enabled ?? false),
        reportsCommissions: Boolean(f?.get("reports_commissions")?.enabled ?? false),
        multipleBranches: Boolean(f?.get("multiple_branches")?.enabled ?? false),
      },
    };
  });
}

function normalizeIanaTimeZone(raw: unknown): string {
  const candidate =
    typeof raw === "string" ? raw.split(/\s*\(/)[0]?.trim() : "";
  if (!candidate) return "Asia/Manila";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return "Asia/Manila";
  }
}

async function resolveTenantAccess(
  tenantIdParam?: string
): Promise<
  | { success: true; access: ResolvedAccess; supabase: Awaited<ReturnType<typeof createClient>> }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Authentication required." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const targetTenantId = tenantIdParam || profile?.tenant_id;
  if (!targetTenantId) {
    return {
      success: false,
      error: "No active business workspace is associated with this account.",
    };
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", targetTenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!membership && !isPlatformAdmin) {
    return {
      success: false,
      error: "You do not have access to this business workspace.",
    };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("id", targetTenantId)
    .maybeSingle();

  if (!tenant) {
    return { success: false, error: "Business workspace not found." };
  }

  const client = asUntypedClient(supabase);
  const { data: settingsRow } = await client
    .from("tenant_settings")
    .select("time_zone")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  const effectiveRole = membership?.role ?? profile?.role ?? "staff";
  const timeZoneValue = normalizeIanaTimeZone(settingsRow?.time_zone);

  return {
    success: true,
    supabase,
    access: {
      userId: user.id,
      userName: profile?.full_name?.trim() || user.email || "Business owner",
      userEmail: profile?.email?.trim() || user.email || "",
      role: effectiveRole,
      canEdit: effectiveRole === "owner",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      businessName: tenant.name,
      timezone: timeZoneValue,
    },
  };
}

function revalidateSubscriptionPaths(slug: string) {
  revalidatePath(`/${slug}/dashboard/settings/subscription`);
  revalidatePath("/dashboard/settings/subscription");
}

async function computeUsageMetrics(
  client: SupabaseClient,
  tenantId: string,
  periodStart: string,
  periodEnd: string,
  addOnBranches: number
) {
  const [staffCountRes, apptCountRes] = await Promise.all([
    client
      .from("staff_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("active", true),
    client
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("starts_at", periodStart)
      .lte("starts_at", periodEnd)
      .neq("status", "cancelled"),
  ]);

  let pendingInvitationsCount = 0;
  try {
    const inviteRes = await client
      .from("staff_invitations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "pending");
    if (!inviteRes.error && typeof inviteRes.count === "number") {
      pendingInvitationsCount = inviteRes.count;
    }
  } catch {
    pendingInvitationsCount = 0;
  }

  const activeStaffCount = staffCountRes.count ?? 0;
  const totalStaffSeatsUsed = activeStaffCount + pendingInvitationsCount;
  const branchesCount = Math.max(1, 1 + addOnBranches);
  const appointmentsThisPeriod = apptCountRes.count ?? 0;

  return {
    activeStaffCount,
    pendingInvitationsCount,
    totalStaffSeatsUsed,
    branchesCount,
    appointmentsThisPeriod,
  };
}

export async function getSubscriptionWorkspaceAction(
  tenantIdParam?: string
): Promise<SubscriptionActionResult<SubscriptionWorkspaceData>> {
  const resolved = await resolveTenantAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { access, supabase } = resolved;
  const client = asUntypedClient(supabase);

  // Idempotent bootstrap for Bella Vita & new tenants without touching seed.sql
  await client.rpc("ensure_tenant_subscription_workspace", {
    p_tenant_id: access.tenantId,
  });

  const [tiersRes, featuresRes, subRes, billingRes, invoicesRes, submissionsRes] =
    await Promise.all([
      client
        .from("subscription_tiers")
        .select("id, code, name, price_cents, billing_interval, sort_order")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      client
        .from("tier_features")
        .select("tier_id, feature_key, enabled, limit_value"),
      client
        .from("subscriptions")
        .select(
          "id, tenant_id, tier_id, status, trial_ends_at, current_period_start, current_period_end, scheduled_tier_id, scheduled_change_effective_at, cancel_at_period_end, cancellation_reason, cancelled_at, trial_conversion_scheduled, reactivation_requested_at, add_on_branches, renewal_reminders_enabled, renewal_reminder_days"
        )
        .eq("tenant_id", access.tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("tenant_billing_profiles")
        .select(
          "tenant_id, billing_name, billing_email, cc_email, same_as_business_email, street_barangay, city, province, postal_code, tin, branch_code, updated_at"
        )
        .eq("tenant_id", access.tenantId)
        .maybeSingle(),
      client
        .from("subscription_invoices")
        .select(
          "id, invoice_number, invoice_kind, tier_name, billing_period_start, billing_period_end, issued_at, due_at, paid_at, subtotal_cents, vat_cents, total_cents, amount_paid_cents, status, billed_to_name, billed_to_address, billed_to_tin, billed_to_branch, billed_to_email"
        )
        .eq("tenant_id", access.tenantId)
        .order("issued_at", { ascending: false }),
      client
        .from("subscription_payment_submissions")
        .select(
          "id, invoice_id, bank_transfer_reference, transfer_date, amount_cents, receipt_storage_path, receipt_file_name, status, submitted_at"
        )
        .eq("tenant_id", access.tenantId)
        .order("submitted_at", { ascending: false }),
    ]);

  if (tiersRes.error || !tiersRes.data) {
    return { success: false, error: "Could not load subscription plans." };
  }
  if (subRes.error || !subRes.data) {
    return { success: false, error: "Could not load your active subscription." };
  }

  const tiers = mapTierOptions(
    tiersRes.data,
    (featuresRes.data ?? [])
  );
  const subRow = subRes.data;
  const currentTier = tiers.find((t) => t.id === subRow.tier_id) ?? tiers[1] ?? tiers[0];
  const scheduledTier = subRow.scheduled_tier_id
    ? tiers.find((t) => t.id === subRow.scheduled_tier_id) ?? null
    : null;

  const now = new Date();
  const periodStart =
    subRow.current_period_start ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const periodEnd =
    subRow.current_period_end ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString();

  const usage = await computeUsageMetrics(
    client,
    access.tenantId,
    periodStart,
    periodEnd,
    subRow.add_on_branches ?? 0
  );

  const billingRow = billingRes.data;
  const billingProfile: TenantBillingProfile = {
    tenantId: access.tenantId,
    billingName: billingRow?.billing_name ?? access.businessName,
    billingEmail: billingRow?.billing_email ?? access.userEmail,
    ccEmail: billingRow?.cc_email ?? "",
    sameAsBusinessEmail: billingRow?.same_as_business_email ?? true,
    streetBarangay: billingRow?.street_barangay ?? "",
    city: billingRow?.city ?? "",
    province: billingRow?.province ?? "",
    postalCode: billingRow?.postal_code ?? "",
    tin: billingRow?.tin ?? "",
    branchCode: billingRow?.branch_code ?? "000",
    updatedAt: billingRow?.updated_at ?? null,
  };

  const latestSubmissionByInvoice = new Map<string, SubscriptionPaymentSubmission>();
  for (const row of (submissionsRes.data ?? []) as RawPaymentSubmissionRow[]) {
    if (!latestSubmissionByInvoice.has(row.invoice_id)) {
      latestSubmissionByInvoice.set(row.invoice_id, {
        id: row.id,
        invoiceId: row.invoice_id,
        bankTransferReference: row.bank_transfer_reference,
        transferDate: row.transfer_date,
        amountCents: row.amount_cents,
        receiptStoragePath: row.receipt_storage_path,
        receiptFileName: row.receipt_file_name,
        status: row.status,
        submittedAt: row.submitted_at,
      });
    }
  }

  const invoices: SubscriptionInvoice[] = ((invoicesRes.data ?? []) as RawInvoiceRow[]).map(
    (inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceKind: inv.invoice_kind,
      tierName: inv.tier_name,
      billingPeriodStart: inv.billing_period_start,
      billingPeriodEnd: inv.billing_period_end,
      issuedAt: inv.issued_at,
      dueAt: inv.due_at,
      paidAt: inv.paid_at,
      subtotalCents: inv.subtotal_cents,
      vatCents: inv.vat_cents,
      totalCents: inv.total_cents,
      amountPaidCents: inv.amount_paid_cents,
      balanceDueCents: Math.max(0, inv.total_cents - inv.amount_paid_cents),
      status: inv.status,
      billedToName: inv.billed_to_name,
      billedToAddress: inv.billed_to_address,
      billedToTin: inv.billed_to_tin,
      billedToBranch: inv.billed_to_branch,
      billedToEmail: inv.billed_to_email,
      latestPaymentSubmission: latestSubmissionByInvoice.get(inv.id) ?? null,
    })
  );

  return {
    success: true,
    message: "Loaded subscription workspace.",
    data: {
      tenantId: access.tenantId,
      tenantSlug: access.tenantSlug,
      businessName: access.businessName,
      timezone: access.timezone,
      userName: access.userName,
      userEmail: access.userEmail,
      userRoleLabel: formatRoleLabel(access.role),
      canEdit: access.canEdit,
      subscription: {
        id: subRow.id,
        tenantId: subRow.tenant_id,
        tierId: currentTier.id,
        tierCode: currentTier.code,
        tierName: currentTier.name,
        priceCents: currentTier.priceCents,
        billingInterval: currentTier.billingInterval,
        status: subRow.status,
        trialEndsAt: subRow.trial_ends_at,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        scheduledTierId: scheduledTier?.id ?? null,
        scheduledTierCode: scheduledTier?.code ?? null,
        scheduledTierName: scheduledTier?.name ?? null,
        scheduledTierPriceCents: scheduledTier?.priceCents ?? null,
        scheduledChangeEffectiveAt: subRow.scheduled_change_effective_at,
        cancelAtPeriodEnd: Boolean(subRow.cancel_at_period_end),
        cancellationReason: subRow.cancellation_reason,
        cancelledAt: subRow.cancelled_at,
        trialConversionScheduled: Boolean(subRow.trial_conversion_scheduled),
        reactivationRequestedAt: subRow.reactivation_requested_at,
        addOnBranches: subRow.add_on_branches ?? 0,
        renewalRemindersEnabled: subRow.renewal_reminders_enabled ?? true,
        renewalReminderDays: subRow.renewal_reminder_days ?? [7, 3, 1],
      },
      tiers,
      usage,
      billingProfile,
      businessDefaults: {
        businessName: billingProfile.billingName || access.businessName,
        businessEmail: billingProfile.billingEmail || access.userEmail,
        streetBarangay: billingProfile.streetBarangay,
        city: billingProfile.city,
        province: billingProfile.province,
        postalCode: billingProfile.postalCode,
      },
      invoices,
    },
  };
}

export async function schedulePlanChangeAction(input: {
  tenantId: string;
  targetTierCode: SubscriptionTierCode;
}): Promise<SubscriptionActionResult<{ effectiveAt: string; targetTierName: string; priceCents: number }>> {
  const parsed = schedulePlanChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid plan selection." };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can change the subscription plan." };
  }

  const workspace = await getSubscriptionWorkspaceAction(resolved.access.tenantId);
  if (!workspace.success || !workspace.data) {
    return { success: false, error: "Could not verify current subscription state." };
  }

  const { subscription, tiers, usage } = workspace.data;
  const targetTier = tiers.find((t) => t.code === parsed.data.targetTierCode);
  if (!targetTier) {
    return { success: false, error: "Selected plan is not available." };
  }
  if (targetTier.id === subscription.tierId) {
    return { success: false, error: "You are already on this plan." };
  }
  if (usage.totalStaffSeatsUsed > targetTier.limits.staffAccounts) {
    return {
      success: false,
      error: `Your ${usage.totalStaffSeatsUsed} staff accounts exceed ${targetTier.name}'s ${targetTier.limits.staffAccounts}-seat limit. Reduce usage before downgrading.`,
    };
  }
  if (usage.branchesCount > targetTier.limits.branches) {
    return {
      success: false,
      error: `Your ${usage.branchesCount} branches exceed ${targetTier.name}'s ${targetTier.limits.branches}-branch limit.`,
    };
  }

  const effectiveDate = new Date(new Date(subscription.currentPeriodEnd).getTime() + 1000).toISOString();
  const client = asUntypedClient(resolved.supabase);

  const { error } = await client
    .from("subscriptions")
    .update({
      scheduled_tier_id: targetTier.id,
      scheduled_change_effective_at: effectiveDate,
      cancel_at_period_end: false,
      cancellation_reason: null,
    })
    .eq("id", subscription.id)
    .eq("tenant_id", resolved.access.tenantId);

  if (error) {
    return { success: false, error: "Failed to schedule plan change." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return {
    success: true,
    message: `${targetTier.name} plan change scheduled.`,
    data: {
      effectiveAt: effectiveDate,
      targetTierName: targetTier.name,
      priceCents: targetTier.priceCents,
    },
  };
}

export async function scheduleCancellationAction(input: {
  tenantId: string;
  reason?: string;
}): Promise<SubscriptionActionResult> {
  const parsed = cancelSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid cancellation request." };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can cancel the subscription." };
  }

  const client = asUntypedClient(resolved.supabase);
  const { data: sub } = await client
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", resolved.access.tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.id) {
    return { success: false, error: "Active subscription not found." };
  }

  const { error } = await client
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      cancellation_reason: parsed.data.reason || null,
      scheduled_tier_id: null,
      scheduled_change_effective_at: null,
    })
    .eq("id", sub.id)
    .eq("tenant_id", resolved.access.tenantId);

  if (error) {
    return { success: false, error: "Could not schedule cancellation." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return { success: true, message: "Cancellation scheduled for the end of the current period." };
}

export async function keepSubscriptionPlanAction(input: {
  tenantId: string;
}): Promise<SubscriptionActionResult> {
  const parsed = tenantActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid workspace identifier." };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can update subscription status." };
  }

  const client = asUntypedClient(resolved.supabase);
  const { data: sub } = await client
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", resolved.access.tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.id) {
    return { success: false, error: "Subscription not found." };
  }

  const { error } = await client
    .from("subscriptions")
    .update({
      cancel_at_period_end: false,
      cancellation_reason: null,
    })
    .eq("id", sub.id)
    .eq("tenant_id", resolved.access.tenantId);

  if (error) {
    return { success: false, error: "Could not resume renewal." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return { success: true, message: "Your plan renewal has been restored." };
}

export async function confirmTrialConversionAction(input: {
  tenantId: string;
}): Promise<SubscriptionActionResult> {
  const parsed = tenantActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid workspace identifier." };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can convert a trial plan." };
  }

  const client = asUntypedClient(resolved.supabase);
  const { data: sub } = await client
    .from("subscriptions")
    .select("id, status")
    .eq("tenant_id", resolved.access.tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.id) {
    return { success: false, error: "Subscription not found." };
  }

  const { error } = await client
    .from("subscriptions")
    .update({
      trial_conversion_scheduled: true,
      cancel_at_period_end: false,
    })
    .eq("id", sub.id)
    .eq("tenant_id", resolved.access.tenantId);

  if (error) {
    return { success: false, error: "Could not schedule paid conversion." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return { success: true, message: "Paid subscription scheduled." };
}

export async function requestReactivationAction(input: {
  tenantId: string;
}): Promise<SubscriptionActionResult<{ invoiceId: string; invoiceNumber: string }>> {
  const parsed = tenantActionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid workspace identifier." };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can reactivate a subscription." };
  }

  const workspace = await getSubscriptionWorkspaceAction(resolved.access.tenantId);
  if (!workspace.success || !workspace.data) {
    return { success: false, error: "Could not load subscription details." };
  }

  const { subscription, billingProfile } = workspace.data;
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEndDate = new Date(now);
  periodEndDate.setMonth(periodEndDate.getMonth() + 1);
  periodEndDate.setDate(periodEndDate.getDate() - 1);
  const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const invoiceNumber = `INV-${now.getUTCFullYear()}-${String(Math.floor(100 + Math.random() * 899))}`;
  const { subtotalCents, vatCents } = splitVatInclusive(subscription.priceCents);
  const client = asUntypedClient(resolved.supabase);

  const { data: createdInvoice, error: invError } = await client
    .from("subscription_invoices")
    .insert({
      tenant_id: resolved.access.tenantId,
      subscription_id: subscription.id,
      tier_id: subscription.tierId,
      invoice_number: invoiceNumber,
      invoice_kind: "reactivation",
      tier_name: subscription.tierName,
      billing_period_start: periodStart,
      billing_period_end: periodEndDate.toISOString(),
      issued_at: now.toISOString(),
      due_at: dueDate.toISOString(),
      subtotal_cents: subtotalCents,
      vat_cents: vatCents,
      total_cents: subscription.priceCents,
      amount_paid_cents: 0,
      status: "unpaid",
      billed_to_name: billingProfile.billingName,
      billed_to_address: composeAddress(billingProfile),
      billed_to_tin: billingProfile.tin || null,
      billed_to_branch: billingProfile.branchCode || "000",
      billed_to_email: billingProfile.billingEmail,
    })
    .select("id, invoice_number")
    .single();

  if (invError || !createdInvoice) {
    return { success: false, error: "Could not generate reactivation invoice." };
  }

  await client
    .from("subscriptions")
    .update({
      reactivation_requested_at: now.toISOString(),
    })
    .eq("id", subscription.id)
    .eq("tenant_id", resolved.access.tenantId);

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return {
    success: true,
    message: "Reactivation invoice issued.",
    data: {
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.invoice_number,
    },
  };
}

export async function updateBillingDetailsAction(input: {
  tenantId: string;
  billingName: string;
  billingEmail: string;
  sameAsBusinessEmail: boolean;
  streetBarangay: string;
  city: string;
  province: string;
  postalCode: string;
  tin?: string;
  branchCode?: string;
}): Promise<SubscriptionActionResult> {
  const parsed = billingDetailsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please review your billing details.",
      fieldErrors,
    };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can update billing details." };
  }

  const client = asUntypedClient(resolved.supabase);
  const { error } = await client.from("tenant_billing_profiles").upsert(
    {
      tenant_id: resolved.access.tenantId,
      billing_name: parsed.data.billingName,
      billing_email: parsed.data.billingEmail,
      same_as_business_email: parsed.data.sameAsBusinessEmail,
      street_barangay: parsed.data.streetBarangay,
      city: parsed.data.city,
      province: parsed.data.province,
      postal_code: parsed.data.postalCode,
      tin: parsed.data.tin || null,
      branch_code: parsed.data.branchCode || "000",
    },
    { onConflict: "tenant_id" }
  );

  if (error) {
    return { success: false, error: "Could not save billing details." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return { success: true, message: "Billing details saved." };
}

export async function updateInvoiceDeliveryPreferencesAction(input: {
  tenantId: string;
  ccEmail: string;
}): Promise<SubscriptionActionResult> {
  const parsed = invoiceDeliveryPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email address.",
    };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can update invoice delivery preferences." };
  }

  const client = asUntypedClient(resolved.supabase);
  const { error } = await client
    .from("tenant_billing_profiles")
    .update({
      cc_email: parsed.data.ccEmail || null,
    })
    .eq("tenant_id", resolved.access.tenantId);

  if (error) {
    return { success: false, error: "Could not save invoice delivery preferences." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return { success: true, message: "Invoice delivery preferences updated." };
}

export async function updateRenewalRemindersAction(input: {
  tenantId: string;
  renewalRemindersEnabled: boolean;
}): Promise<SubscriptionActionResult> {
  const parsed = renewalReminderSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid reminder preference." };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can change reminder preferences." };
  }

  const client = asUntypedClient(resolved.supabase);
  const { data: sub } = await client
    .from("subscriptions")
    .select("id")
    .eq("tenant_id", resolved.access.tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.id) {
    return { success: false, error: "Subscription not found." };
  }

  const { error } = await client
    .from("subscriptions")
    .update({ renewal_reminders_enabled: parsed.data.renewalRemindersEnabled })
    .eq("id", sub.id)
    .eq("tenant_id", resolved.access.tenantId);

  if (error) {
    return { success: false, error: "Could not update reminder preferences." };
  }

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return { success: true, message: "Renewal reminder preference saved." };
}

export async function submitInvoicePaymentDetailsAction(
  formData: FormData
): Promise<SubscriptionActionResult<{ isPastDue: boolean }>> {
  const parsed = submitPaymentDetailsSchema.safeParse({
    tenantId: String(formData.get("tenantId") ?? ""),
    invoiceId: String(formData.get("invoiceId") ?? ""),
    bankTransferReference: String(formData.get("bankTransferReference") ?? ""),
    transferDate: String(formData.get("transferDate") ?? ""),
    amountPhp: String(formData.get("amountPhp") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please complete all required payment fields.",
      fieldErrors,
    };
  }

  const resolved = await resolveTenantAccess(parsed.data.tenantId);
  if (!resolved.success) return { success: false, error: resolved.error };
  if (!resolved.access.canEdit) {
    return { success: false, error: "Only the business owner can submit payment details." };
  }

  const client = asUntypedClient(resolved.supabase);
  const [invoiceRes, subRes] = await Promise.all([
    client
      .from("subscription_invoices")
      .select("id, status")
      .eq("id", parsed.data.invoiceId)
      .eq("tenant_id", resolved.access.tenantId)
      .maybeSingle(),
    client
      .from("subscriptions")
      .select("status")
      .eq("tenant_id", resolved.access.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!invoiceRes.data) {
    return { success: false, error: "Invoice not found." };
  }
  if (invoiceRes.data.status === "paid") {
    return { success: false, error: "This invoice is already marked as paid." };
  }

  let receiptStoragePath: string | null = null;
  let receiptFileName: string | null = null;
  const receiptFile = formData.get("receipt");

  if (receiptFile instanceof File && receiptFile.size > 0) {
    if (receiptFile.size > MAX_RECEIPT_FILE_BYTES) {
      return { success: false, error: "Receipt file must be 10 MB or smaller." };
    }
    if (
      !ALLOWED_RECEIPT_MIME_TYPES.includes(
        receiptFile.type as (typeof ALLOWED_RECEIPT_MIME_TYPES)[number]
      )
    ) {
      return { success: false, error: "Receipt must be a PNG, JPG, or PDF file." };
    }

    const safeFileName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectPath = `${resolved.access.tenantId}/${parsed.data.invoiceId}/${Date.now()}-${safeFileName}`;
    const buffer = new Uint8Array(await receiptFile.arrayBuffer());

    const { error: uploadError } = await resolved.supabase.storage
      .from("subscription-receipts")
      .upload(objectPath, buffer, {
        contentType: receiptFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: "Failed to upload receipt file. Please try again." };
    }

    receiptStoragePath = objectPath;
    receiptFileName = receiptFile.name;
  }

  const amountCents = Math.round(
    Number(parsed.data.amountPhp.replace(/,/g, "")) * 100
  );

  const { error: insertError } = await client
    .from("subscription_payment_submissions")
    .insert({
      tenant_id: resolved.access.tenantId,
      invoice_id: parsed.data.invoiceId,
      submitted_by: resolved.access.userId,
      bank_transfer_reference: parsed.data.bankTransferReference,
      transfer_date: parsed.data.transferDate,
      amount_cents: amountCents,
      receipt_storage_path: receiptStoragePath,
      receipt_file_name: receiptFileName,
      status: "pending_verification",
    });

  if (insertError) {
    return { success: false, error: "Could not record payment submission." };
  }

  const isPastDue =
    subRes.data?.status === "past_due" || invoiceRes.data.status === "overdue";

  revalidateSubscriptionPaths(resolved.access.tenantSlug);
  return {
    success: true,
    message: isPastDue
      ? "Payment verification pending."
      : "Payment details submitted.",
    data: { isPastDue },
  };
}