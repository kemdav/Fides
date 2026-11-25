"use server";

import { revalidatePath } from "next/cache";
import { canManageBookings } from "@/lib/merchant/workspace-roles";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { combineDateAndTimeManila, resolveCustomerName } from "@/lib/date-utils";
import { z } from "zod";
import type { Database } from "@/types/database.types";

export type AppointmentStatusEnum = Database["public"]["Enums"]["appointment_status"];
export type BookingSourceEnum = Database["public"]["Enums"]["booking_source"];

export type ActionResult<T = unknown> =
  | { success: true; message: string; data?: T }
  | { success: false; error: string };

function mapUiStatusToDb(status: string): AppointmentStatusEnum {
  const s = status.trim().toLowerCase();
  if (s === "confirmed") return "confirmed";
  if (s === "check in" || s === "checked in" || s === "checked_in") return "checked_in";
  if (s === "pending approval" || s === "pending" || s === "pending_approval") return "pending_approval";
  if (s === "in service" || s === "in_service") return "in_service";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "rejected") return "rejected";
  if (s === "no show" || s === "no_show") return "no_show";
  return "confirmed";
}

async function revalidateTenantDashboard(tenantSlug?: string) {
  if (tenantSlug) {
    revalidatePath(`/${tenantSlug}/dashboard`, "layout");
    revalidatePath(`/${tenantSlug}/dashboard/appointments`, "page");
  }
  revalidatePath("/[slug]/dashboard", "layout");
  revalidatePath("/[slug]/dashboard/appointments", "page");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/appointments", "layout");
}

export async function loadAppointmentDetailsAction(tenantId: string, appointmentId: string) {
  if (!z.uuid().safeParse(tenantId).success || !z.uuid().safeParse(appointmentId).success) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase.from("tenant_memberships").select("role, tenants(timezone)")
    .eq("tenant_id", tenantId).eq("profile_id", user.id).maybeSingle();
  if (!canManageBookings(membership?.role)) return null;

  const { data, error } = await supabase.from("appointments").select(`
    id, starts_at, ends_at, status, source, notes, total_cents,
    customers(full_name, phone, email), staff_members(full_name),
    appointment_services(services(name)),
    resource_allocations!resource_allocations_tenant_appointment_fkey(resources(name)),
    payments(amount_cents, status)
  `).eq("tenant_id", tenantId).eq("id", appointmentId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const paid = data.payments.reduce((sum, payment) => sum + (payment.status === "paid" ? payment.amount_cents : 0), 0);
  return {
    ...data,
    customerName: resolveCustomerName(data.customers, data.notes),
    amountDue: Math.max(0, data.total_cents - paid),
    timezone: membership?.tenants?.timezone || "Asia/Manila",
  };
}

export async function rescheduleAppointmentAction(input: {
  tenantId: string; appointmentId: string; date: string; time: string; expectedStart: string;
}): Promise<ActionResult> {
  const parsed = z.object({
    tenantId: z.uuid(), appointmentId: z.uuid(), date: z.iso.date(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), expectedStart: z.iso.datetime({ offset: true }),
  }).safeParse(input);
  if (!parsed.success) return { success: false, error: "Choose a valid date and time." };
  const { tenantId, appointmentId, date, time, expectedStart } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_tenant_id: tenantId, p_appointment_id: appointmentId, p_date: date,
    p_time: time, p_expected_start: expectedStart,
  });
  if (error) return { success: false, error: error.code === "P0001" ? error.message : "The appointment could not be rescheduled." };
  const { data: tenant } = await supabase.from("tenants").select("slug").eq("id", tenantId).maybeSingle();
  await revalidateTenantDashboard(tenant?.slug);
  return { success: true, message: "Appointment rescheduled." };
}

/**
 * Action: Updates an appointment's status in Supabase (QA #3).
 */
export async function updateAppointmentStatusAction({
  appointmentId,
  newStatus,
  reason,
  tenantIdParam,
  expectedStatus,
}: {
  appointmentId: string;
  newStatus: string;
  reason?: string;
  tenantIdParam?: string;
  expectedStatus?: AppointmentStatusEnum;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const access = await resolveTenantAccess(supabase, tenantIdParam);
  if (!access) {
    return { success: false, error: "Access Denied: You do not have permissions for this business." };
  }
  const targetTenantId = access.tenantId;
  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id", targetTenantId).eq("profile_id", user.id).maybeSingle();
  if (!canManageBookings(membership?.role)) return { success: false, error: "You do not have permission to manage bookings in this workspace." };
  const { data: tenant } = await supabase.from("tenants").select("slug").eq("id", targetTenantId).maybeSingle();

  const dbStatus = mapUiStatusToDb(newStatus);
  const updatePayload: Database["public"]["Tables"]["appointments"]["Update"] = {
    status: dbStatus,
    ...(dbStatus === "cancelled"
      ? {
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason ?? "Cancelled by staff",
        }
      : {}),
  };

  let query = supabase.from("appointments").update(updatePayload).eq("id", appointmentId);
  query = query.eq("tenant_id", targetTenantId);
  if (expectedStatus) query = query.eq("status", expectedStatus);

  const { data: updated, error } = await query.select("id").maybeSingle();

  if (error) {
    return { success: false, error: `Failed to update appointment: ${error.message}` };
  }
  if (!updated) return { success: false, error: expectedStatus ? "This appointment changed. Reopen its details and try again." : "Appointment not found." };

  await revalidateTenantDashboard(tenant?.slug);

  return { success: true, message: `Appointment status updated to ${newStatus}.` };
}

/**
 * Action: Creates and persists a new appointment booking to Supabase (QA #4).
 */
export async function createAppointmentBookingAction({
  customerName,
  customerEmail,
  customerPhone,
  serviceName,
  staffName,
  serviceId: serviceIdParam,
  staffId: staffIdParam,
  date,
  time,
  source = "online",
  notes,
  tenantIdParam,
}: {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceName?: string;
  staffName?: string;
  serviceId?: string;
  staffId?: string;
  date?: string;
  time?: string;
  source?: BookingSourceEnum;
  notes?: string;
  tenantIdParam?: string;
}): Promise<
  ActionResult<{
    id: string;
    starts_at: string;
    status: AppointmentStatusEnum;
    customerName: string;
    serviceName: string;
    staffName: string;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required to book appointments." };
  }

  // 1. Resolve tenant
  let tenantId = tenantIdParam;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!tenantId) {
    tenantId = profile?.tenant_id ?? undefined;
  }

  if (!tenantId) {
    return { success: false, error: "No active business tenant found." };
  }

  // Verify membership permissions
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isAllowed = canManageBookings(membership?.role);

  if (!isAllowed) {
    return { success: false, error: "Access Denied: You do not have permissions for this business." };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .single();
  const tenantSlug: string | undefined = tenant?.slug;

  const cleanCustomerName = customerName?.trim();
  if (!cleanCustomerName) {
    return { success: false, error: "Customer name is required." };
  }

  // 2. Resolve or insert customer in public.customers
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("full_name", cleanCustomerName)
    .limit(1)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: custErr } = await supabase
      .from("customers")
      .insert({
        tenant_id: tenantId,
        full_name: cleanCustomerName,
        email: customerEmail?.trim() || null,
        phone: customerPhone?.trim() || null,
      })
      .select("id")
      .single();

    if (!custErr && newCustomer) {
      customerId = newCustomer.id;
    }
  }

  // 3. Resolve service details first (to enforce staff eligibility)
  const cleanServiceName = serviceName?.trim() || "Signature haircut";
  let serviceId: string | null = serviceIdParam || null;
  let servicePriceCents = 150000; // ₱1,500 default
  let serviceDurationMinutes = 60;
  let resolvedServiceName = cleanServiceName;

  if (serviceId) {
    const { data: svc } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle();

    if (svc) {
      resolvedServiceName = svc.name;
      servicePriceCents = svc.price_cents ?? 150000;
      serviceDurationMinutes = svc.duration_minutes ?? 60;
    }
  } else {
    const { data: matchedService } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${cleanServiceName}%`)
      .limit(1)
      .maybeSingle();

    if (matchedService) {
      serviceId = matchedService.id;
      resolvedServiceName = matchedService.name;
      servicePriceCents = matchedService.price_cents ?? 150000;
      serviceDurationMinutes = matchedService.duration_minutes ?? 60;
    }
  }

  // 4. Fetch staff_service_skills for this service (QA #1)
  let eligibleStaffIds: string[] = [];
  if (serviceId) {
    const { data: skills } = await supabase
      .from("staff_service_skills")
      .select("staff_id")
      .eq("tenant_id", tenantId)
      .eq("service_id", serviceId);

    eligibleStaffIds = (skills || []).map((s) => s.staff_id);
  }

  // 5. Resolve staff_id and enforce eligibility
  let staffId: string | null = null;
  let resolvedStaffName: string | null = null;
  const cleanStaffName = staffName?.trim();
  const isSpecificStaff = Boolean(
    staffIdParam || (cleanStaffName && cleanStaffName !== "Any available")
  );

  if (isSpecificStaff) {
    let matchedStaff: { id: string; full_name: string } | null = null;

    if (staffIdParam) {
      const { data: sm } = await supabase
        .from("staff_members")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .eq("id", staffIdParam)
        .maybeSingle();
      matchedStaff = sm;
    } else if (cleanStaffName && cleanStaffName !== "Any available") {
      const { data: sm } = await supabase
        .from("staff_members")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .ilike("full_name", `%${cleanStaffName}%`)
        .limit(1)
        .maybeSingle();
      matchedStaff = sm;
    }

    if (!matchedStaff) {
      return { success: false, error: "Selected staff member not found." };
    }

    // QA #1 Guard: If service has configured staff skills, reject ineligible staff
    if (eligibleStaffIds.length > 0 && !eligibleStaffIds.includes(matchedStaff.id)) {
      return {
        success: false,
        error: "Selected staff member is not eligible for this service.",
      };
    }

    staffId = matchedStaff.id;
    resolvedStaffName = matchedStaff.full_name;
  } else {
    // "Any available" or unspecified: pick qualified staff if skills are defined
    if (eligibleStaffIds.length > 0) {
      const { data: qualifiedStaff } = await supabase
        .from("staff_members")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .in("id", eligibleStaffIds)
        .order("full_name", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (qualifiedStaff) {
        staffId = qualifiedStaff.id;
        resolvedStaffName = qualifiedStaff.full_name;
      }
    }

    if (!staffId) {
      const { data: fallbackStaff } = await supabase
        .from("staff_members")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("full_name", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackStaff) {
        staffId = fallbackStaff.id;
        resolvedStaffName = fallbackStaff.full_name;
      } else {
        // Create initial staff member for this tenant if none exist
        const { data: newStaff } = await supabase
          .from("staff_members")
          .insert({
            tenant_id: tenantId,
            full_name: cleanStaffName || "Lead Specialist",
            active: true,
          })
          .select("id, full_name")
          .single();
        staffId = newStaff?.id ?? null;
        resolvedStaffName = newStaff?.full_name ?? "Lead Specialist";
      }
    }
  }

  if (!staffId) {
    return { success: false, error: "Could not assign a staff member for this booking." };
  }

  // 5. Calculate starts_at and ends_at in Asia/Manila (UTC+08:00)
  const bookingDateStr = date || new Date().toISOString().slice(0, 10);
  const bookingTimeStr = time || "10:00 AM";

  const { startsAt, startsAtDate } = combineDateAndTimeManila(bookingDateStr, bookingTimeStr);
  const endsAt = new Date(startsAtDate.getTime() + serviceDurationMinutes * 60 * 1000).toISOString();

  // 6. Insert into public.appointments
  const { data: apptRow, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      staff_id: staffId,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: "Asia/Manila",
      status: "confirmed",
      source: source || "online",
      total_cents: servicePriceCents,
      notes: notes || null,
      created_by: user.id,
    })
    .select("id, starts_at, status")
    .single();

  if (apptErr || !apptRow) {
    return { success: false, error: `Failed to create appointment: ${apptErr?.message}` };
  }

  // 7. Insert appointment_services line item if service was identified
  if (serviceId) {
    await supabase.from("appointment_services").insert({
      tenant_id: tenantId,
      appointment_id: apptRow.id,
      service_id: serviceId,
      staff_id: staffId,
      price_cents: servicePriceCents,
      duration_minutes: serviceDurationMinutes,
    });
  }

  await revalidateTenantDashboard(tenantSlug);

  return {
    success: true,
    message: `Appointment booked for ${cleanCustomerName}.`,
    data: {
      id: apptRow.id,
      starts_at: apptRow.starts_at,
      status: apptRow.status,
      customerName: cleanCustomerName,
      serviceName: resolvedServiceName,
      staffName: resolvedStaffName || cleanStaffName || "Specialist",
    },
  };
}

/**
 * Action: Adds a customer or walk-in to the tenant waitlist (public.waitlist_entries).
 */
export async function addToWaitlistAction({
  customerName,
  customerPhone,
  serviceName,
  staffName,
  notes,
  tenantIdParam,
}: {
  customerName: string;
  customerPhone?: string;
  serviceName?: string;
  staffName?: string;
  notes?: string;
  tenantIdParam?: string;
}): Promise<ActionResult<{ id: string; joined_at: string; status: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  let tenantId = tenantIdParam;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!tenantId) {
    tenantId = profile?.tenant_id ?? undefined;
  }

  if (!tenantId) {
    return { success: false, error: "No active tenant found." };
  }

  // Verify membership permissions
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isAllowed = canManageBookings(membership?.role);

  if (!isAllowed) {
    return { success: false, error: "Access Denied: Insufficient permissions for this business." };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .single();
  const tenantSlug: string | undefined = tenant?.slug;

  const cleanCustomerName = customerName?.trim();
  if (!cleanCustomerName) {
    return { success: false, error: "Customer name is required." };
  }

  // Resolve service if provided
  let serviceId: string | null = null;
  if (serviceName?.trim()) {
    const { data: matchedService } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", `%${serviceName.trim()}%`)
      .limit(1)
      .maybeSingle();
    serviceId = matchedService?.id ?? null;
  }

  // Resolve staff if provided
  let staffId: string | null = null;
  if (staffName?.trim() && staffName !== "Any available") {
    const { data: matchedStaff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("full_name", `%${staffName.trim()}%`)
      .limit(1)
      .maybeSingle();
    staffId = matchedStaff?.id ?? null;
  }

  const { data: entry, error: entryErr } = await supabase
    .from("waitlist_entries")
    .insert({
      tenant_id: tenantId,
      guest_name: cleanCustomerName,
      guest_phone: customerPhone?.trim() || null,
      service_id: serviceId,
      staff_id: staffId,
      notes: notes?.trim() || null,
      status: "waiting",
    })
    .select("id, joined_at, status")
    .single();

  if (entryErr || !entry) {
    return { success: false, error: `Failed to add to waitlist: ${entryErr?.message}` };
  }

  await revalidateTenantDashboard(tenantSlug);

  return {
    success: true,
    message: `${cleanCustomerName} added to waitlist.`,
    data: {
      id: entry.id,
      joined_at: entry.joined_at,
      status: entry.status,
    },
  };
}
