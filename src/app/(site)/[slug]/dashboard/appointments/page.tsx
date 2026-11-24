import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  AppointmentsView,
  type AppointmentItem,
} from "@/components/merchant/appointments/appointments-view";
import { createClient } from "@/lib/supabase/server";
import { getActiveStaffForProfile } from "@/lib/merchant/staff-profile";
import {
  formatTimeManila,
  getManilaDateKey,
  getManilaTodayKey,
  mapDbSourceToUi,
  mapDbStatusToUi,
  resolveCustomerName,
  resolveServiceName,
  resolveStaffName,
} from "@/lib/date-utils";
import type {
  AppointmentServiceOption,
  AppointmentStaffOption,
} from "@/types/appointments";

interface MerchantAppointmentsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ staff?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: MerchantAppointmentsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} Appointments`
      : "Merchant Appointments",
    description: "Manage bookings, approvals, and appointment outcomes.",
  };
}

export default async function MerchantAppointmentsPage({
  params,
  searchParams,
}: MerchantAppointmentsPageProps) {
  const { slug } = await params;
  const { staff } = await searchParams;
  const requestedStaffId =
    typeof staff === "string" &&
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(staff)
      ? staff
      : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/${slug}/dashboard/appointments${requestedStaffId ? `?staff=${requestedStaffId}` : ""}`)}`,
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  // Verify membership in tenant_memberships or platform admin
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
      ["owner", "admin", "receptionist", "staff"].includes(
        profile?.role || "",
      ));

  if (!isTenantMember) {
    notFound();
  }

  const userRole = membership?.role || profile?.role || "staff";
  const formattedRole =
    userRole === "owner"
      ? "Business owner"
      : userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const ownStaff =
    userRole === "staff"
      ? await getActiveStaffForProfile(tenant.id, user.id)
      : null;
  const staffId = userRole === "staff" ? ownStaff?.id : requestedStaffId;
  const tenantId = tenant.id;
  const appointmentQuery = () =>
    supabase
      .from("appointments")
      .select(
        `
      id,
      starts_at,
      ends_at,
      source,
      status,
      total_cents,
      notes,
      customers (id, full_name, email, phone),
      staff_members (id, full_name),
      appointment_services (
        price_cents,
        duration_minutes,
        services (id, name)
      ),
      assigned:appointment_services()
    `,
      )
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: true })
      .order("id");
  function scopedQuery() {
    const query = appointmentQuery();
    if (staffId)
      query
        .eq("assigned.staff_id", staffId)
        .or(`staff_id.eq.${staffId},assigned.not.is.null`);
    return query;
  }
  async function loadAppointments() {
    if (userRole !== "staff") {
      const { data, error } = await scopedQuery();
      if (error) throw error;
      return data;
    }
    const rows: NonNullable<
      Awaited<ReturnType<typeof appointmentQuery>>["data"]
    > = [];
    if (!ownStaff) return rows;
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await scopedQuery().range(
        offset,
        offset + pageSize - 1,
      );
      if (error) throw error;
      rows.push(...data);
      if (data.length < pageSize) return rows;
    }
  }
  const [appointments, { data: focus }] = await Promise.all([
    loadAppointments(),
    userRole !== "staff" && staffId
      ? supabase
          .from("staff_members")
          .select("full_name")
          .eq("tenant_id", tenant.id)
          .eq("id", staffId)
          .maybeSingle()
      : { data: ownStaff },
  ]);

  const [
    { data: activeServices },
    { data: activeStaffMembers },
    { data: staffSkills },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .eq("is_archived", false)
      .order("name", { ascending: true }),
    supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("staff_service_skills")
      .select("service_id, staff_id")
      .eq("tenant_id", tenant.id),
  ]);

  const skillsByServiceId = new Map<string, string[]>();
  for (const row of staffSkills || []) {
    const existing = skillsByServiceId.get(row.service_id) ?? [];
    existing.push(row.staff_id);
    skillsByServiceId.set(row.service_id, existing);
  }

  const serviceOptions: AppointmentServiceOption[] = (activeServices || []).map(
    (s) => ({
      id: s.id,
      name: s.name,
      priceCents: s.price_cents ?? 0,
      durationMinutes: s.duration_minutes ?? 60,
      eligibleStaffIds: skillsByServiceId.get(s.id) ?? [],
    }),
  );

  const staffOptions: AppointmentStaffOption[] = (activeStaffMembers || []).map(
    (sm) => ({
      id: sm.id,
      fullName: sm.full_name,
    }),
  );

  const todayManilaKey = getManilaTodayKey();

  const todayAppointments = appointments.filter(
    (appt) => getManilaDateKey(appt.starts_at) === todayManilaKey,
  );

  // KPI Calculations in Asia/Manila context
  const todayCount = todayAppointments.length;
  const awaitingCount = appointments.filter(
    (appt) => appt.status === "pending_approval",
  ).length;
  const checkedInCount = todayAppointments.filter((appt) =>
    ["checked_in", "in_service"].includes(appt.status),
  ).length;
  const completedTodayCount = todayAppointments.filter(
    (appt) => appt.status === "completed",
  ).length;

  // Map to UI AppointmentItem format
  const initialItems: AppointmentItem[] = appointments.map((appt) => ({
    id: appt.id,
    time: formatTimeManila(appt.starts_at),
    customer: resolveCustomerName(
      appt.customers,
      userRole === "staff" ? null : appt.notes,
    ),
    service: resolveServiceName(appt.appointment_services),
    staff: focus?.full_name ?? resolveStaffName(appt.staff_members),
    source: mapDbSourceToUi(appt.source),
    status: mapDbStatusToUi(appt.status),
    startsAt: appt.starts_at,
    staffScheduleMatch: Boolean(staffId && userRole !== "staff"),
  }));

  return (
    <AppointmentsView
      key={staffId ?? "all"}
      businessName={tenant.name}
      userName={
        profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"
      }
      userEmail={user.email ?? "Merchant staff"}
      userRole={formattedRole}
      tenantId={tenant.id}
      basePath={`/${slug}`}
      todayCount={todayCount}
      awaitingCount={awaitingCount}
      checkedInCount={checkedInCount}
      completedTodayCount={completedTodayCount}
      initialItems={initialItems}
      services={serviceOptions}
      staff={staffOptions}
      focusedStaffName={
        userRole !== "staff" && staffId
          ? (focus?.full_name ?? "Selected staff member")
          : undefined
      }
    />
  );
}
