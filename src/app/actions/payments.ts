"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { logError } from "@/lib/log";
import { canManageBookings, workspaceRoleFromLabel } from "@/lib/merchant/workspace-roles";
import {
  calculateChangeAndApplied,
  calculateVatSplit,
  formatDateManila,
  formatPeso,
  normalizePaymentMethod,
  resolvePaymentMethodLabel,
} from "@/lib/payments";
import {
  formatTimeManila,
  getManilaDateKey,
  getManilaTodayKey,
  resolveCustomerName,
  resolveServiceName,
  resolveStaffName,
} from "@/lib/date-utils";
import type {
  AppointmentBalanceStatus,
  DailyCollectionPointDTO,
  MethodBreakdownItemDTO,
  PaymentActionResult,
  PaymentKpiSummaryDTO,
  PaymentMethod,
  PaymentRecordDTO,
  PaymentRecordStatus,
  PaymentsDashboardDTO,
  RecordPaymentInput,
  RecordPaymentSuccessData,
  RefundPaymentInput,
  UnsettledAppointmentDTO,
  VoidPaymentInput,
} from "@/types/payments";

/* ------------------------------------------------------------------ Helpers */

function mapUiMethodToDb(
  method: PaymentMethod,
  refOrNotes?: string
): "cash" | "card" | "gcash" | "maya" {
  if (method === "cash") return "cash";
  if (method === "card") return "card";
  const str = (refOrNotes || "").toLowerCase();
  if (str.includes("maya") || str.includes("paymaya")) return "maya";
  return "gcash";
}

async function revalidatePaymentsPaths(slug: string) {
  if (slug) {
    revalidatePath(`/${slug}/dashboard/payments`, "page");
    revalidatePath(`/${slug}/dashboard/appointments`, "page");
    revalidatePath(`/${slug}/dashboard/customers`, "page");
    revalidatePath(`/${slug}/dashboard`, "page");
  }
  revalidatePath("/[slug]/dashboard/payments", "page");
  revalidatePath("/[slug]/dashboard/appointments", "page");
  revalidatePath("/[slug]/dashboard/customers", "page");
  revalidatePath("/[slug]/dashboard", "page");
}

async function getVerifiedMerchantUser(tenantId: string) {
  const supabase = await createClient();
  const access = await resolveTenantAccess(supabase, tenantId);
  if (!access) {
    return { ok: false as const, error: "You cannot make changes for this business. It may be suspended, or you may not be a member." };
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", access.userId).maybeSingle();

  return {
    ok: true as const,
    userId: access.userId,
    role: workspaceRoleFromLabel(access.role),
    userName: profile?.full_name?.trim() || "Staff Member",
    supabase,
    // clients can only read payments: writes happen here, after the role check
    ledger: createAdminClient(),
  };
}

/* ----------------------------------------------------------- Record Payment */

const recordPaymentSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant identifier."),
  slug: z.string().min(1, "Slug is required."),
  appointmentId: z.string().uuid("Invalid appointment identifier."),
  method: z.enum(["cash", "ewallet", "card"]),
  amountCents: z.number().int().positive("Payment amount must be greater than zero."),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordPaymentAction(
  rawInput: RecordPaymentInput
): Promise<PaymentActionResult<RecordPaymentSuccessData>> {
  const parsed = recordPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid payment details submitted." };
  }

  const input = parsed.data;
  const auth = await getVerifiedMerchantUser(input.tenantId);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!canManageBookings(auth.role)) {
    return { ok: false, error: "Your role does not have permission to record payments." };
  }

  const { supabase } = auth;

  // 1. Fetch appointment details with existing payments
  const { data: appointment, error: aptError } = await supabase
    .from("appointments")
    .select(`
      id,
      tenant_id,
      customer_id,
      total_cents,
      paid_cents,
      payment_status,
      status,
      notes,
      customers(full_name),
      staff_members(full_name),
      appointment_services(services(name)),
      payments(id, amount_cents, status)
    `)
    .eq("id", input.appointmentId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (aptError || !appointment) {
    return { ok: false, error: "The selected appointment could not be found." };
  }

  if (appointment.status === "cancelled") {
    return { ok: false, error: "Cannot record payments for a cancelled appointment." };
  }

  // 2. Calculate remaining balance from non-voided/non-refunded payments
  const validPayments = (appointment.payments || []).filter(
    (p) => p.status === "paid" || p.status === "pending"
  );
  const currentPaidCents = validPayments.reduce((sum, p) => sum + p.amount_cents, 0);
  const totalCents = appointment.total_cents;
  const remainingBalanceCents = Math.max(0, totalCents - currentPaidCents);

  if (remainingBalanceCents <= 0) {
    return { ok: false, error: "This appointment has already been settled in full." };
  }

  // 3. Compute change and applied amount
  const { appliedCents, changeCents } = calculateChangeAndApplied(
    input.amountCents,
    remainingBalanceCents,
    input.method
  );

  if (input.method !== "cash" && input.amountCents > remainingBalanceCents) {
    return {
      ok: false,
      error: `Payment amount (${formatPeso(input.amountCents)}) exceeds remaining balance (${formatPeso(
        remainingBalanceCents
      )}). Overpayment is only accepted for cash transactions.`,
    };
  }

  // 4. Fetch tenant VAT rate
  const { data: tenantSettings } = await supabase
    .from("tenant_settings")
    .select("vat_rate_percent")
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  const vatRate = Number(tenantSettings?.vat_rate_percent ?? 12);
  const { netCents, vatCents } = calculateVatSplit(appliedCents, vatRate);

  // 5. Determine resulting appointment balance and status
  const newTotalPaidCents = currentPaidCents + appliedCents;
  const newBalanceCents = Math.max(0, totalCents - newTotalPaidCents);
  const resultingStatus: AppointmentBalanceStatus = newBalanceCents === 0 ? "paid" : "partial";

  const nowIso = new Date().toISOString();
  const refNum = input.referenceNumber?.trim() || null;
  const dbMethod = mapUiMethodToDb(input.method, `${input.referenceNumber || ""} ${input.notes || ""}`);

  // 6. Insert payment row into public.payments
  const { data: insertedPayment, error: insertError } = await auth.ledger
    .from("payments")
    .insert({
      tenant_id: input.tenantId,
      appointment_id: input.appointmentId,
      customer_id: appointment.customer_id,
      amount_cents: appliedCents,
      currency: "PHP",
      method: dbMethod,
      status: "paid",
      reference: refNum,
      reference_number: refNum,
      notes: input.notes?.trim() || null,
      paid_at: nowIso,
      created_by: auth.userId,
      recorded_by: auth.userId,
      net_cents: netCents,
      vat_cents: vatCents,
    })
    .select("id")
    .single();

  if (insertError || !insertedPayment) {
    logError("payments.record", insertError);
    return { ok: false, error: "Failed to save the payment record." };
  }

  await revalidatePaymentsPaths(input.slug);

  const customerName = resolveCustomerName(appointment.customers, appointment.notes);
  const createdPayment: PaymentRecordDTO = {
    id: insertedPayment.id,
    appointmentId: input.appointmentId,
    customerId: appointment.customer_id,
    customerName,
    serviceSummary: resolveServiceName(appointment.appointment_services),
    staffName: resolveStaffName(appointment.staff_members),
    method: input.method,
    methodLabel: resolvePaymentMethodLabel(input.method),
    referenceNumber: refNum,
    amountCents: appliedCents,
    netCents,
    vatCents,
    appointmentTotalCents: totalCents,
    appointmentPaidCents: newTotalPaidCents,
    appointmentBalanceCents: newBalanceCents,
    status: resultingStatus === "paid" ? "paid" : "partial",
    recordedByName: auth.userName,
    notes: input.notes?.trim() || null,
    voidReason: null,
    voidedAt: null,
    refundReason: null,
    refundedAt: null,
    paidAt: nowIso,
    formattedDate: formatDateManila(nowIso),
    formattedTime: formatTimeManila(nowIso),
  };

  return {
    ok: true,
    data: {
      payment: createdPayment,
      changeCents,
    },
  };
}

/* ------------------------------------------------------------- Void Payment */

const voidPaymentSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant identifier."),
  slug: z.string().min(1, "Slug is required."),
  paymentId: z.string().uuid("Invalid payment identifier."),
  reason: z.string().trim().min(3, "Reason for voiding must be at least 3 characters."),
});

export async function voidPaymentAction(rawInput: VoidPaymentInput): Promise<PaymentActionResult> {
  const parsed = voidPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid void request submitted." };
  }

  const input = parsed.data;
  const auth = await getVerifiedMerchantUser(input.tenantId);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  // Only owners and admins can void financial transactions
  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      ok: false,
      error: "Permission denied. Only business owners and administrators have authorization to void recorded payments.",
    };
  }

  const { supabase } = auth;

  // 1. Fetch payment record
  const { data: payment, error: pError } = await supabase
    .from("payments")
    .select("id, tenant_id, appointment_id, amount_cents, status")
    .eq("id", input.paymentId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (pError || !payment) {
    return { ok: false, error: "The payment record was not found." };
  }

  if (payment.status === "voided") {
    return { ok: false, error: "This payment has already been voided." };
  }

  if (payment.status === "refunded") {
    return { ok: false, error: "This payment has been refunded and cannot be voided." };
  }

  const nowIso = new Date().toISOString();

  // 2. Soft-void payment record
  const { error: updateError } = await auth.ledger
    .from("payments")
    .update({
      status: "voided",
      void_reason: input.reason,
      voided_at: nowIso,
      voided_by: auth.userId,
      updated_at: nowIso,
    })
    .eq("id", input.paymentId)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    return { ok: false, error: "Failed to update payment status." };
  }

  await revalidatePaymentsPaths(input.slug);
  return { ok: true, data: { paymentId: input.paymentId } };
}

/* ----------------------------------------------------------- Refund Payment */

const refundPaymentSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant identifier."),
  slug: z.string().min(1, "Slug is required."),
  paymentId: z.string().uuid("Invalid payment identifier."),
  amountCents: z.number().int().positive("Refund amount must be greater than zero."),
  reason: z.string().trim().min(3, "Reason for refund must be at least 3 characters."),
});

export async function refundPaymentAction(rawInput: RefundPaymentInput): Promise<PaymentActionResult> {
  const parsed = refundPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "Invalid refund request submitted." };
  }

  const input = parsed.data;
  const auth = await getVerifiedMerchantUser(input.tenantId);
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (auth.role !== "owner" && auth.role !== "admin") {
    return {
      ok: false,
      error: "Permission denied. Only business owners and administrators have authorization to issue refunds.",
    };
  }

  const { supabase } = auth;

  const { data: payment, error: pError } = await supabase
    .from("payments")
    .select("id, tenant_id, appointment_id, amount_cents, status")
    .eq("id", input.paymentId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();

  if (pError || !payment) {
    return { ok: false, error: "The payment record was not found." };
  }

  if (payment.status !== "paid") {
    return { ok: false, error: `Only settled payments can be refunded (current status: ${payment.status}).` };
  }

  if (input.amountCents > payment.amount_cents) {
    return {
      ok: false,
      error: `Refund amount (${formatPeso(input.amountCents)}) cannot exceed original payment (${formatPeso(
        payment.amount_cents
      )}).`,
    };
  }

  const nowIso = new Date().toISOString();

  const { error: updateError } = await auth.ledger
    .from("payments")
    .update({
      status: "refunded",
      refund_reason: input.reason,
      refunded_at: nowIso,
      refunded_by: auth.userId,
      updated_at: nowIso,
    })
    .eq("id", input.paymentId)
    .eq("tenant_id", input.tenantId);

  if (updateError) {
    return { ok: false, error: "Failed to record refund status." };
  }

  await revalidatePaymentsPaths(input.slug);
  return { ok: true, data: { paymentId: input.paymentId } };
}

/* --------------------------------------------------- Dashboard Data Query */

export async function fetchPaymentsDashboardData(
  tenantId: string
): Promise<PaymentsDashboardDTO> {
  const supabase = await createClient();

  // 1. Fetch tenant VAT setting
  const { data: tenantSettings } = await supabase
    .from("tenant_settings")
    .select("vat_rate_percent")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const vatRatePercent = Number(tenantSettings?.vat_rate_percent ?? 12);

  // 2. Fetch all payment records for this tenant with ONLY flat scalar columns (zero nested joins)
  const { data: rawPayments, error: paymentsError } = await supabase
    .from("payments")
    .select(
      "id, tenant_id, appointment_id, customer_id, amount_cents, currency, method, status, reference, reference_number, notes, paid_at, created_by, created_at, updated_at, recorded_by, void_reason, voided_at, voided_by, refund_reason, refunded_at, refunded_by, net_cents, vat_cents"
    )
    .eq("tenant_id", tenantId)
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error("[payments/page] payments query failed:", {
      code: paymentsError.code,
      message: paymentsError.message,
      details: paymentsError.details,
      hint: paymentsError.hint,
    });
  }

  // 3. Fetch all active non-cancelled appointments for this tenant to compute balances & unsettled list
  const { data: appointmentsRaw, error: appointmentsError } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      status,
      total_cents,
      paid_cents,
      payment_status,
      notes,
      customer_id,
      customers (full_name),
      staff_members (full_name),
      appointment_services (services (name)),
      payments (id, amount_cents, status)
    `)
    .eq("tenant_id", tenantId)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: false });

  if (appointmentsError) {
    console.error("[payments/page] appointments query failed:", {
      code: appointmentsError.code,
      message: appointmentsError.message,
      details: appointmentsError.details,
      hint: appointmentsError.hint,
    });
  }

  const appointmentsList = appointmentsRaw || [];
  const paymentsList = rawPayments || [];

  // Build Map<appointmentId, appointment> for fast, reliable O(1) in-memory stitching
  const appointmentMap = new Map<string, (typeof appointmentsList)[number]>();
  for (const apt of appointmentsList) {
    appointmentMap.set(apt.id, apt);
  }

  // Batch-load customer names for standalone customer_ids on payments
  const customerIds = Array.from(
    new Set(
      paymentsList
        .map((p) => p.customer_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const customerMap = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id, full_name")
      .in("id", customerIds);

    if (customersError) {
      console.error("[payments/page] customers batch query failed:", {
        code: customersError.code,
        message: customersError.message,
        details: customersError.details,
        hint: customersError.hint,
      });
    } else if (customersData) {
      for (const c of customersData) {
        if (c.full_name) {
          customerMap.set(c.id, c.full_name.trim());
        }
      }
    }
  }

  // Batch-load profile names for recorder IDs without fragile ambiguous joins
  const recorderIds = Array.from(
    new Set(
      paymentsList
        .flatMap((p) => [p.recorded_by, p.created_by, p.voided_by, p.refunded_by])
        .filter((id): id is string => Boolean(id))
    )
  );

  const profileMap = new Map<string, string>();
  if (recorderIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", recorderIds);

    if (profilesError) {
      console.error("[payments/page] profiles batch query failed:", {
        code: profilesError.code,
        message: profilesError.message,
        details: profilesError.details,
        hint: profilesError.hint,
      });
    } else if (profiles) {
      for (const pr of profiles) {
        if (pr.full_name) {
          profileMap.set(pr.id, pr.full_name.trim());
        }
      }
    }
  }

  // Map Unsettled Appointments
  const unsettledAppointments: UnsettledAppointmentDTO[] = [];
  let totalOutstandingCents = 0;
  let outstandingAppointmentsCount = 0;

  for (const apt of appointmentsList) {
    const validPayments = (apt.payments || []).filter(
      (p) => p.status === "paid" || p.status === "pending"
    );
    const calculatedPaidCents = validPayments.reduce((sum, p) => sum + p.amount_cents, 0);
    const balanceCents = Math.max(0, apt.total_cents - calculatedPaidCents);

    if (balanceCents > 0) {
      totalOutstandingCents += balanceCents;
      outstandingAppointmentsCount++;

      unsettledAppointments.push({
        appointmentId: apt.id,
        startsAt: apt.starts_at,
        formattedDate: formatDateManila(apt.starts_at),
        formattedTime: formatTimeManila(apt.starts_at),
        customerId: apt.customer_id,
        customerName: resolveCustomerName(apt.customers, apt.notes),
        serviceSummary: resolveServiceName(apt.appointment_services),
        staffName: resolveStaffName(apt.staff_members),
        appointmentStatus: apt.status,
        totalCents: apt.total_cents,
        paidCents: calculatedPaidCents,
        balanceCents,
        paymentStatus: calculatedPaidCents > 0 ? "partial" : "unpaid",
      });
    }
  }

  // Map Payment Records using in-memory Map lookups
  const paymentHistory: PaymentRecordDTO[] = paymentsList.map((p) => {
    const apt = p.appointment_id ? appointmentMap.get(p.appointment_id) : undefined;
    const aptTotalCents = apt?.total_cents || p.amount_cents;
    const aptValidPayments = ((apt?.payments as Array<{ amount_cents: number; status: string }>) || []).filter(
      (sub: { amount_cents: number; status: string }) => sub.status === "paid" || sub.status === "pending"
    );
    const aptPaidCents =
      aptValidPayments.length > 0
        ? aptValidPayments.reduce((sum: number, sub: { amount_cents: number }) => sum + sub.amount_cents, 0)
        : p.amount_cents;
    const aptBalanceCents = Math.max(0, aptTotalCents - aptPaidCents);

    const directCustomerName = p.customer_id ? customerMap.get(p.customer_id) : undefined;
    const aptCustomerName = apt ? resolveCustomerName(apt.customers, apt.notes) : undefined;
    const customerName = directCustomerName || aptCustomerName || "Walk-in Customer";

    const serviceSummary = apt ? resolveServiceName(apt.appointment_services) : "General Service";
    const staffName = apt ? resolveStaffName(apt.staff_members) : "Staff Member";
    const recorderId = p.recorded_by || p.created_by;
    const recordedByName = (recorderId ? profileMap.get(recorderId) : null) || "Staff Member";

    const normalizedMethod = normalizePaymentMethod(p.method);
    const rawStatus = (p.status || "paid").toLowerCase();
    const status: PaymentRecordStatus =
      rawStatus === "voided"
        ? "voided"
        : rawStatus === "refunded"
        ? "refunded"
        : aptBalanceCents > 0
        ? "partial"
        : "paid";

    const { netCents, vatCents } =
      p.net_cents && p.vat_cents
        ? { netCents: p.net_cents, vatCents: p.vat_cents }
        : calculateVatSplit(p.amount_cents, vatRatePercent);

    const paidAt = p.paid_at || p.created_at || new Date().toISOString();

    return {
      id: p.id,
      appointmentId: p.appointment_id,
      customerId: p.customer_id,
      customerName,
      serviceSummary,
      staffName,
      method: normalizedMethod,
      methodLabel: resolvePaymentMethodLabel(p.method),
      referenceNumber: p.reference_number || p.reference || null,
      amountCents: p.amount_cents,
      netCents,
      vatCents,
      appointmentTotalCents: aptTotalCents,
      appointmentPaidCents: aptPaidCents,
      appointmentBalanceCents: aptBalanceCents,
      status,
      recordedByName,
      notes: p.notes,
      voidReason: p.void_reason,
      voidedAt: p.voided_at,
      refundReason: p.refund_reason,
      refundedAt: p.refunded_at,
      paidAt,
      formattedDate: formatDateManila(paidAt),
      formattedTime: formatTimeManila(paidAt),
    };
  });

  paymentHistory.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  // Today's collections in Manila timezone
  const manilaTodayKey = getManilaTodayKey();
  const todayPaidRecords = paymentHistory.filter(
    (p) =>
      p.status !== "voided" &&
      p.status !== "refunded" &&
      getManilaDateKey(p.paidAt) === manilaTodayKey
  );

  const collectedTodayCents = todayPaidRecords.reduce((sum, p) => sum + p.amountCents, 0);
  const collectedTodayCount = todayPaidRecords.length;

  const allActivePaidRecords = paymentHistory.filter(
    (p) => p.status !== "voided" && p.status !== "refunded"
  );
  const averagePaymentCents =
    allActivePaidRecords.length > 0
      ? Math.round(
          allActivePaidRecords.reduce((sum, p) => sum + p.amountCents, 0) /
            allActivePaidRecords.length
        )
      : 0;

  const kpis: PaymentKpiSummaryDTO = {
    collectedTodayCents,
    collectedTodayCount,
    outstandingBalanceCents: totalOutstandingCents,
    outstandingAppointmentsCount,
    unsettledAppointmentsCount: unsettledAppointments.length,
    averagePaymentCents,
  };

  // Helper for generating daily series
  const buildDailySeries = (daysCount: number): DailyCollectionPointDTO[] => {
    const points: DailyCollectionPointDTO[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = getManilaDateKey(d);
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      }).format(d);

      const matchingRecords = paymentHistory.filter(
        (p) =>
          p.status !== "voided" &&
          p.status !== "refunded" &&
          getManilaDateKey(p.paidAt) === dateKey
      );

      const grossCents = matchingRecords.reduce((sum, p) => sum + p.amountCents, 0);
      const netCents = matchingRecords.reduce((sum, p) => sum + p.netCents, 0);

      points.push({
        dateKey,
        label,
        grossCents,
        netCents,
        count: matchingRecords.length,
      });
    }

    return points;
  };

  // Method Breakdown
  const methodMap: Record<PaymentMethod, { amountCents: number; count: number; label: string }> = {
    cash: { amountCents: 0, count: 0, label: "Cash" },
    ewallet: { amountCents: 0, count: 0, label: "E-wallet (GCash / Maya)" },
    card: { amountCents: 0, count: 0, label: "Card" },
  };

  for (const p of allActivePaidRecords) {
    if (methodMap[p.method]) {
      methodMap[p.method].amountCents += p.amountCents;
      methodMap[p.method].count += 1;
    }
  }

  const totalMethodAmountCents = Object.values(methodMap).reduce(
    (sum, m) => sum + m.amountCents,
    0
  );

  const methodBreakdown: MethodBreakdownItemDTO[] = (
    ["cash", "ewallet", "card"] as PaymentMethod[]
  ).map((method) => {
    const item = methodMap[method];
    const percentage =
      totalMethodAmountCents > 0
        ? Math.round((item.amountCents / totalMethodAmountCents) * 1000) / 10
        : 0;
    return {
      method,
      label: item.label,
      amountCents: item.amountCents,
      percentage,
      count: item.count,
    };
  });

  return {
    kpis,
    dailyCollections: {
      sevenDays: buildDailySeries(7),
      fourteenDays: buildDailySeries(14),
      thirtyDays: buildDailySeries(30),
    },
    methodBreakdown,
    unsettledAppointments,
    paymentHistory,
    vatRatePercent,
  };
}
