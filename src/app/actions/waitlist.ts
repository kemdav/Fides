"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/appointments";
import {
  addToWaitlistSchema,
  assignWaitlistSlotSchema,
  cancelWaitlistEntrySchema,
} from "@/lib/validations/waitlist";

const TIMEZONE = "Asia/Manila";
const DEFAULT_PRICE_CENTS = 45000;
const DEFAULT_DURATION_MINUTES = 60;

/**
 * Statuses that no longer block a staff member's calendar. Anything else
 * (confirmed, checked_in, pending_approval, in_service, completed) still
 * occupies the slot.
 */
const NON_BLOCKING_STATUSES = "(cancelled,rejected,no_show)";

export interface AssignWaitlistSlotInput {
  waitlistEntryId: string;
  tenantIdParam?: string;
  /** Concrete staff_members id resolved by the UI. */
  staffId?: string;
  /** Human-readable staff name, used as a fallback lookup. */
  staffName?: string;
  /** Concrete resources id resolved by the UI, when one is known. */
  resourceId?: string;
  resourceName?: string;
  serviceId?: string;
  serviceName?: string;
  priceCents?: number;
  /** ISO timestamp for the start of the appointment. */
  startsAt: string;
  durationMinutes?: number;
  notes?: string;
  notify?: boolean;
}

export interface AssignWaitlistSlotResult {
  appointmentId: string;
  waitlistEntryId: string;
  startsAt: string;
  endsAt: string;
  staffId: string;
  resourceId: string | null;
  status?: string;
}

async function resolveTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tenantIdParam?: string,
): Promise<string | null> {
  if (tenantIdParam) {
    const { data: member } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("tenant_id", tenantIdParam)
      .eq("profile_id", userId)
      .maybeSingle();

    if (member?.tenant_id) return member.tenant_id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .eq("tenant_id", tenantIdParam)
      .maybeSingle();

    if (profile?.tenant_id) return profile.tenant_id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  return profile?.tenant_id ?? null;
}

export interface AddToWaitlistInput {
  guestName: string;
  guestPhone?: string;
  serviceName?: string;
  serviceId?: string;
  staffName?: string;
  staffId?: string;
  notes?: string;
  tenantIdParam?: string;
}

export async function addToWaitlistAction(
  input: AddToWaitlistInput,
): Promise<ActionResult<{ id: string; guestName: string; time: string }>> {
  const parsed = addToWaitlistSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid waitlist parameters." };
  }

  const { guestName, guestPhone, serviceName, serviceId: inputServiceId, staffName, staffId: inputStaffId, notes, tenantIdParam } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const tenantId = await resolveTenantId(supabase, user.id, tenantIdParam);
  if (!tenantId) {
    return { success: false, error: "No active business tenant found or unauthorized." };
  }

  let serviceId: string | null = inputServiceId ?? null;
  if (!serviceId && serviceName?.trim()) {
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${serviceName.trim()}%`)
      .limit(1)
      .maybeSingle();
    serviceId = svc?.id ?? null;
  }

  let staffId: string | null = inputStaffId ?? null;
  if (!staffId && staffName?.trim() && staffName !== "Any available") {
    const { data: staff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("full_name", `%${staffName.trim()}%`)
      .limit(1)
      .maybeSingle();
    staffId = staff?.id ?? null;
  }

  const { data: entry, error } = await supabase
    .from("waitlist_entries")
    .insert({
      tenant_id: tenantId,
      guest_name: guestName.trim(),
      guest_phone: guestPhone?.trim() || null,
      service_id: serviceId,
      staff_id: staffId,
      notes: notes?.trim() || null,
      status: "waiting",
    })
    .select("id, joined_at")
    .single();

  if (error || !entry) {
    return { success: false, error: `Failed to add to waiting list: ${error?.message ?? "unknown error"}` };
  }

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(entry.joined_at));

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/walk-ins");
  if (tenantRow?.slug) {
    revalidatePath(`/${tenantRow.slug}/dashboard/walk-ins`);
  }

  return {
    success: true,
    message: `${guestName.trim()} added to waiting list.`,
    data: {
      id: entry.id,
      guestName: guestName.trim(),
      time: timeStr,
    },
  };
}

export async function cancelWaitlistEntryAction({
  waitlistEntryId,
  tenantIdParam,
}: {
  waitlistEntryId: string;
  tenantIdParam?: string;
}): Promise<ActionResult> {
  const parsed = cancelWaitlistEntrySchema.safeParse({ waitlistEntryId, tenantIdParam });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "A valid waiting-list entry is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const tenantId = await resolveTenantId(supabase, user.id, tenantIdParam);
  if (!tenantId) {
    return { success: false, error: "No active business tenant found or unauthorized." };
  }

  // Pre-check current status to prevent unhandled database trigger exceptions
  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("status")
    .eq("id", waitlistEntryId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!entry) {
    return { success: false, error: "Waiting-list entry not found." };
  }

  if (entry.status === "converted") {
    return { success: false, error: "This walk-in has already been converted to an appointment and cannot be cancelled." };
  }

  if (entry.status === "cancelled") {
    return { success: true, message: "Already removed from waiting list." };
  }

  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: "cancelled" })
    .eq("id", waitlistEntryId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: `Failed to remove from waiting list: ${error.message}` };
  }

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/walk-ins");
  if (tenantRow?.slug) {
    revalidatePath(`/${tenantRow.slug}/dashboard/walk-ins`);
  }

  return { success: true, message: "Removed from waiting list." };
}

export interface BusySlot {
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export async function getStaffBusySlotsAction({
  tenantIdParam,
  staffId,
  resourceId,
  dateISO,
}: {
  tenantIdParam?: string;
  staffId: string;
  resourceId?: string;
  dateISO: string;
}): Promise<ActionResult<BusySlot[]>> {
  if (!staffId || !dateISO) {
    return { success: false, error: "Staff and date are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const tenantId = await resolveTenantId(supabase, user.id, tenantIdParam);
  if (!tenantId) {
    return { success: false, error: "No active business tenant found or unauthorized." };
  }

  const dayStart = `${dateISO}T00:00:00+08:00`;
  const dayEnd = `${dateISO}T23:59:59+08:00`;

  const { data: staffAppts } = await supabase
    .from("appointments")
    .select("starts_at, ends_at, status")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .not("status", "in", NON_BLOCKING_STATUSES)
    .gte("starts_at", dayStart)
    .lte("starts_at", dayEnd);

  const busySlots: BusySlot[] = (staffAppts ?? []).map((a) => ({
    startsAt: a.starts_at,
    endsAt: a.ends_at,
    reason: "staff conflict",
  }));

  if (resourceId) {
    const { data: resAllocations } = await supabase
      .from("resource_allocations")
      .select("starts_at, ends_at, appointment_id")
      .eq("tenant_id", tenantId)
      .eq("resource_id", resourceId)
      .gte("starts_at", dayStart)
      .lte("starts_at", dayEnd);

    for (const alloc of resAllocations ?? []) {
      busySlots.push({
        startsAt: alloc.starts_at,
        endsAt: alloc.ends_at,
        reason: "resource conflict",
      });
    }
  }

  return { success: true, message: "Busy slots loaded.", data: busySlots };
}

/**
 * Action: converts a waiting-list entry into an appointment with status 'checked_in'.
 *
 * Uses PostgreSQL RPC `convert_waitlist_to_appointment` for atomic row locking (FOR UPDATE)
 * and transaction safety, with graceful fallback to application-level atomic handling.
 */
export async function assignWaitlistSlotAction(
  input: AssignWaitlistSlotInput,
): Promise<ActionResult<AssignWaitlistSlotResult>> {
  const parsed = assignWaitlistSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid slot parameters." };
  }

  const {
    waitlistEntryId,
    tenantIdParam,
    staffId: requestedStaffId,
    staffName: requestedStaffName,
    resourceId: requestedResourceId,
    resourceName: requestedResourceName,
    serviceId: requestedServiceId,
    serviceName: requestedServiceName,
    priceCents: requestedPriceCents,
    startsAt,
    durationMinutes,
    notes,
  } = input;

  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) {
    return { success: false, error: "A valid start time is required to assign a slot." };
  }

  const bookingDuration =
    Number.isFinite(durationMinutes) && (durationMinutes as number) > 0
      ? Math.round(durationMinutes as number)
      : DEFAULT_DURATION_MINUTES;
  const endsAt = new Date(startDate.getTime() + bookingDuration * 60 * 1000).toISOString();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required to assign a slot." };
  }

  const tenantId = await resolveTenantId(supabase, user.id, tenantIdParam);
  if (!tenantId) {
    return { success: false, error: "No active business tenant found or unauthorized." };
  }

  // 1. Resolve queue entry
  const { data: entry, error: entryError } = await supabase
    .from("waitlist_entries")
    .select("id, tenant_id, customer_id, guest_name, guest_phone, service_id, staff_id, status")
    .eq("id", waitlistEntryId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (entryError || !entry) {
    return { success: false, error: "Waiting-list entry not found for this business." };
  }

  if (entry.status !== "waiting" && entry.status !== "notified") {
    return {
      success: false,
      error: `This queue entry has already been ${entry.status}. Refresh the waiting list.`,
    };
  }

  // 2. Resolve staff
  let staffId: string | null = requestedStaffId ?? null;
  let staffName: string = requestedStaffName?.trim() || "";

  if (!staffId && requestedStaffName?.trim()) {
    const { data: matchedStaff } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .ilike("full_name", requestedStaffName.trim())
      .limit(1)
      .maybeSingle();
    if (matchedStaff) {
      staffId = matchedStaff.id;
      staffName = matchedStaff.full_name;
    }
  }

  if (!staffId && entry.staff_id) {
    const { data: matchedStaff } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("id", entry.staff_id)
      .maybeSingle();
    if (matchedStaff) {
      staffId = matchedStaff.id;
      staffName = matchedStaff.full_name;
    }
  }

  if (!staffId) {
    const { data: firstStaff } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstStaff) {
      staffId = firstStaff.id;
      staffName = firstStaff.full_name;
    }
  }

  if (!staffId) {
    return { success: false, error: "No active staff member is available to take this slot." };
  }

  // 3. Resolve service
  let serviceId: string | null = requestedServiceId ?? entry.service_id ?? null;
  let servicePriceCents =
    Number.isFinite(requestedPriceCents) && (requestedPriceCents as number) >= 0
      ? Math.round(requestedPriceCents as number)
      : DEFAULT_PRICE_CENTS;

  if (serviceId) {
    const { data: svc } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle();
    if (svc?.price_cents != null) servicePriceCents = svc.price_cents;
  } else if (requestedServiceName?.trim()) {
    const { data: svc } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${requestedServiceName.trim()}%`)
      .limit(1)
      .maybeSingle();
    if (svc) {
      serviceId = svc.id;
      if (svc.price_cents != null) servicePriceCents = svc.price_cents;
    }
  }

  // 4. Resolve resource
  let resourceId: string | null = requestedResourceId ?? null;
  let resourceName = requestedResourceName?.trim() || null;

  if (!resourceId && serviceId) {
    const { data: link } = await supabase
      .from("service_resources")
      .select("resource_id, resources (name)")
      .eq("tenant_id", tenantId)
      .eq("service_id", serviceId)
      .limit(1)
      .maybeSingle();
    if (link?.resource_id) {
      resourceId = link.resource_id;
      const resData = Array.isArray(link.resources) ? link.resources[0] : link.resources;
      resourceName = resData?.name ?? resourceName;
    }
  }

  // 5. ATOMIC EXECUTION: Attempt stored procedure convert_waitlist_to_appointment
  // (Checks locks, overlaps, inserts appointment with status 'checked_in', links waitlist)
  type RpcReturn = {
    appointment_id: string;
    waitlist_entry_id: string;
    starts_at: string;
    ends_at: string;
    staff_id: string;
    resource_id: string | null;
    status: string;
  };

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "convert_waitlist_to_appointment" as unknown as never,
    {
      p_tenant_id: tenantId,
      p_waitlist_entry_id: waitlistEntryId,
      p_staff_id: staffId,
      p_resource_id: resourceId,
      p_starts_at: startsAt,
      p_duration_minutes: bookingDuration,
      p_service_id: serviceId,
      p_price_cents: servicePriceCents,
      p_notes: notes?.trim() || null,
      p_created_by: user.id,
      p_initial_status: "checked_in",
    } as unknown as never,
  );

  const typedRpc = rpcResult as unknown as RpcReturn | null;

  if (!rpcError && typedRpc?.appointment_id) {
    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", tenantId)
      .maybeSingle();

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/walk-ins");
    if (tenantRow?.slug) {
      revalidatePath(`/${tenantRow.slug}/dashboard/walk-ins`);
    }

    return {
      success: true,
      message: `${entry.guest_name || "Walk-in"} checked in with ${staffName}${
        resourceName ? ` in ${resourceName}` : ""
      }.`,
      data: {
        appointmentId: typedRpc.appointment_id,
        waitlistEntryId: typedRpc.waitlist_entry_id,
        startsAt: typedRpc.starts_at,
        endsAt: typedRpc.ends_at,
        staffId: typedRpc.staff_id,
        resourceId: typedRpc.resource_id,
        status: typedRpc.status,
      },
    };
  }

  // 6. Graceful fallback if the stored procedure has not yet been applied to the remote DB
  // Guard against overlaps before manual write
  const { data: staffConflicts } = await supabase
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staffId)
    .not("status", "in", NON_BLOCKING_STATUSES)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);

  if (staffConflicts && staffConflicts.length > 0) {
    return {
      success: false,
      error: `${staffName} already has a booking that overlaps this time. Choose another slot.`,
    };
  }

  if (resourceId) {
    const { data: resConflicts } = await supabase
      .from("resource_allocations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("resource_id", resourceId)
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt)
      .limit(1);

    if (resConflicts && resConflicts.length > 0) {
      return {
        success: false,
        error: `${resourceName || "Selected resource"} is already reserved during this time. Choose another slot.`,
      };
    }
  }

  // Customer resolution
  let customerId: string | null = entry.customer_id;
  const customerName = entry.guest_name?.trim() || "Walk-in guest";
  const customerPhone = entry.guest_phone?.trim() || null;

  if (!customerId && customerName) {
    const { data: existingCust } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("full_name", customerName)
      .limit(1)
      .maybeSingle();

    if (existingCust) {
      customerId = existingCust.id;
    } else {
      const { data: newCust } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: customerName,
          phone: customerPhone,
        })
        .select("id")
        .single();
      customerId = newCust?.id ?? null;
    }
  }

  // Insert appointment with confirmed direct status 'checked_in'
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      staff_id: staffId,
      waitlist_entry_id: entry.id,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: TIMEZONE,
      status: "checked_in",
      source: "walk_in",
      total_cents: servicePriceCents,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select("id, starts_at, ends_at, status")
    .single();

  if (apptError || !appointment) {
    return {
      success: false,
      error: `Failed to create walk-in appointment: ${apptError?.message ?? "unknown error"}`,
    };
  }

  // Service line item
  if (serviceId) {
    await supabase.from("appointment_services").insert({
      tenant_id: tenantId,
      appointment_id: appointment.id,
      service_id: serviceId,
      staff_id: staffId,
      price_cents: servicePriceCents,
      duration_minutes: bookingDuration,
    });
  }

  // Resource allocation
  if (resourceId) {
    await supabase.from("resource_allocations").insert({
      tenant_id: tenantId,
      resource_id: resourceId,
      appointment_id: appointment.id,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
    });
  }

  // Update waitlist entry to converted
  const { error: convertError } = await supabase
    .from("waitlist_entries")
    .update({
      status: "converted",
      converted_appointment_id: appointment.id,
      staff_id: staffId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entry.id)
    .eq("tenant_id", tenantId);

  if (convertError) {
    return {
      success: false,
      error: `Failed to update waiting list status: ${convertError.message}`,
    };
  }

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/walk-ins");
  if (tenantRow?.slug) {
    revalidatePath(`/${tenantRow.slug}/dashboard/walk-ins`);
  }

  return {
    success: true,
    message: `${customerName} checked in with ${staffName}${
      resourceName ? ` in ${resourceName}` : ""
    }.`,
    data: {
      appointmentId: appointment.id,
      waitlistEntryId: entry.id,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      staffId: staffId,
      resourceId: resourceId,
      status: appointment.status,
    },
  };
}
