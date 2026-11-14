import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  OverviewView,
  type AppointmentRow,
  type DayChartStat,
} from "@/components/merchant/overview/overview-view";
import { createClient } from "@/lib/supabase/server";

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
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const { data: allAppointments } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      source,
      status,
      total_cents,
      customers (full_name),
      staff_members (full_name),
      appointment_services (services (name))
    `)
    .eq("tenant_id", tenant.id)
    .order("starts_at", { ascending: true });

  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount_cents, status")
    .eq("tenant_id", tenant.id);

  const appointments = allAppointments || [];
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.starts_at?.slice(0, 10) === todayStr
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
    const customer = Array.isArray(appointment.customers)
      ? appointment.customers[0]
      : appointment.customers;
    const staff = Array.isArray(appointment.staff_members)
      ? appointment.staff_members[0]
      : appointment.staff_members;
    const appointmentService = Array.isArray(appointment.appointment_services)
      ? appointment.appointment_services[0]
      : appointment.appointment_services;
    const service = Array.isArray(appointmentService?.services)
      ? appointmentService.services[0]
      : appointmentService?.services;

    let status: AppointmentRow["status"] = "Confirmed";
    if (appointment.status === "pending_approval") status = "Pending approval";
    if (appointment.status === "checked_in") status = "Check In";
    if (appointment.status === "in_service") status = "In service";
    if (appointment.status === "completed") status = "Completed";
    if (appointment.status === "cancelled") status = "Cancelled";

    return {
      id: appointment.id,
      time: new Date(appointment.starts_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      customer: customer?.full_name?.trim() || "Customer",
      service: service?.name || "Signature service",
      staff: staff?.full_name?.trim() || "Specialist",
      source: appointment.source === "walk_in" ? "Walk-In" : "Online",
      status,
      startsAt: appointment.starts_at,
      rawStatus: appointment.status,
    };
  };
  const calendarAppointments = appointments.map(toAppointmentRow);
  const initialRows: AppointmentRow[] = todayAppointments.map(toAppointmentRow);

  const currentDay = now.getUTCDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  const chartStats: DayChartStat[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
    (day, index) => {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + index);
      const dateString = date.toISOString().slice(0, 10);
      const dayAppointments = appointments.filter(
        (appointment) => appointment.starts_at?.slice(0, 10) === dateString
      );
      return {
        day,
        booked: dayAppointments.filter(
          (appointment) => !["cancelled", "rejected"].includes(appointment.status)
        ).length,
        completed: dayAppointments.filter(
          (appointment) => appointment.status === "completed"
        ).length,
      };
    }
  );

  return (
    <OverviewView
      businessName={tenant.name}
      userName={profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "Merchant staff"}
      userRole={profile?.role === "owner" ? "Business owner" : profile?.role || "Staff"}
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
