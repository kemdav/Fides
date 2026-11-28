"use server";

import { updateAppointmentStatusAction } from "@/app/actions/appointments";
import type { ActionResult } from "@/app/actions/appointments";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { checkInSchema, checkInCodeSchema } from "@/features/check-in/schema";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppointmentPreview {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceName: string;
  staffName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  amountDue: number;
  source: string;
  status: string;
}

// ── Step 1: verify code and return appointment details ───────────────────────

export async function verifyCheckInCodeAction(input: {
  tenantId: string;
  code: string;
}): Promise<ActionResult<AppointmentPreview>> {
  const parsed = checkInCodeSchema.safeParse(input.code);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid appointment check-in code." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  const access = await resolveTenantAccess(supabase, input.tenantId);
  if (!access) return { success: false, error: "Access denied." };

  const { data: appointment, error: fetchError } = await supabase
    .from("appointments")
    .select("id, status, starts_at, ends_at, total_cents, source, customer_id, staff_id")
    .eq("id", parsed.data)
    .eq("tenant_id", access.tenantId)
    .maybeSingle();

  if (fetchError || !appointment) {
    return {
      success: false,
      error: "No appointment found for this check-in code in this workspace.",
    };
  }

  if (appointment.status !== "confirmed") {
    const label =
      appointment.status === "checked_in"
        ? "already checked in"
        : appointment.status === "completed"
          ? "already completed"
          : appointment.status === "cancelled"
            ? "cancelled"
            : appointment.status === "no_show"
            ? "marked as no-show"
            : appointment.status.replaceAll("_", " ");
    return {
      success: false,
      error: `This appointment is ${label}. Only confirmed appointments can be checked in.`,
    };
  }

  // fetch related data in parallel
  const [customerResult, staffResult, svcResult] = await Promise.all([
    appointment.customer_id
      ? supabase
          .from("customers")
          .select("full_name, phone, email")
          .eq("id", appointment.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("staff_members")
      .select("full_name")
      .eq("id", appointment.staff_id)
      .maybeSingle(),
    supabase
      .from("appointment_services")
      .select("service_id")
      .eq("appointment_id", appointment.id)
      .eq("tenant_id", access.tenantId),
  ]);

  const customerName = customerResult.data?.full_name ?? "Walk-in";
  const customerPhone = customerResult.data?.phone ?? "";
  const customerEmail = customerResult.data?.email ?? "";
  const staffName = staffResult.data?.full_name ?? "Unassigned";
  const durationMinutes = Math.round(
    (Date.parse(appointment.ends_at) - Date.parse(appointment.starts_at)) / 60_000,
  );

  // resolve service names
  let serviceName = "No service listed";
  const serviceIds = (svcResult.data ?? []).map((r) => r.service_id);
  if (serviceIds.length > 0) {
    const { data: serviceRows } = await supabase
      .from("services")
      .select("name")
      .in("id", serviceIds);
    const names = (serviceRows ?? []).map((s) => s.name).filter(Boolean);
    if (names.length > 0) serviceName = names.join(", ");
  }

  return {
    success: true,
    message: "Appointment found.",
    data: {
      id: appointment.id,
      customerName,
      customerPhone,
      customerEmail,
      serviceName,
      staffName,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      durationMinutes,
      amountDue: appointment.total_cents,
      source: appointment.source,
      status: appointment.status,
    },
  };
}

// ── Step 2: confirm check-in ─────────────────────────────────────────────────

export async function checkInAppointmentAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: "Enter the full appointment check-in code.",
    };

  const result = await updateAppointmentStatusAction({
    appointmentId: parsed.data.code,
    tenantIdParam: parsed.data.tenantId,
    newStatus: "Check In",
    expectedStatus: "confirmed",
  });

  return result.success
    ? { success: true, message: "Appointment checked in successfully." }
    : {
        success: false,
        error:
          "Check-in failed. Verify that the code is for a confirmed appointment in this workspace.",
      };
}
