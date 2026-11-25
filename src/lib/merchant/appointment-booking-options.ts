import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppointmentServiceOption, AppointmentStaffOption } from "@/types/appointments";
import type { Database } from "@/types/database.types";

export async function getAppointmentBookingOptions(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<{ services: AppointmentServiceOption[]; staff: AppointmentStaffOption[] }> {
  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes, staff_service_skills(staff_id)")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("full_name"),
  ]);

  return {
    services: (services ?? []).map((service) => ({
      id: service.id,
      name: service.name,
      priceCents: service.price_cents ?? 0,
      durationMinutes: service.duration_minutes ?? 60,
      eligibleStaffIds: service.staff_service_skills.map((skill) => skill.staff_id),
    })),
    staff: (staff ?? []).map((member) => ({ id: member.id, fullName: member.full_name })),
  };
}
