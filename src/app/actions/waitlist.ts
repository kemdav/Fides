"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/actions/appointments";

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
  staffName?: string;
  notes?: string;
  tenantIdParam?: string;
}

export async function addToWaitlistAction(
  input: AddToWaitlistInput,
): Promise<ActionResult<{ id: string; guestName: string; time: string }>> {
  const { guestName, guestPhone, serviceName, staffName, notes, tenantIdParam } = input;

  if (!guestName?.trim()) {
    return { success: false, error: "Customer name is required." };
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

  let serviceId: string | null = null;
  if (serviceName?.trim()) {
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${serviceName.trim()}%`)
      .limit(1)
      .maybeSingle();
    serviceId = svc?.id ?? null;
  }

  let staffId: string | null = null;
  if (staffName?.trim() && staffName !== "Any available") {
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

  revalidatePath("/dashboard/walk-ins");

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
  if (!waitlistEntryId) {
    return { success: false, error: "A waiting-list entry is required." };
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

  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: "cancelled" })
    .eq("id", waitlistEntryId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { success: false, error: `Failed to remove from waiting list: ${error.message}` };
  }

  revalidatePath("/dashboard/walk-ins");
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
 * Action: converts a waiting-list entry into a confirmed appointment.
 *
 * Writes, in order:
 *   1. public.appointments (linked back through waitlist_entry_id)
 *   2. public.appointment_services (service line item)
 *   3. public.resource_allocations (chair / treatment room, when one resolves)
 *   4. public.waitlist_entries -> status = 'converted'
 *
 * The appointment and queue update are rolled back if a dependent write fails,
 * so the queue never points at a half-created booking.
 */
export async function assignWaitlistSlotAction(
  input: AssignWaitlistSlotInput,
): Promise<ActionResult<AssignWaitlistSlotResult>> {
  const {
    waitlistEntryId,
    tenantIdParam,
    staffId: requestedStaffId,
    staffName: requestedStaffName,
    resourceId: requestedResourceId,
    resourceName: requestedResourceName,
    serviceName: requestedServiceName,
    priceCents: requestedPriceCents,
    startsAt,
    durationMinutes,
    notes,
    notify = true,
  } = input;

  if (!waitlistEntryId) {
    return { success: false, error: "A waiting-list entry is required to assign a slot." };
  }

  const startDate = new Date(startsAt);
  if (!startsAt || Number.isNaN(startDate.getTime())) {
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
    return { success: false, error: "No active business tenant found." };
  }

  // 1. Load the queue entry and confirm it can still be converted.
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
      error: "This queue entry has already been resolved. Refresh the waiting list.",
    };
  }

  // 2. Resolve the customer behind the queue entry.
  let customerId: string | null = entry.customer_id;
  let customerName = entry.guest_name?.trim() || "";
  let customerPhone = entry.guest_phone?.trim() || null;

  if (customerId) {
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name, phone")
      .eq("tenant_id", tenantId)
      .eq("id", customerId)
      .maybeSingle();
    if (customer) {
      customerName = customer.full_name?.trim() || customerName;
      customerPhone = customer.phone?.trim() || customerPhone;
    }
  } else if (customerName) {
    let customerQuery = supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("full_name", customerName);

    if (customerPhone) {
      customerQuery = customerQuery.eq("phone", customerPhone);
    }

    const { data: existingCustomer } = await customerQuery.limit(1).maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          full_name: customerName,
          phone: customerPhone,
        })
        .select("id")
        .single();
      customerId = newCustomer?.id ?? null;
    }
  }

  // 3. Resolve the service (price + duration come from the catalog when found).
  let serviceId: string | null = entry.service_id;
  let serviceName = requestedServiceName?.trim() || "Walk-in service";
  let servicePriceCents =
    Number.isFinite(requestedPriceCents) && (requestedPriceCents as number) >= 0
      ? Math.round(requestedPriceCents as number)
      : DEFAULT_PRICE_CENTS;

  const applyService = (row: {
    id: string;
    name: string;
    price_cents: number | null;
    duration_minutes: number | null;
  }) => {
    serviceId = row.id;
    serviceName = row.name?.trim() || serviceName;
    if (row.price_cents != null) servicePriceCents = row.price_cents;
  };

  if (serviceId) {
    const { data: service } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle();
    if (service) applyService(service);
  } else if (requestedServiceName?.trim()) {
    const { data: service } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${requestedServiceName.trim()}%`)
      .limit(1)
      .maybeSingle();
    if (service) applyService(service);
    else serviceName = requestedServiceName.trim();
  }

  // 4. Resolve the staff member. Prefer the explicit id, then the request, then
  // the entry's recorded staff, then the first active member.
  const findStaffById = async (id: string | null | undefined) => {
    if (!id) return null;
    const { data } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  };

  let staff: { id: string; full_name: string } | null = await findStaffById(requestedStaffId);

  if (!staff && requestedStaffName?.trim()) {
    const { data } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .ilike("full_name", requestedStaffName.trim())
      .limit(1)
      .maybeSingle();
    staff = data ?? null;
  }

  if (!staff) staff = await findStaffById(entry.staff_id);

  if (!staff) {
    const { data } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    staff = data ?? null;
  }

  if (!staff) {
    return { success: false, error: "No active staff member is available to take this slot." };
  }

  // 5. Resolve the resource (chair / room). Optional: some tenants track none.
  const findResourceById = async (id: string | null | undefined) => {
    if (!id) return null;
    const { data } = await supabase
      .from("resources")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    return data ?? null;
  };

  let resource: { id: string; name: string } | null = await findResourceById(requestedResourceId);

  if (!resource && serviceId) {
    const { data: link } = await supabase
      .from("service_resources")
      .select("resource_id")
      .eq("tenant_id", tenantId)
      .eq("service_id", serviceId)
      .limit(1)
      .maybeSingle();
    if (link?.resource_id) resource = await findResourceById(link.resource_id);
  }

  if (!resource) {
    const { data } = await supabase
      .from("resources")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();
    resource = data ?? null;
  }

  const resourceLabel = resource?.name ?? requestedResourceName?.trim() ?? null;

  // 6. Protect existing bookings: reject overlapping staff bookings and
  // resource allocations before writing anything.
  const { data: staffConflicts } = await supabase
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("staff_id", staff.id)
    .not("status", "in", NON_BLOCKING_STATUSES)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);

  if (staffConflicts && staffConflicts.length > 0) {
    return {
      success: false,
      error: `${staff.full_name} already has a booking that overlaps this time. Choose another slot.`,
    };
  }

  if (resource) {
    const { data: resourceConflicts } = await supabase
      .from("resource_allocations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("resource_id", resource.id)
      .lt("starts_at", endsAt)
      .gt("ends_at", startsAt)
      .limit(1);

    if (resourceConflicts && resourceConflicts.length > 0) {
      return {
        success: false,
        error: `${resource.name} is already reserved during this time. Choose another slot.`,
      };
    }
  }

  // 7. Create the appointment.
  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      staff_id: staff.id,
      waitlist_entry_id: entry.id,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: TIMEZONE,
      status: "confirmed",
      source: "walk_in",
      total_cents: servicePriceCents,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select("id, starts_at, ends_at")
    .single();

  if (appointmentError || !appointment) {
    return {
      success: false,
      error: `Failed to create the appointment: ${appointmentError?.message ?? "unknown error"}`,
    };
  }

  // Roll back the appointment if a dependent write fails.
  const rollback = async () => {
    await supabase.from("resource_allocations").delete().eq("appointment_id", appointment.id);
    await supabase.from("appointment_services").delete().eq("appointment_id", appointment.id);
    await supabase.from("appointments").delete().eq("id", appointment.id).eq("tenant_id", tenantId);
  };

  // 8. Record the service line item.
  if (serviceId) {
    const { error: lineItemError } = await supabase.from("appointment_services").insert({
      tenant_id: tenantId,
      appointment_id: appointment.id,
      service_id: serviceId,
      staff_id: staff.id,
      price_cents: servicePriceCents,
      duration_minutes: bookingDuration,
    });

    if (lineItemError) {
      await rollback();
      return {
        success: false,
        error: `Failed to record the service for this appointment: ${lineItemError.message}`,
      };
    }
  }

  // 9. Reserve the chair / room so it cannot be double-booked.
  if (resource) {
    const { error: allocationError } = await supabase.from("resource_allocations").insert({
      tenant_id: tenantId,
      resource_id: resource.id,
      appointment_id: appointment.id,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
    });

    if (allocationError) {
      await rollback();
      return {
        success: false,
        error: `Failed to reserve ${resource.name} for this appointment: ${allocationError.message}`,
      };
    }
  }

  // 10. Convert the queue entry. The DB trigger enforces the status transition
  // and requires a linked appointment for 'converted'.
  const { error: convertError } = await supabase
    .from("waitlist_entries")
    .update({
      status: "converted",
      converted_appointment_id: appointment.id,
      staff_id: staff.id,
      ...(notify ? { notified_at: entry.status === "notified" ? undefined : new Date().toISOString() } : {}),
    })
    .eq("id", entry.id)
    .eq("tenant_id", tenantId);

  if (convertError) {
    await rollback();
    return {
      success: false,
      error: `Failed to update the waiting list: ${convertError.message}`,
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
    message: `${customerName || "Walk-in"} assigned to ${staff.full_name}${
      resourceLabel ? ` in ${resourceLabel}` : ""
    }.`,
    data: {
      appointmentId: appointment.id,
      waitlistEntryId: entry.id,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      staffId: staff.id,
      resourceId: resource?.id ?? null,
    },
  };
}
