"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isTenantOpen, SUSPENDED_MESSAGE } from "@/lib/merchant/tenant-status";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  buildCustomerInviteUrl,
  sendCustomerInviteEmail,
} from "@/lib/mail/customer-invite-email";
import {
  acceptCustomerInviteSchema,
  createCustomerSchema,
  customerNoteSchema,
  updateCustomerSchema,
} from "@/lib/validations/customers";
import type {
  CreateCustomerInput,
  CustomerInvitationItem,
  CustomerInviteDisplayStatus,
  CustomerInvitePreview,
  CustomerInviteRecordStatus,
  CustomerNoteItem,
  CustomerProfileDetail,
  CustomerProfileWorkspaceData,
  CustomerRegistryItem,
  CustomerRegistryWorkspaceData,
  CustomerVisitItem,
  MerchantWorkspaceContext,
  UpdateCustomerInput,
} from "@/types/customers";

export type CustomerActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

interface RawCustomerRow {
  id: string;
  tenant_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  marketing_opt_in: boolean;
  archived_at: string | null;
  created_at: string;
}

interface RawInvitationRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  email: string;
  status: CustomerInviteRecordStatus;
  invited_by: string | null;
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
  canceled_at: string | null;
}

interface RawAppointmentRow {
  id: string;
  customer_id: string | null;
  staff_id: string | null;
  status: string;
  starts_at: string;
  total_cents: number;
}

interface RawPaymentRow {
  id: string;
  appointment_id: string | null;
  customer_id: string | null;
  amount_cents: number;
  status: "pending" | "paid" | "refunded" | "voided" | "failed";
}

interface RawNoteRow {
  id: string;
  customer_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface RawAppointmentServiceRow {
  appointment_id: string;
  service_id: string;
  price_cents: number;
}

interface RawServiceRow {
  id: string;
  name: string;
}

interface RawStaffRow {
  id: string;
  full_name: string;
}

interface RawProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

const OPERATIONAL_ROLES = new Set(["owner", "admin", "receptionist", "staff"]);

function hashInviteToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
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

function resolveEffectiveInviteStatus(
  inv: RawInvitationRow,
  nowMs: number
): CustomerInviteRecordStatus {
  if (inv.status === "pending" && new Date(inv.expires_at).getTime() < nowMs) {
    return "expired";
  }
  return inv.status;
}

function computeDisplayInviteStatus(
  profileId: string | null,
  invitations: RawInvitationRow[],
  nowMs: number
): CustomerInviteDisplayStatus {
  if (profileId) return "registered";
  if (invitations.length === 0) return "invite_not_sent";

  const sorted = [...invitations].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
  const latest = sorted[0];
  const effective = resolveEffectiveInviteStatus(latest, nowMs);

  if (effective === "pending") return "invite_sent";
  if (effective === "expired") return "invite_expired";
  return "invite_not_sent";
}

async function resolveOperationalAccess(tenantIdParam?: string): Promise<
  | {
      success: true;
      userId: string;
      meta: MerchantWorkspaceContext;
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
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

  const [{ data: membership }, { data: tenant }] = await Promise.all([
    supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", targetTenantId)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("id", targetTenantId)
      .maybeSingle(),
  ]);

  if (!tenant) {
    return { success: false, error: "Business workspace not found." };
  }

  const effectiveRole =
    membership?.role ??
    (profile?.tenant_id === targetTenantId ? profile?.role : null);

  if (!effectiveRole || !OPERATIONAL_ROLES.has(effectiveRole)) {
    return {
      success: false,
      error: "Access denied: merchant staff membership is required.",
    };
  }

  const userName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    user.email ||
    "Merchant user";

  return {
    success: true,
    userId: user.id,
    supabase,
    meta: {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      businessName: tenant.name,
      userName,
      userEmail: user.email ?? profile?.email ?? "",
      userRole: formatRoleLabel(effectiveRole),
    },
  };
}

function revalidateCustomerPaths(tenantSlug: string, customerId?: string) {
  revalidatePath(`/${tenantSlug}/dashboard/customers`);
  revalidatePath("/dashboard/customers");
  if (customerId) {
    revalidatePath(`/${tenantSlug}/dashboard/customers/${customerId}`);
  }
}

/** Internal helper to issue a single-use customer invite and attempt email delivery. */
async function issueCustomerInviteInternal(params: {
  db: SupabaseClient;
  tenantId: string;
  customerId: string;
  customerName: string;
  email: string;
  businessName: string;
  invitedBy: string;
}): Promise<{
  success: true;
  inviteId: string;
  inviteUrl: string;
  emailDelivered: boolean;
  deliveryWarning?: string;
} | { success: false; error: string }> {
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Supersede any existing pending invite for this customer
  await params.db
    .from("customer_invitations")
    .update({ status: "superseded" })
    .eq("tenant_id", params.tenantId)
    .eq("customer_id", params.customerId)
    .eq("status", "pending");

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(rawToken);

  const { data: inserted, error: insertError } = await params.db
    .from("customer_invitations")
    .insert({
      tenant_id: params.tenantId,
      customer_id: params.customerId,
      email: params.email.trim().toLowerCase(),
      token_hash: tokenHash,
      status: "pending",
      invited_by: params.invitedBy,
      sent_at: nowIso,
      expires_at: expiresIso,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !inserted) {
    return {
      success: false,
      error: `Failed to create invitation: ${insertError?.message ?? "Unknown error"}`,
    };
  }

  const inviteUrl = buildCustomerInviteUrl(rawToken);
  const mailResult = await sendCustomerInviteEmail({
    to: params.email.trim().toLowerCase(),
    customerName: params.customerName,
    businessName: params.businessName,
    inviteUrl,
  });

  return {
    success: true,
    inviteId: inserted.id,
    inviteUrl,
    emailDelivered: mailResult.delivered,
    deliveryWarning: mailResult.warning,
  };
}

export async function getCustomerRegistryAction(
  tenantIdParam?: string
): Promise<CustomerActionResult<CustomerRegistryWorkspaceData>> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, meta } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const [
    customersRes,
    appointmentsRes,
    paymentsRes,
    notesRes,
    invitationsRes,
  ] = await Promise.all([
    db
      .from("customers")
      .select(
        "id, tenant_id, profile_id, full_name, email, phone, birthday, marketing_opt_in, archived_at, created_at"
      )
      .eq("tenant_id", meta.tenantId)
      .order("created_at", { ascending: false }),
    db
      .from("appointments")
      .select("id, customer_id, staff_id, status, starts_at, total_cents")
      .eq("tenant_id", meta.tenantId)
      .not("customer_id", "is", null),
    db
      .from("payments")
      .select("id, appointment_id, customer_id, amount_cents, status")
      .eq("tenant_id", meta.tenantId)
      .eq("status", "paid")
      .not("customer_id", "is", null),
    db
      .from("customer_notes")
      .select("id, customer_id")
      .eq("tenant_id", meta.tenantId),
    db
      .from("customer_invitations")
      .select(
        "id, tenant_id, customer_id, email, status, invited_by, sent_at, expires_at, accepted_at, canceled_at"
      )
      .eq("tenant_id", meta.tenantId)
      .order("sent_at", { ascending: false }),
  ]);

  if (customersRes.error) {
    return {
      success: false,
      error: `Failed to load customers: ${customersRes.error.message}`,
    };
  }

  const rawCustomers = (customersRes.data ?? []) as RawCustomerRow[];
  const rawAppointments = (appointmentsRes.data ?? []) as RawAppointmentRow[];
  const rawPayments = (paymentsRes.data ?? []) as RawPaymentRow[];
  const rawNotes = (notesRes.data ?? []) as { id: string; customer_id: string }[];
  const rawInvitations = (invitationsRes.data ?? []) as RawInvitationRow[];

  const visitsByCustomer = new Map<
    string,
    { count: number; lastVisitAt: string | null }
  >();
  for (const appt of rawAppointments) {
    if (!appt.customer_id) continue;
    const current = visitsByCustomer.get(appt.customer_id) ?? {
      count: 0,
      lastVisitAt: null,
    };
    current.count += 1;
    if (
      !current.lastVisitAt ||
      new Date(appt.starts_at).getTime() >
        new Date(current.lastVisitAt).getTime()
    ) {
      current.lastVisitAt = appt.starts_at;
    }
    visitsByCustomer.set(appt.customer_id, current);
  }

  const spendByCustomer = new Map<string, number>();
  for (const payment of rawPayments) {
    if (!payment.customer_id) continue;
    spendByCustomer.set(
      payment.customer_id,
      (spendByCustomer.get(payment.customer_id) ?? 0) + payment.amount_cents
    );
  }

  const notesByCustomer = new Map<string, number>();
  for (const note of rawNotes) {
    notesByCustomer.set(
      note.customer_id,
      (notesByCustomer.get(note.customer_id) ?? 0) + 1
    );
  }

  const invitesByCustomer = new Map<string, RawInvitationRow[]>();
  for (const inv of rawInvitations) {
    const existing = invitesByCustomer.get(inv.customer_id) ?? [];
    existing.push(inv);
    invitesByCustomer.set(inv.customer_id, existing);
  }

  const now = new Date();
  const nowMs = now.getTime();
  const monthStartMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).getTime();

  const items: CustomerRegistryItem[] = rawCustomers.map((row) => {
    const visitSummary = visitsByCustomer.get(row.id) ?? {
      count: 0,
      lastVisitAt: null,
    };
    const customerInvites = invitesByCustomer.get(row.id) ?? [];
    const inviteStatus = computeDisplayInviteStatus(
      row.profile_id,
      customerInvites,
      nowMs
    );

    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      birthday: row.birthday,
      marketingOptIn: row.marketing_opt_in,
      accountType: row.profile_id ? "registered" : "walk_in",
      inviteStatus,
      archivedAt: row.archived_at,
      notesCount: notesByCustomer.get(row.id) ?? 0,
      lastVisitAt: visitSummary.lastVisitAt,
      totalVisits: visitSummary.count,
      lifetimeSpendCents: spendByCustomer.get(row.id) ?? 0,
      createdAt: row.created_at,
    };
  });

  // Sort active customers by most recent visit first, then newest created
  items.sort((a, b) => {
    const aTime = a.lastVisitAt
      ? new Date(a.lastVisitAt).getTime()
      : new Date(a.createdAt).getTime();
    const bTime = b.lastVisitAt
      ? new Date(b.lastVisitAt).getTime()
      : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  const activeCustomers = items.filter((c) => !c.archivedAt);
  const totalCustomers = activeCustomers.length;
  const newThisMonth = activeCustomers.filter(
    (c) => new Date(c.createdAt).getTime() >= monthStartMs
  ).length;
  const returningCount = activeCustomers.filter((c) => c.totalVisits > 1).length;
  const returningPercentage =
    totalCustomers > 0
      ? Math.round((returningCount / totalCustomers) * 100)
      : 0;
  const invitesPending = activeCustomers.filter(
    (c) => c.inviteStatus === "invite_sent"
  ).length;

  return {
    success: true,
    message: "Customers loaded.",
    data: {
      meta,
      stats: {
        totalCustomers,
        newThisMonth,
        returningPercentage,
        invitesPending,
      },
      customers: items,
    },
  };
}

export async function getCustomerProfileAction(
  tenantIdParam: string | undefined,
  customerId: string
): Promise<CustomerActionResult<CustomerProfileWorkspaceData>> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, meta } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const { data: rawCustomer, error: customerError } = await db
    .from("customers")
    .select(
      "id, tenant_id, profile_id, full_name, email, phone, birthday, marketing_opt_in, archived_at, created_at"
    )
    .eq("tenant_id", meta.tenantId)
    .eq("id", customerId)
    .maybeSingle<RawCustomerRow>();

  if (customerError) {
    return {
      success: false,
      error: `Failed to load customer: ${customerError.message}`,
    };
  }
  if (!rawCustomer) {
    return { success: false, error: "Customer record not found." };
  }

  const [appointmentsRes, paymentsRes, notesRes, invitationsRes, staffRes, servicesRes] =
    await Promise.all([
      db
        .from("appointments")
        .select("id, customer_id, staff_id, status, starts_at, total_cents")
        .eq("tenant_id", meta.tenantId)
        .eq("customer_id", customerId)
        .order("starts_at", { ascending: false }),
      db
        .from("payments")
        .select("id, appointment_id, customer_id, amount_cents, status")
        .eq("tenant_id", meta.tenantId)
        .eq("customer_id", customerId),
      db
        .from("customer_notes")
        .select("id, customer_id, author_id, body, created_at")
        .eq("tenant_id", meta.tenantId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      db
        .from("customer_invitations")
        .select(
          "id, tenant_id, customer_id, email, status, invited_by, sent_at, expires_at, accepted_at, canceled_at"
        )
        .eq("tenant_id", meta.tenantId)
        .eq("customer_id", customerId)
        .order("sent_at", { ascending: false }),
      db
        .from("staff_members")
        .select("id, full_name")
        .eq("tenant_id", meta.tenantId),
      db
        .from("services")
        .select("id, name")
        .eq("tenant_id", meta.tenantId),
    ]);

  const rawAppointments = (appointmentsRes.data ?? []) as RawAppointmentRow[];
  const rawPayments = (paymentsRes.data ?? []) as RawPaymentRow[];
  const rawNotes = (notesRes.data ?? []) as RawNoteRow[];
  const rawInvitations = (invitationsRes.data ?? []) as RawInvitationRow[];
  const staffMap = new Map<string, string>(
    ((staffRes.data ?? []) as RawStaffRow[]).map((s) => [s.id, s.full_name])
  );
  const serviceNameMap = new Map<string, string>(
    ((servicesRes.data ?? []) as RawServiceRow[]).map((s) => [s.id, s.name])
  );

  // Load appointment_services for this customer's appointments
  const appointmentIds = rawAppointments.map((a) => a.id);
  const serviceLinesByAppointment = new Map<string, RawAppointmentServiceRow[]>();
  if (appointmentIds.length > 0) {
    const { data: apptServices } = await db
      .from("appointment_services")
      .select("appointment_id, service_id, price_cents")
      .eq("tenant_id", meta.tenantId)
      .in("appointment_id", appointmentIds);

    for (const line of (apptServices ?? []) as RawAppointmentServiceRow[]) {
      const list = serviceLinesByAppointment.get(line.appointment_id) ?? [];
      list.push(line);
      serviceLinesByAppointment.set(line.appointment_id, list);
    }
  }

  // Load author/inviter profile names
  const profileIds = Array.from(
    new Set([
      ...rawNotes.map((n) => n.author_id),
      ...rawInvitations
        .map((i) => i.invited_by)
        .filter((id): id is string => Boolean(id)),
    ])
  );
  const profileNameMap = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profilesData } = await db
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds);
    for (const p of (profilesData ?? []) as RawProfileRow[]) {
      profileNameMap.set(p.id, p.full_name?.trim() || p.email || "Staff member");
    }
  }

  // Index payments by appointment_id
  const paymentsByAppointment = new Map<string, RawPaymentRow[]>();
  let lifetimeSpendCents = 0;
  for (const payment of rawPayments) {
    if (payment.status === "paid") {
      lifetimeSpendCents += payment.amount_cents;
    }
    if (payment.appointment_id) {
      const list = paymentsByAppointment.get(payment.appointment_id) ?? [];
      list.push(payment);
      paymentsByAppointment.set(payment.appointment_id, list);
    }
  }

  const visits: CustomerVisitItem[] = rawAppointments.map((appt) => {
    const lines = serviceLinesByAppointment.get(appt.id) ?? [];
    const serviceNames = lines
      .map((line) => serviceNameMap.get(line.service_id))
      .filter((name): name is string => Boolean(name));

    const linkedPayments = paymentsByAppointment.get(appt.id) ?? [];
    const paidPayment = linkedPayments.find((p) => p.status === "paid");
    const refundedPayment = linkedPayments.find((p) => p.status === "refunded");
    const pendingPayment = linkedPayments.find((p) => p.status === "pending");

    let paymentStatus: CustomerVisitItem["paymentStatus"] = "unpaid";
    if (paidPayment) {
      paymentStatus = "paid";
    } else if (refundedPayment) {
      paymentStatus = "refunded";
    } else if (pendingPayment) {
      paymentStatus = "pending";
    }

    const lineTotal = lines.reduce((sum, l) => sum + l.price_cents, 0);
    const amountCents =
      paidPayment?.amount_cents ??
      (appt.total_cents > 0 ? appt.total_cents : lineTotal);

    return {
      id: appt.id,
      visitDate: appt.starts_at,
      serviceName:
        serviceNames.length > 0 ? serviceNames.join(", ") : "Scheduled service",
      staffName:
        (appt.staff_id ? staffMap.get(appt.staff_id) : null) ?? "Unassigned",
      appointmentStatus: appt.status,
      amountCents,
      paymentStatus,
    };
  });

  const nowMs = Date.now();
  const invitations: CustomerInvitationItem[] = rawInvitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    status: inv.status,
    effectiveStatus: resolveEffectiveInviteStatus(inv, nowMs),
    sentAt: inv.sent_at,
    expiresAt: inv.expires_at,
    acceptedAt: inv.accepted_at,
    canceledAt: inv.canceled_at,
    invitedByName: inv.invited_by
      ? (profileNameMap.get(inv.invited_by) ?? "Staff member")
      : null,
  }));

  const activeInvite =
    invitations.find((i) => i.effectiveStatus === "pending") ?? null;

  const notes: CustomerNoteItem[] = rawNotes.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.created_at,
    authorName: profileNameMap.get(n.author_id) ?? "Staff member",
  }));

  const detail: CustomerProfileDetail = {
    id: rawCustomer.id,
    fullName: rawCustomer.full_name,
    email: rawCustomer.email,
    phone: rawCustomer.phone,
    birthday: rawCustomer.birthday,
    marketingOptIn: rawCustomer.marketing_opt_in,
    accountType: rawCustomer.profile_id ? "registered" : "walk_in",
    inviteStatus: computeDisplayInviteStatus(
      rawCustomer.profile_id,
      rawInvitations,
      nowMs
    ),
    archivedAt: rawCustomer.archived_at,
    lastVisitAt: rawAppointments[0]?.starts_at ?? null,
    totalVisits: rawAppointments.length,
    lifetimeSpendCents,
    activeInvite,
    invitations,
    notes,
    visits,
  };

  return {
    success: true,
    message: "Customer profile loaded.",
    data: { meta, customer: detail },
  };
}

export async function createCustomerAction(
  tenantIdParam: string | undefined,
  input: CreateCustomerInput
): Promise<
  CustomerActionResult<{
    customerId: string;
    fullName: string;
    inviteSent: boolean;
    inviteUrl?: string;
    emailDelivered?: boolean;
    deliveryWarning?: string;
  }>
> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form fields.",
      fieldErrors,
    };
  }

  const { supabase, meta, userId } = resolved;
  const db = supabase as unknown as SupabaseClient;
  const clean = parsed.data;

  const { data: created, error: createError } = await db
    .from("customers")
    .insert({
      tenant_id: meta.tenantId,
      full_name: clean.fullName,
      email: clean.email ? clean.email.toLowerCase() : null,
      phone: clean.phone,
      birthday: clean.birthday || null,
      marketing_opt_in: clean.marketingOptIn,
    })
    .select("id, full_name")
    .single<{ id: string; full_name: string }>();

  if (createError || !created) {
    return {
      success: false,
      error: `Unable to add customer: ${createError?.message ?? "Unknown error"}`,
    };
  }

  let inviteSent = false;
  let inviteUrl: string | undefined;
  let emailDelivered: boolean | undefined;
  let deliveryWarning: string | undefined;

  if (clean.sendInvite && clean.email) {
    const inviteRes = await issueCustomerInviteInternal({
      db,
      tenantId: meta.tenantId,
      customerId: created.id,
      customerName: created.full_name,
      email: clean.email,
      businessName: meta.businessName,
      invitedBy: userId,
    });
    if (inviteRes.success) {
      inviteSent = true;
      inviteUrl = inviteRes.inviteUrl;
      emailDelivered = inviteRes.emailDelivered;
      deliveryWarning = inviteRes.deliveryWarning;
    } else {
      deliveryWarning = inviteRes.error;
    }
  }

  revalidateCustomerPaths(meta.tenantSlug, created.id);

  return {
    success: true,
    message: "Customer added.",
    data: {
      customerId: created.id,
      fullName: created.full_name,
      inviteSent,
      inviteUrl,
      emailDelivered,
      deliveryWarning,
    },
  };
}

export async function updateCustomerAction(
  tenantIdParam: string | undefined,
  customerId: string,
  input: UpdateCustomerInput
): Promise<CustomerActionResult> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form fields.",
      fieldErrors,
    };
  }

  const { supabase, meta } = resolved;
  const db = supabase as unknown as SupabaseClient;
  const clean = parsed.data;

  const { error } = await db
    .from("customers")
    .update({
      full_name: clean.fullName,
      email: clean.email ? clean.email.toLowerCase() : null,
      phone: clean.phone,
      birthday: clean.birthday || null,
      marketing_opt_in: clean.marketingOptIn,
    })
    .eq("tenant_id", meta.tenantId)
    .eq("id", customerId);

  if (error) {
    return {
      success: false,
      error: `Unable to update customer: ${error.message}`,
    };
  }

  revalidateCustomerPaths(meta.tenantSlug, customerId);
  return { success: true, message: "Customer changes saved." };
}

export async function setCustomerArchivedAction(
  tenantIdParam: string | undefined,
  customerId: string,
  archived: boolean
): Promise<CustomerActionResult> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, meta } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const { error } = await db
    .from("customers")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("tenant_id", meta.tenantId)
    .eq("id", customerId);

  if (error) {
    return {
      success: false,
      error: `Unable to update customer archive state: ${error.message}`,
    };
  }

  revalidateCustomerPaths(meta.tenantSlug, customerId);
  return {
    success: true,
    message: archived ? "Customer archived." : "Customer restored.",
  };
}

export async function addCustomerNoteAction(
  tenantIdParam: string | undefined,
  customerId: string,
  body: string
): Promise<CustomerActionResult<CustomerNoteItem>> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const parsed = customerNoteSchema.safeParse({ body });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter a note before posting.",
    };
  }

  const { supabase, meta, userId } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const { data: created, error } = await db
    .from("customer_notes")
    .insert({
      tenant_id: meta.tenantId,
      customer_id: customerId,
      author_id: userId,
      body: parsed.data.body,
    })
    .select("id, body, created_at")
    .single<{ id: string; body: string; created_at: string }>();

  if (error || !created) {
    return {
      success: false,
      error: `Unable to post note: ${error?.message ?? "Unknown error"}`,
    };
  }

  revalidateCustomerPaths(meta.tenantSlug, customerId);

  return {
    success: true,
    message: "Note added.",
    data: {
      id: created.id,
      body: created.body,
      createdAt: created.created_at,
      authorName: meta.userName,
    },
  };
}

export async function sendCustomerInviteAction(
  tenantIdParam: string | undefined,
  customerId: string
): Promise<
  CustomerActionResult<{
    inviteUrl: string;
    emailDelivered: boolean;
    deliveryWarning?: string;
  }>
> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, meta, userId } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const { data: customer, error: fetchError } = await db
    .from("customers")
    .select("id, full_name, email, profile_id, archived_at")
    .eq("tenant_id", meta.tenantId)
    .eq("id", customerId)
    .maybeSingle<RawCustomerRow>();

  if (fetchError || !customer) {
    return { success: false, error: "Customer record not found." };
  }

  if (customer.profile_id) {
    return {
      success: false,
      error: "This customer already has a registered account.",
    };
  }

  if (!customer.email || !customer.email.trim()) {
    return {
      success: false,
      error: "Add an email address to this customer before sending an invite.",
    };
  }

  const inviteRes = await issueCustomerInviteInternal({
    db,
    tenantId: meta.tenantId,
    customerId: customer.id,
    customerName: customer.full_name,
    email: customer.email,
    businessName: meta.businessName,
    invitedBy: userId,
  });

  if (!inviteRes.success) {
    return { success: false, error: inviteRes.error };
  }

  revalidateCustomerPaths(meta.tenantSlug, customerId);

  return {
    success: true,
    message: "The invite link has been sent successfully.",
    data: {
      inviteUrl: inviteRes.inviteUrl,
      emailDelivered: inviteRes.emailDelivered,
      deliveryWarning: inviteRes.deliveryWarning,
    },
  };
}

export async function cancelCustomerInviteAction(
  tenantIdParam: string | undefined,
  customerId: string
): Promise<CustomerActionResult> {
  const resolved = await resolveOperationalAccess(tenantIdParam);
  if (!resolved.success) {
    return { success: false, error: resolved.error };
  }

  const { supabase, meta } = resolved;
  const db = supabase as unknown as SupabaseClient;

  const { error } = await db
    .from("customer_invitations")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("tenant_id", meta.tenantId)
    .eq("customer_id", customerId)
    .eq("status", "pending");

  if (error) {
    return {
      success: false,
      error: `Unable to cancel invitation: ${error.message}`,
    };
  }

  revalidateCustomerPaths(meta.tenantSlug, customerId);
  return {
    success: true,
    message: "The invite link has been canceled successfully.",
  };
}

/** Public helper: inspect a customer invite token for the /invite/customer/[token] page. */
export async function previewCustomerInviteAction(
  rawToken: string
): Promise<CustomerInvitePreview> {
  const admin = getAdminClient();
  if (!admin || !rawToken.trim()) {
    return { valid: false, reason: "invalid" };
  }

  const db = admin as unknown as SupabaseClient;
  const tokenHash = hashInviteToken(rawToken.trim());

  const { data: invite } = await db
    .from("customer_invitations")
    .select("id, tenant_id, customer_id, email, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<RawInvitationRow>();

  if (!invite) {
    return { valid: false, reason: "invalid" };
  }

  if (invite.status === "canceled" || invite.status === "superseded") {
    return { valid: false, reason: "canceled" };
  }

  if (invite.status === "accepted") {
    return { valid: false, reason: "already_registered" };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  const [{ data: customer }, { data: tenant }] = await Promise.all([
    db
      .from("customers")
      .select("id, full_name, profile_id")
      .eq("id", invite.customer_id)
      .maybeSingle<{ id: string; full_name: string; profile_id: string | null }>(),
    db
      .from("tenants")
      .select("id, name, slug")
      .eq("id", invite.tenant_id)
      .maybeSingle<{ id: string; name: string; slug: string }>(),
  ]);

  if (!customer || !tenant) {
    return { valid: false, reason: "invalid" };
  }

  if (customer.profile_id) {
    return {
      valid: false,
      reason: "already_registered",
      businessName: tenant.name,
      tenantSlug: tenant.slug,
    };
  }

  return {
    valid: true,
    businessName: tenant.name,
    tenantSlug: tenant.slug,
    customerName: customer.full_name,
    email: invite.email,
    expiresAt: invite.expires_at,
  };
}

/** Public action: customer sets a password from the invite email and links their walk-in record. */
export async function acceptCustomerInviteAction(
  rawToken: string,
  password: string,
  confirmPassword: string
): Promise<CustomerActionResult<{ tenantSlug: string; businessName: string }>> {
  const parsed = acceptCustomerInviteSchema.safeParse({
    password,
    confirmPassword,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Please check your password.",
    };
  }

  const admin = getAdminClient();
  if (!admin) {
    return {
      success: false,
      error: "Account activation is unavailable because server credentials are not configured.",
    };
  }

  const db = admin as unknown as SupabaseClient;
  const tokenHash = hashInviteToken(rawToken.trim());

  const { data: invite } = await db
    .from("customer_invitations")
    .select("id, tenant_id, customer_id, email, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle<RawInvitationRow>();

  if (!invite || invite.status !== "pending") {
    return {
      success: false,
      error: "This invitation link is no longer active. Please ask the business for a new invite.",
    };
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await db
      .from("customer_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return {
      success: false,
      error: "This invitation link has expired. Please ask the business to resend it.",
    };
  }

  if (!(await isTenantOpen(admin, invite.tenant_id))) {
    return { success: false, error: SUSPENDED_MESSAGE };
  }

  const [{ data: customer }, { data: tenant }] = await Promise.all([
    db
      .from("customers")
      .select("id, full_name, profile_id")
      .eq("id", invite.customer_id)
      .maybeSingle<{ id: string; full_name: string; profile_id: string | null }>(),
    db
      .from("tenants")
      .select("id, name, slug")
      .eq("id", invite.tenant_id)
      .maybeSingle<{ id: string; name: string; slug: string }>(),
  ]);

  if (!customer || !tenant) {
    return { success: false, error: "Customer record not found." };
  }

  if (customer.profile_id) {
    return {
      success: false,
      error: "This customer record is already linked to a registered account.",
    };
  }

  // Create Supabase Auth user (or link if an account with the same email already exists)
  let authUserId: string | null = null;
  const { data: createdAuth, error: authCreateError } =
    await admin.auth.admin.createUser({
      email: invite.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: customer.full_name },
      app_metadata: { role: "customer" },
    });

  if (createdAuth?.user?.id) {
    authUserId = createdAuth.user.id;
  } else if (
    authCreateError &&
    /already been registered|already exists/i.test(authCreateError.message)
  ) {
    const { data: existingProfile } = await db
      .from("profiles")
      .select("id")
      .ilike("email", invite.email)
      .maybeSingle<{ id: string }>();

    if (existingProfile?.id) {
      await admin.auth.admin.updateUserById(existingProfile.id, {
        password: parsed.data.password,
        email_confirm: true,
      });
      authUserId = existingProfile.id;
    } else {
      return {
        success: false,
        error: "An account with this email already exists. Please contact the business for help.",
      };
    }
  } else {
    return {
      success: false,
      error: authCreateError?.message ?? "Unable to create customer account.",
    };
  }

  // Ensure profile exists & link customer record while keeping all visit history and notes intact
  await db.from("profiles").upsert(
    {
      id: authUserId,
      email: invite.email,
      full_name: customer.full_name,
      role: "customer",
    },
    { onConflict: "id" }
  );

  const { error: linkError } = await db
    .from("customers")
    .update({ profile_id: authUserId, email: invite.email })
    .eq("id", customer.id)
    .eq("tenant_id", invite.tenant_id);

  if (linkError) {
    return {
      success: false,
      error: `Account created, but linking your record failed: ${linkError.message}`,
    };
  }

  await db
    .from("customer_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  revalidateCustomerPaths(tenant.slug, customer.id);

  return {
    success: true,
    message: "Your customer account is now active.",
    data: {
      tenantSlug: tenant.slug,
      businessName: tenant.name,
    },
  };
}