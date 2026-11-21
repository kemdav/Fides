"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildManilaIso,
  computeAvailableSlotsForStaff,
  getManilaDateString,
  getWalkInWorkspaceData,
  resolveMerchantTenantId,
} from "@/lib/merchant/walk-ins";
import type {
  AssignableSlotOption,
  WaitlistStatus,
  WalkInWorkspaceData,
} from "@/types/walk-ins";

export type WalkInActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | { success: false; error: string; code?: "SLOT_UNAVAILABLE" | "VALIDATION" | "AUTH" | "UNKNOWN" };

const MANILA_OFFSET = "+08:00";

function revalidateWalkInPaths() {
  revalidatePath("/dashboard/walk-ins");
  revalidatePath("/(site)/[slug]/dashboard/walk-ins", "page");
  revalidatePath("/(site)/[slug]/dashboard/appointments", "page");
  revalidatePath("/(site)/[slug]/dashboard", "page");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
}

function parseRpcError(message?: string): {
  error: string;
  code: "SLOT_UNAVAILABLE" | "UNKNOWN";
} {
  if (!message) return { error: "Unexpected database error.", code: "UNKNOWN" };
  if (message.includes("SLOT_UNAVAILABLE")) {
    return {
      error:
        "This staff member already has a booking in that slot. Add the customer to the waiting list instead so existing bookings remain protected.",
      code: "SLOT_UNAVAILABLE",
    };
  }
  if (message.includes("WAITLIST_NOT_CONVERTIBLE")) {
    return {
      error: "This waiting list entry has already been processed.",
      code: "UNKNOWN",
    };
  }
  return { error: message, code: "UNKNOWN" };
}

async function resolveOrCreateCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  fullName: string,
  email?: string,
  phone?: string
): Promise<string | null> {
  const cleanName = fullName.trim();
  const cleanPhone = phone?.trim() || null;

  if (cleanPhone) {
    const { data: byPhone } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("phone", cleanPhone)
      .limit(1)
      .maybeSingle();
    if (byPhone?.id) return byPhone.id;
  }

  const { data: byName } = await supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("full_name", cleanName)
    .limit(1)
    .maybeSingle();

  if (byName?.id) return byName.id;

  const { data: created } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      full_name: cleanName,
      email: email?.trim() || null,
      phone: cleanPhone,
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

/**
 * Load fresh workspace data (used by client refresh & Realtime updates).
 */
export async function getWalkInWorkspaceAction(
  tenantIdParam?: string
): Promise<WalkInActionResult<WalkInWorkspaceData>> {
  const data = await getWalkInWorkspaceData(tenantIdParam);
  if (!data) {
    return { success: false, error: "Unable to resolve merchant workspace.", code: "AUTH" };
  }
  return { success: true, message: "Loaded.", data };
}

/**
 * Compute conflict-free slots for a staff member on a given date (Assign a slot modal).
 */
export async function getAssignableSlotsAction(input: {
  tenantId?: string;
  staffId: string;
  date: string;
  durationMinutes: number;
}): Promise<WalkInActionResult<AssignableSlotOption[]>> {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase, input.tenantId);
  if (!tenantId) {
    return { success: false, error: "Authentication required.", code: "AUTH" };
  }

  const dayStartIso = new Date(`${input.date}T00:00:00${MANILA_OFFSET}`).toISOString();
  const dayEndIso = new Date(`${input.date}T23:59:59${MANILA_OFFSET}`).toISOString();

  const { data: appts, error } = await supabase
    .from("appointments")
    .select("staff_id, starts_at, ends_at, status")
    .eq("tenant_id", tenantId)
    .eq("staff_id", input.staffId)
    .in("status", ["pending_approval", "confirmed", "checked_in", "in_service"])
    .lt("starts_at", dayEndIso)
    .gt("ends_at", dayStartIso);

  if (error) {
    return { success: false, error: error.message, code: "UNKNOWN" };
  }

  const busyIntervals = (appts ?? []).map((a) => ({
    staffId: a.staff_id,
    startMs: new Date(a.starts_at).getTime(),
    endMs: new Date(a.ends_at).getTime(),
  }));

  const slots = computeAvailableSlotsForStaff({
    dateStr: input.date,
    staffId: input.staffId,
    durationMinutes: input.durationMinutes,
    busyIntervals,
  });

  return { success: true, message: "Slots loaded.", data: slots };
}

/**
 * Create an immediate walk-in appointment with strict overlap protection.
 */
export async function createSafeWalkInAppointmentAction(input: {
  tenantId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceId: string;
  staffId: string; // pass "any" to auto-pick first available staff
  date: string;
  time: string;
  notes?: string;
}): Promise<
  WalkInActionResult<{
    id: string;
    startsAt: string;
    customerName: string;
    serviceName: string;
    staffName: string;
  }>
> {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase, input.tenantId);
  if (!tenantId) {
    return { success: false, error: "Authentication required.", code: "AUTH" };
  }

  const cleanName = input.customerName.trim();
  const cleanPhone = input.customerPhone.trim();
  if (!cleanName || !cleanPhone) {
    return {
      success: false,
      error: "Customer name and contact number are required.",
      code: "VALIDATION",
    };
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, name, price_cents, duration_minutes")
    .eq("tenant_id", tenantId)
    .eq("id", input.serviceId)
    .single();

  if (!service) {
    return { success: false, error: "Selected service not found.", code: "VALIDATION" };
  }

  const durationMinutes = service.duration_minutes ?? 60;
  const startsAt = buildManilaIso(input.date || getManilaDateString(), input.time);
  const endsAt = new Date(
    new Date(startsAt).getTime() + durationMinutes * 60 * 1000
  ).toISOString();

  // Resolve target staff (support "any" by finding first free staff member)
  let targetStaffId = input.staffId;
  let targetStaffName = "Specialist";

  if (input.staffId === "any") {
    const { data: allStaff } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("full_name", { ascending: true });

    const { data: overlapping } = await supabase
      .from("appointments")
      .select("staff_id")
      .eq("tenant_id", tenantId)
      .in("status", ["pending_approval", "confirmed", "checked_in", "in_service"])
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt);

    const busyIds = new Set((overlapping ?? []).map((o) => o.staff_id));
    const freeStaff = (allStaff ?? []).find((s) => !busyIds.has(s.id));

    if (!freeStaff) {
      return {
        success: false,
        error:
          "All staff are occupied during this time slot. Add the customer to the waiting list instead.",
        code: "SLOT_UNAVAILABLE",
      };
    }

    targetStaffId = freeStaff.id;
    targetStaffName = freeStaff.full_name;
  } else {
    const { data: member } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("id", input.staffId)
      .single();

    if (!member) {
      return { success: false, error: "Selected staff member not found.", code: "VALIDATION" };
    }
    targetStaffName = member.full_name;
  }

  const customerId = await resolveOrCreateCustomer(
    supabase,
    tenantId,
    cleanName,
    input.customerEmail,
    cleanPhone
  );

  // Cast rpc call to avoid editing src/types/database.types.ts (PR #21 conflict zone)
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{
    data: Array<{ appointment_id: string; starts_at: string }> | null;
    error: { message: string } | null;
  }>;

  const { data: rpcRows, error: rpcError } = await rpc("create_walkin_appointment_safe", {
    p_tenant_id: tenantId,
    p_customer_id: customerId,
    p_staff_id: targetStaffId,
    p_service_id: service.id,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_total_cents: service.price_cents ?? 0,
    p_duration_minutes: durationMinutes,
    p_notes: input.notes?.trim() || null,
    p_timezone: "Asia/Manila",
  });

  if (rpcError || !rpcRows?.[0]) {
    const parsed = parseRpcError(rpcError?.message);
    return { success: false, error: parsed.error, code: parsed.code };
  }

  revalidateWalkInPaths();

  return {
    success: true,
    message: "Walk-in appointment created.",
    data: {
      id: rpcRows[0].appointment_id,
      startsAt: rpcRows[0].starts_at,
      customerName: cleanName,
      serviceName: service.name,
      staffName: targetStaffName,
    },
  };
}

/**
 * Place a walk-in customer onto the standby waiting list.
 */
export async function addToWaitlistAction(input: {
  tenantId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceId?: string | null;
  staffId?: string | null; // null or "any" => Any available
  notes?: string;
}): Promise<WalkInActionResult<{ id: string; customerName: string }>> {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase, input.tenantId);
  if (!tenantId) {
    return { success: false, error: "Authentication required.", code: "AUTH" };
  }

  const cleanName = input.customerName.trim();
  const cleanPhone = input.customerPhone.trim();
  if (!cleanName || !cleanPhone) {
    return {
      success: false,
      error: "Customer name and contact number are required to join the waiting list.",
      code: "VALIDATION",
    };
  }

  const customerId = await resolveOrCreateCustomer(
    supabase,
    tenantId,
    cleanName,
    input.customerEmail,
    cleanPhone
  );

  const normalizedStaffId =
    !input.staffId || input.staffId === "any" ? null : input.staffId;

  const { data: inserted, error } = await supabase
    .from("waitlist_entries")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      guest_name: cleanName,
      guest_phone: cleanPhone,
      service_id: input.serviceId || null,
      staff_id: normalizedStaffId,
      status: "waiting",
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return {
      success: false,
      error: `Failed to add to waiting list: ${error?.message ?? "Unknown error"}`,
      code: "UNKNOWN",
    };
  }

  revalidateWalkInPaths();

  return {
    success: true,
    message: `${cleanName} added to the waiting list.`,
    data: { id: inserted.id, customerName: cleanName },
  };
}

/**
 * Update a waiting list entry status (notified, cancelled, expired).
 */
export async function updateWaitlistStatusAction(input: {
  tenantId?: string;
  entryId: string;
  status: Extract<WaitlistStatus, "notified" | "cancelled" | "expired">;
}): Promise<WalkInActionResult> {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase, input.tenantId);
  if (!tenantId) {
    return { success: false, error: "Authentication required.", code: "AUTH" };
  }

  const { error } = await supabase
    .from("waitlist_entries")
    .update({
      status: input.status,
      ...(input.status === "notified" ? { notified_at: new Date().toISOString() } : {}),
    })
    .eq("tenant_id", tenantId)
    .eq("id", input.entryId);

  if (error) {
    return { success: false, error: error.message, code: "UNKNOWN" };
  }

  revalidateWalkInPaths();

  return {
    success: true,
    message:
      input.status === "notified"
        ? "Customer marked as notified."
        : input.status === "cancelled"
        ? "Removed customer from waiting list."
        : "Waiting list entry marked as expired.",
  };
}

/**
 * Atomically convert a waiting list entry into a confirmed walk-in appointment.
 */
export async function convertWaitlistEntryAction(input: {
  tenantId?: string;
  waitlistEntryId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  notifyCustomer?: boolean;
}): Promise<WalkInActionResult<{ appointmentId: string; waitlistEntryId: string }>> {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase, input.tenantId);
  if (!tenantId) {
    return { success: false, error: "Authentication required.", code: "AUTH" };
  }

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{
    data: Array<{ appointment_id: string; waitlist_entry_id: string }> | null;
    error: { message: string } | null;
  }>;

  const { data: rows, error } = await rpc("convert_waitlist_entry_to_appointment", {
    p_tenant_id: tenantId,
    p_waitlist_entry_id: input.waitlistEntryId,
    p_staff_id: input.staffId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_notes: input.notes?.trim() || null,
    p_mark_notified: input.notifyCustomer ?? true,
    p_timezone: "Asia/Manila",
  });

  if (error || !rows?.[0]) {
    const parsed = parseRpcError(error?.message);
    return { success: false, error: parsed.error, code: parsed.code };
  }

  revalidateWalkInPaths();

  return {
    success: true,
    message: "Slot assigned and appointment confirmed.",
    data: {
      appointmentId: rows[0].appointment_id,
      waitlistEntryId: rows[0].waitlist_entry_id,
    },
  };
}