"use server";

import { z } from "zod";
import { resolveCustomerName } from "@/lib/date-utils";
import { zonedDateToUtc } from "@/lib/merchant/overview";
import { buildStaffWorkWeek } from "@/lib/merchant/staff-profile";
import { addScheduleDays, scheduleWeekStart, type StaffSchedule } from "@/lib/merchant/staff-schedule";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const scheduleRequest = z.object({
  tenantId: z.uuid(),
  staffId: z.uuid(),
  date: z.iso.date(),
});

export async function loadStaffScheduleAction(input: z.input<typeof scheduleRequest>): Promise<StaffSchedule | null> {
  const parsed = scheduleRequest.safeParse(input);
  if (!parsed.success || parsed.data.date < "1900-01-08" || parsed.data.date > "9998-12-24") return null;
  const { tenantId, staffId, date } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase.from("tenant_memberships").select("role, tenants(timezone)")
    .eq("tenant_id", tenantId).eq("profile_id", user.id).maybeSingle();
  if (!membership?.tenants || (membership.role !== "owner" && membership.role !== "admin")) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data: staff, error: staffError } = await db.from("staff_members").select("id")
    .eq("tenant_id", tenantId).eq("id", staffId).maybeSingle();
  if (staffError) throw staffError;
  if (!staff) return null;

  const timezone = membership.tenants.timezone || "Asia/Manila";
  const monday = scheduleWeekStart(date);
  const nextMonday = addScheduleDays(monday, 7);
  const from = zonedDateToUtc(monday, timezone).toISOString();
  const until = zonedDateToUtc(nextMonday, timezone).toISOString();
  const now = new Date().toISOString();
  const appointmentQuery = () => db.from("appointments").select(`
    id, staff_id, starts_at, ends_at, status, notes, customers(full_name),
    appointment_services(staff_id, services(name)),
    resource_allocations!resource_allocations_tenant_appointment_fkey(resources(name)),
    assigned:appointment_services()
  `).eq("tenant_id", tenantId).eq("assigned.staff_id", staffId)
    .or(`staff_id.eq.${staffId},assigned.not.is.null`).order("starts_at").order("id");

  const [bookings, next, shifts, leaves] = await Promise.all([
    appointmentQuery().gt("ends_at", from).lt("starts_at", until),
    appointmentQuery().gte("starts_at", now).in("status", ["pending_approval", "confirmed", "checked_in", "in_service"]).limit(1).maybeSingle(),
    db.from("shifts").select("starts_at, ends_at, breaks(starts_at, ends_at)")
      .eq("tenant_id", tenantId).eq("staff_id", staffId).gt("ends_at", from).lt("starts_at", until),
    db.from("leaves").select("starts_on, ends_on").eq("tenant_id", tenantId).eq("staff_id", staffId)
      .eq("approved", true).lt("starts_on", nextMonday).gte("ends_on", monday),
  ]);
  for (const { error } of [bookings, next, shifts, leaves]) {
    if (error) throw error;
  }
  function toAppointment(row: NonNullable<typeof next.data>) {
    return {
      id: row.id, start: row.starts_at, end: row.ends_at, status: row.status,
      customer: resolveCustomerName(row.customers, row.notes),
      services: [...new Set(row.appointment_services.flatMap((line) =>
        line.services && (line.staff_id === staffId || (!line.staff_id && row.staff_id === staffId)) ? [line.services.name] : []
      ))],
      resources: [...new Set(row.resource_allocations.flatMap((allocation) => allocation.resources ? [allocation.resources.name] : []))],
    };
  }

  return {
    days: buildStaffWorkWeek(monday, timezone, shifts.data ?? [], leaves.data ?? []),
    appointments: (bookings.data ?? []).map(toAppointment),
    next: next.data ? toAppointment(next.data) : null,
  };
}
