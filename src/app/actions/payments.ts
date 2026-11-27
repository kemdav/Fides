"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantAccess } from "@/lib/merchant/access";
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
  resolveCustomerName,
  resolveServiceName,
  resolveStaffName,
} from "@/lib/date-utils";
import type {
  AppointmentBalanceStatus,
  PaymentActionResult,
  PaymentMethod,
  PaymentRecordDTO,
  RecordPaymentInput,
  RecordPaymentSuccessData,
  RefundPaymentInput,
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
  const role = workspaceRoleFromLabel(access?.role);
  if (!access || !role) {
    return { ok: false as const, error: "Access denied. You are not an authorized member of this workspace." };
  }

  const [profile, tenant] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", access.userId).maybeSingle(),
    supabase.from("tenants").select("slug").eq("id", access.tenantId).maybeSingle(),
  ]);
  const userName = profile.data?.full_name?.trim() || profile.data?.email?.split("@")[0] || "Staff Member";
  return { ok: true as const, userId: access.userId, role, userName, slug: tenant.data?.slug ?? "", supabase };
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
  const { data: insertedPayment, error: insertError } = await supabase
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
    console.error("[payments] could not record payment");
    return { ok: false, error: insertError?.message || "Failed to save the payment record to the database." };
  }

  // 7. Update appointment balance tracking columns
  await supabase
    .from("appointments")
    .update({
      paid_cents: newTotalPaidCents,
      payment_status: resultingStatus,
      updated_at: nowIso,
    })
    .eq("id", input.appointmentId)
    .eq("tenant_id", input.tenantId);

  await revalidatePaymentsPaths(auth.slug);

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
  const { error: updateError } = await supabase
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

  // 3. Recalculate linked appointment balance if present
  if (payment.appointment_id) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, total_cents, payments(id, amount_cents, status)")
      .eq("id", payment.appointment_id)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();

    if (appointment) {
      const remainingPaid = (appointment.payments || [])
        .filter((p) => p.id !== payment.id && (p.status === "paid" || p.status === "pending"))
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const totalCents = appointment.total_cents;
      const newStatus: AppointmentBalanceStatus =
        remainingPaid <= 0 ? "unpaid" : remainingPaid >= totalCents ? "paid" : "partial";

      await supabase
        .from("appointments")
        .update({
          paid_cents: remainingPaid,
          payment_status: newStatus,
          updated_at: nowIso,
        })
        .eq("id", payment.appointment_id)
        .eq("tenant_id", input.tenantId);
    }
  }

  await revalidatePaymentsPaths(auth.slug);
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

  const { error: updateError } = await supabase
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

  if (payment.appointment_id) {
    const { data: appointment } = await supabase
      .from("appointments")
      .select("id, total_cents, payments(id, amount_cents, status)")
      .eq("id", payment.appointment_id)
      .eq("tenant_id", input.tenantId)
      .maybeSingle();

    if (appointment) {
      const remainingPaid = (appointment.payments || [])
        .filter((p) => p.id !== payment.id && (p.status === "paid" || p.status === "pending"))
        .reduce((sum, p) => sum + p.amount_cents, 0);

      const totalCents = appointment.total_cents;
      const newStatus: AppointmentBalanceStatus =
        remainingPaid <= 0 ? "unpaid" : remainingPaid >= totalCents ? "paid" : "partial";

      await supabase
        .from("appointments")
        .update({
          paid_cents: remainingPaid,
          payment_status: newStatus,
          updated_at: nowIso,
        })
        .eq("id", payment.appointment_id)
        .eq("tenant_id", input.tenantId);
    }
  }

  await revalidatePaymentsPaths(auth.slug);
  return { ok: true, data: { paymentId: input.paymentId } };
}
