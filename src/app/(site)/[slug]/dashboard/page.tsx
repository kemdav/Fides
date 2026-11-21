import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  OverviewView,
  type AppointmentRow,
  type DayChartStat,
} from "@/components/merchant/overview/overview-view";
import { createClient } from "@/lib/supabase/server";
import {
  formatTimeManila,
  getManilaDateKey,
  getManilaTodayKey,
  getManilaWeekDays,
  mapDbSourceToUi,
  mapDbStatusToUi,
  resolveCustomerName,
  resolveServiceName,
  resolveStaffName,
} from "@/lib/date-utils";

interface MerchantDashboardPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantDashboardPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} Merchant Workspace`,
    description: "Manage appointments, walk-ins, customers, and daily operations.",
  };
}

export default async function MerchantDashboardPage({
  params,
}: MerchantDashboardPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isTenantMember =
    Boolean(membership) ||
    (profile?.tenant_id === tenant.id &&
      ["owner", "admin", "receptionist", "staff"].includes(profile?.role || ""));

  if (!isTenantMember) {
    notFound();
  }

  const userRole = membership?.role || profile?.role || "staff";
  const formattedRole =
    userRole === "owner"
      ? "Business owner"
      : userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const { data: allAppointments } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      source,
      status,
      total_cents,
      notes,
      customers (full_name),
      staff_members (full_name),
      appointment_services (services (name))
    `)
    .eq("tenant_id", tenant.id)
    .order("starts_at", { ascending: true });

  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount_cents, status, paid_at")
    .eq("tenant_id", tenant.id);

  const appointments = allAppointments || [];
  const todayManilaKey = getManilaTodayKey();

  const todayAppointments = appointments.filter(
    (appointment) => getManilaDateKey(appointment.starts_at) === todayManilaKey
  );
  const completedToday = todayAppointments.filter(
    (appointment) => appointment.status === "completed"
  );
  const paidPayments = (allPayments || []).filter(
    (payment) => payment.status === "paid"
  );
  const revenueTotal = paidPayments.reduce(
    (sum, payment) => sum + Math.round(payment.amount_cents / 100),
    0
  );

  const toAppointmentRow = (appointment: (typeof appointments)[number]): AppointmentRow => {
    return {
      id: appointment.id,
      time: formatTimeManila(appointment.starts_at),
      customer: resolveCustomerName(appointment.customers, appointment.notes),
      service: resolveServiceName(appointment.appointment_services),
      staff: resolveStaffName(appointment.staff_members),
      source: mapDbSourceToUi(appointment.source),
      status: mapDbStatusToUi(appointment.status),
      startsAt: appointment.starts_at,
      rawStatus: appointment.status,
    };
  };

  const calendarAppointments = appointments.map(toAppointmentRow);
  const initialRows: AppointmentRow[] = todayAppointments.map(toAppointmentRow);

  // Timezone-safe weekly Monday–Sunday stats in Asia/Manila
  const weekDays = getManilaWeekDays();
  const chartStats: DayChartStat[] = weekDays.map(({ day, dateKey }) => {
    const dayAppointments = appointments.filter(
      (appointment) => getManilaDateKey(appointment.starts_at) === dateKey
    );
    return {
      day,
      booked: dayAppointments.filter(
        (appointment) => !["cancelled", "rejected", "expired"].includes(appointment.status)
      ).length,
      completed: dayAppointments.filter(
        (appointment) => appointment.status === "completed"
      ).length,
    };
  });

  return (
    <OverviewView
      businessName={tenant.name}
      userName={profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "Merchant staff"}
      userRole={formattedRole}
      tenantId={tenant.id}
      basePath={`/${slug}`}
      todayCount={todayAppointments.length}
      confirmedCount={todayAppointments.filter((appointment) => appointment.status === "confirmed").length}
      pendingCount={appointments.filter((appointment) => appointment.status === "pending_approval").length}
      checkedInCount={todayAppointments.filter((appointment) =>
        ["checked_in", "in_service"].includes(appointment.status)
      ).length}
      completedVisitsCount={completedToday.length}
      revenueTotal={revenueTotal}
      chartStats={chartStats}
      todayActivity={initialRows.slice(0, 4).map((row) => ({
        time: row.time,
        customer: row.customer,
        service: row.service,
      }))}
      initialRows={initialRows}
      calendarAppointments={calendarAppointments}
    />
  );
}
