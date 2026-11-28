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
  serviceName: string;
  staffName: string;
  startsAt: string;
  endsAt: string;
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
    .select(`
      id,
      status,
      starts_at,
      ends_at,
      customers:customer_id ( full_name ),
      staff_members:staff_id ( full_name )
    `)
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
            : appointment.status;
    return {
      success: false,
      error: `This appointment is ${label}. Only confirmed appointments can be checked in.`,
    };
  }

  // fetch service name from appointment_services
  const { data: svcRows } = await supabase
    .from("appointment_services")
    .select("services:service_id ( name )")
    .eq("appointment_id", appointment.id)
    .eq("tenant_id", access.tenantId);

  const serviceNames = (svcRows ?? [])
    .map((r) => {
      const svc = r.services;
      if (Array.isArray(svc)) return svc[0]?.name ?? "";
      return (svc as { name: string } | null)?.name ?? "";
    })
    .filter(Boolean);

  const customerObj = appointment.customers;
  const customerName = Array.isArray(customerObj)
    ? customerObj[0]?.full_name ?? "Walk-in"
    : (customerObj as { full_name: string } | null)?.full_name ?? "Walk-in";

  const staffObj = appointment.staff_members;
  const staffName = Array.isArray(staffObj)
    ? staffObj[0]?.full_name ?? "Unassigned"
    : (staffObj as { full_name: string } | null)?.full_name ?? "Unassigned";

  return {
    success: true,
    message: "Appointment found.",
    data: {
      id: appointment.id,
      customerName,
      serviceName: serviceNames.join(", ") || "No service listed",
      staffName,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
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
