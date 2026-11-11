"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

/**
 * Action: Updates an appointment's status in Supabase (QA #3).
 */
export async function updateAppointmentStatusAction({
  appointmentId,
  newStatus,
  reason,
  tenantIdParam,
}: {
  appointmentId: string;
  newStatus: string;
  reason?: string;
  tenantIdParam?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  // Resolve target tenant
  let targetTenantId = tenantIdParam;
  if (!targetTenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    targetTenantId = profile?.tenant_id ?? undefined;
  }

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
  if (targetTenantId) {
    query = query.eq("tenant_id", targetTenantId);
  }

  const { error } = await query;

  if (error) {
    return { success: false, error: `Failed to update appointment: ${error.message}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/overview");
  revalidatePath("/appointments");

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

  // Resolve tenant
  let tenantId = tenantIdParam;
  if (!tenantId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    tenantId = profile?.tenant_id ?? undefined;
  }

  if (!tenantId) {
    const { data: firstTenant } = await supabase
      .from("tenants")
      .select("id")
      .limit(1)
      .single();
    tenantId = firstTenant?.id;
  }

  if (!tenantId) {
    return { success: false, error: "No active business tenant found." };
  }

  const cleanCustomerName = customerName?.trim();
  if (!cleanCustomerName) {
    return { success: false, error: "Customer name is required." };
  }

  // 1. Resolve or insert customer in public.customers
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

  // 2. Resolve staff_id from public.staff_members
  let staffId: string | null = null;
  const cleanStaffName = staffName?.trim();

  if (cleanStaffName) {
    const { data: matchedStaff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("full_name", `%${cleanStaffName}%`)
      .limit(1)
      .maybeSingle();

    if (matchedStaff) staffId = matchedStaff.id;
  }

  if (!staffId) {
    const { data: fallbackStaff } = await supabase
      .from("staff_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    if (fallbackStaff) {
      staffId = fallbackStaff.id;
    } else {
      // Create initial staff member for this tenant if none exist
      const { data: newStaff } = await supabase
        .from("staff_members")
        .insert({
          tenant_id: tenantId,
          full_name: cleanStaffName || "Lead Specialist",
          active: true,
        })
        .select("id")
        .single();
      staffId = newStaff?.id ?? null;
    }
  }

  if (!staffId) {
    return { success: false, error: "Could not assign a staff member for this booking." };
  }

  // 3. Resolve service details
  const cleanServiceName = serviceName?.trim() || "Signature haircut";
  let serviceId: string | null = null;
  let servicePriceCents = 150000; // ₱1,500 default
  let serviceDurationMinutes = 45;

  const { data: matchedService } = await supabase
    .from("services")
    .select("id, price_cents, duration_minutes")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${cleanServiceName}%`)
    .limit(1)
    .maybeSingle();

  if (matchedService) {
    serviceId = matchedService.id;
    servicePriceCents = matchedService.price_cents ?? 150000;
    serviceDurationMinutes = matchedService.duration_minutes ?? 45;
  }

  // 4. Calculate starts_at and ends_at
  const bookingDateStr = date || new Date().toISOString().slice(0, 10);
  let hour = 10;
  let minute = 0;

  if (time) {
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = parseInt(timeMatch[2], 10);
      const meridiem = timeMatch[3]?.toUpperCase();
      if (meridiem === "PM" && hour < 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;
    }
  }

  const startDate = new Date(`${bookingDateStr}T12:00:00Z`);
  startDate.setUTCHours(hour, minute, 0, 0);
  const startsAt = startDate.toISOString();
  const endsAt = new Date(startDate.getTime() + serviceDurationMinutes * 60 * 1000).toISOString();

  // 5. Insert into public.appointments
  const { data: apptRow, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      staff_id: staffId,
      starts_at: startsAt,
      ends_at: endsAt,
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

  // 6. Insert appointment_services line item if service was identified
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

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/overview");
  revalidatePath("/appointments");

  return {
    success: true,
    message: `Appointment booked for ${cleanCustomerName}.`,
    data: {
      id: apptRow.id,
      starts_at: apptRow.starts_at,
      status: apptRow.status,
      customerName: cleanCustomerName,
      serviceName: cleanServiceName,
      staffName: cleanStaffName || "Specialist",
    },
  };
}
