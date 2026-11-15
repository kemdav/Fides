import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OverviewView, AppointmentRow, DayChartStat } from "@/components/merchant/overview/overview-view";

/**
 * Merchant Dashboard Overview (`/dashboard`).
 *
 * Pixel-matched to design specifications (Screenshot 2026-11-07 160453).
 * Fetches real metrics, appointments, and payments from Supabase for authenticated tenant (QA #1).
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; tenant?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?redirect=/dashboard");
  }

  const { tenant: currentTenantSlug } = (await searchParams) || {};

  // Fetch profile to resolve active tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .single();

  let tenantId = profile?.tenant_id;
  let businessName = "Bella Vita";

  if (currentTenantSlug) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("slug", currentTenantSlug)
      .single();
    if (tData) {
      tenantId = tData.id;
      businessName = tData.name;
    }
  } else if (tenantId) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("id", tenantId)
      .single();
    if (tData) {
      businessName = tData.name;
    }
  }

  let todayCount = 0;
  let confirmedCount = 0;
  let pendingCount = 0;
  let checkedInCount = 0;
  let completedVisitsCount = 0;
  let revenueTotal = 0;
  let chartStats: DayChartStat[] = [];
  let initialRows: AppointmentRow[] = [];
  let calendarAppointments: AppointmentRow[] = [];
  let todayActivity: { time: string; customer: string; service: string }[] = [];

  if (tenantId) {
    // 1. Fetch appointments with customer, staff, and service relations
    const { data: allAppointments } = await supabase
      .from("appointments")
      .select(`
        id,
        starts_at,
        ends_at,
        source,
        status,
        total_cents,
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

    // 2. Fetch payments for revenue computation
    const { data: allPayments } = await supabase
      .from("payments")
      .select("id, amount_cents, status, created_at")
      .eq("tenant_id", tenantId);

    // 3. Compute counts based on today's date (QA #1)
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const appts = allAppointments || [];
    const todayAppointments = appts.filter((a) => a.starts_at && a.starts_at.slice(0, 10) === todayStr);

    todayCount = todayAppointments.length;
    confirmedCount = todayAppointments.filter((a) => a.status === "confirmed").length;
    pendingCount = appts.filter((a) => a.status === "pending_approval").length;
    checkedInCount = todayAppointments.filter(
      (a) => a.status === "checked_in" || a.status === "in_service"
    ).length;

    const completedAppts = todayAppointments.filter((a) => a.status === "completed");
    completedVisitsCount = completedAppts.length;

    // 4. Compute revenue from payments or completed appointments (QA #1)
    const paidPayments = (allPayments || []).filter((p) => p.status === "paid");
    revenueTotal = paidPayments.reduce((sum, p) => sum + Math.round(p.amount_cents / 100), 0);
    if (revenueTotal === 0 && completedAppts.length > 0) {
      revenueTotal = completedAppts.reduce((sum, a) => sum + Math.round((a.total_cents || 0) / 100), 0);
    }

    // 5. Compute dynamic chart statistics for this week (Mon - Sun)
    const currentDay = now.getUTCDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + mondayOffset);

    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    chartStats = weekDays.map((dayName, idx) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + idx);
      const dStr = d.toISOString().slice(0, 10);

      const dayAppts = appts.filter((a) => a.starts_at && a.starts_at.slice(0, 10) === dStr);
      const booked = dayAppts.filter((a) => a.status !== "cancelled" && a.status !== "rejected").length;
      const completed = dayAppts.filter((a) => a.status === "completed").length;

      return { day: dayName, booked, completed };
    });

    // 6. Map today's appointments into table rows (QA #1: No mock rows fallback)
    initialRows = todayAppointments.map((row) => {
      const timeStr = new Date(row.starts_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const customerName = cust?.full_name?.trim() || "Customer";

      const staff = Array.isArray(row.staff_members) ? row.staff_members[0] : row.staff_members;
      const staffName = staff?.full_name?.trim() || "Specialist";

      const apptServices = Array.isArray(row.appointment_services)
        ? row.appointment_services[0]
        : row.appointment_services;
      const svc = Array.isArray(apptServices?.services)
        ? apptServices?.services[0]
        : apptServices?.services;
      const serviceName = svc?.name || "Signature service";

      const sourceVal: AppointmentRow["source"] =
        row.source === "walk_in" ? "Walk-In" : "Online";

      let statusVal: AppointmentRow["status"] = "Confirmed";
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
        rawStatus: row.status,
      };
    });

    todayActivity = initialRows.slice(0, 4).map((r) => ({
      time: r.time,
      customer: r.customer,
      service: r.service,
    }));
    calendarAppointments = initialRows;
  }

  return (
    <OverviewView
      businessName={businessName}
      userName={profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "Maria Santos"}
      userRole={profile?.role === "owner" ? "Business owner" : profile?.role || "Staff"}
      tenantId={tenantId ?? undefined}
      todayCount={todayCount}
      confirmedCount={confirmedCount}
      pendingCount={pendingCount}
      checkedInCount={checkedInCount}
      completedVisitsCount={completedVisitsCount}
      revenueTotal={revenueTotal}
      chartStats={chartStats}
      todayActivity={todayActivity}
      initialRows={initialRows}
      calendarAppointments={calendarAppointments}
    />
  );
}
