import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsView, AppointmentItem } from "@/components/merchant/appointments/appointments-view";

/**
 * Merchant Appointments Page (`/dashboard/appointments`).
 *
 * Pixel-matched to design specifications (Screenshot 2026-11-07 160513).
 * Fetches real appointments from Supabase for authenticated tenant (QA #1, #2, #3, #4).
 */
export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/appointments");
  }

  const { tenant: tenantSlugParam } = (await searchParams) || {};

  // Fetch profile to resolve active tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  let tenantId = profile?.tenant_id;
  let businessName = "Bella Vita";

  if (tenantSlugParam) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("slug", tenantSlugParam)
      .single();
    if (tData) {
      tenantId = tData.id;
      businessName = tData.name;
    }
  } else if (tenantId) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();
    if (tData) {
      businessName = tData.name;
    }
  }

  let dbItems: AppointmentItem[] = [];
  let todayCount = 0;
  let awaitingCount = 0;
  let checkedInCount = 0;
  let completedTodayCount = 0;

  if (tenantId) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const { data: appData } = await supabase
      .from("appointments")
      .select(`
        id,
        starts_at,
        source,
        status,
        customer_id,
        customers (id, full_name, email, phone),
        staff_members (id, full_name),
        appointment_services (
          service_id,
          services (id, name)
        )
      `)
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: true });

    if (appData) {
      const todayAppointments = appData.filter(
        (a) => a.starts_at && a.starts_at.slice(0, 10) === todayStr
      );

      todayCount = todayAppointments.length;
      awaitingCount = appData.filter((a) => a.status === "pending_approval").length;
      checkedInCount = todayAppointments.filter(
        (a) => a.status === "checked_in" || a.status === "in_service"
      ).length;
      completedTodayCount = todayAppointments.filter((a) => a.status === "completed").length;

      dbItems = appData.map((row) => {
        const timeStr = new Date(row.starts_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        const customerName = cust?.full_name?.trim() || "Customer";

        const staff = Array.isArray(row.staff_members) ? row.staff_members[0] : row.staff_members;
        const staffName = staff?.full_name?.trim() || "Lead Specialist";

        const apptServices = Array.isArray(row.appointment_services)
          ? row.appointment_services[0]
          : row.appointment_services;
        const svc = Array.isArray(apptServices?.services)
          ? apptServices?.services[0]
          : apptServices?.services;
        const serviceName = svc?.name || "Signature haircut";

        const sourceVal: AppointmentItem["source"] =
          row.source === "walk_in" ? "Walk-In" : "Online";

        let statusVal: AppointmentItem["status"] = "Confirmed";
        if (row.status === "pending_approval") statusVal = "Pending approval";
        else if (row.status === "checked_in") statusVal = "Check In";
        else if (row.status === "in_service") statusVal = "In service";
        else if (row.status === "completed") statusVal = "Completed";
        else if (row.status === "cancelled") statusVal = "Cancelled";

        return {
          id: row.id,
          time: timeStr || "09:00",
          customer: customerName,
          service: serviceName,
          staff: staffName,
          source: sourceVal,
          status: statusVal,
          startsAt: row.starts_at,
        };
      });
    }
  }

  return (
    <AppointmentsView
      businessName={businessName}
      userEmail={user.email ?? "Maria Santos"}
      tenantId={tenantId ?? undefined}
      todayCount={todayCount}
      awaitingCount={awaitingCount}
      checkedInCount={checkedInCount}
      completedTodayCount={completedTodayCount}
      initialItems={dbItems}
    />
  );
}
