import { notFound, redirect } from "next/navigation";
import { AppointmentsView } from "@/components/merchant/appointments/appointments-view";
import { createClient } from "@/lib/supabase/server";
import { toAppointmentRow, zonedDateToUtc } from "@/lib/merchant/overview";
import { getActiveStaffForProfile, staffDateKey } from "@/lib/merchant/staff-profile";

import { canManageBookings } from "@/lib/merchant/workspace-roles";

interface SchedulePageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ staff?: string | string[] }>;
  walkInsOnly?: boolean;
}

export async function SchedulePage({
  params,
  searchParams,
  walkInsOnly = false,
}: SchedulePageProps) {
  const { slug } = await params;
  const { staff } = (await searchParams) ?? {};
  const requestedStaffId = !walkInsOnly && typeof staff === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(staff) ? staff : undefined;
  const basePath = `/${slug}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const path = `${basePath}/dashboard/${walkInsOnly ? "walk-ins" : "appointments"}${requestedStaffId ? `?staff=${requestedStaffId}` : ""}`;
    redirect(`/login?redirect=${encodeURIComponent(path)}`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, timezone")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  const { data: membership } = await supabase.from("tenant_memberships").select("role, profiles(full_name)")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  if (!membership || (walkInsOnly && !canManageBookings(membership.role))) notFound();

  const isServiceStaff = membership.role === "staff";
  const tenantId = tenant.id;
  const ownStaff = isServiceStaff ? await getActiveStaffForProfile(tenantId, user.id) : null;
  const staffId = isServiceStaff ? ownStaff?.id : requestedStaffId;
  const timezone = tenant.timezone || "Asia/Manila";
  const now = new Date();
  const today = staffDateKey(now, timezone);

  function buildQuery() {
    const query = supabase.from("appointments")
      .select("id, starts_at, source, status, customers(full_name), staff_members(full_name), appointment_services(services(name)), assigned:appointment_services()")
      .eq("tenant_id", tenantId).order("starts_at").order("id");
    if (staffId) query.eq("assigned.staff_id", staffId).or(`staff_id.eq.${staffId},assigned.not.is.null`);
    if (walkInsOnly) {
      query.eq("source", "walk_in").gte("starts_at", zonedDateToUtc(today, timezone).toISOString())
        .in("status", ["pending_approval", "confirmed", "checked_in", "in_service", "completed"]);
    } else if (!isServiceStaff) {
      query.in("status", ["pending_approval", "confirmed", "checked_in", "in_service"])
        .gte("starts_at", now.toISOString());
    }
    return query;
  }

  async function loadAppointments() {
    if (!isServiceStaff) {
      const { data, error } = await buildQuery();
      if (error) throw error;
      return data;
    }
    const rows: NonNullable<Awaited<ReturnType<typeof buildQuery>>["data"]> = [];
    if (!ownStaff) return rows;
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < pageSize) return rows;
    }
  }

  const [appointments, focusedStaff] = await Promise.all([
    loadAppointments(),
    !isServiceStaff && staffId
      ? supabase.from("staff_members").select("full_name").eq("tenant_id", tenant.id).eq("id", staffId).maybeSingle()
      : { data: null, error: null },
  ]);
  if (focusedStaff.error) throw focusedStaff.error;
  const staffName = ownStaff?.full_name ?? focusedStaff.data?.full_name;
  const items = appointments.map((appointment) => ({
    ...toAppointmentRow(appointment, timezone),
    ...(staffName && { staff: staffName }),
    staffScheduleMatch: !isServiceStaff && Boolean(staffId),
  }));
  const todayItems = walkInsOnly ? items.filter((item) => item.calendarDate === today) : [];

  return (
    <AppointmentsView
      key={staffId ?? "all"}
      businessName={tenant.name}
      userName={membership?.profiles?.full_name ?? undefined}
      userEmail={user.email ?? "Merchant staff"}
      userRole={membership.role}
      walkInsOnly={walkInsOnly}
      tenantId={tenant.id}
      basePath={basePath}
      focusedStaffName={!isServiceStaff && staffId ? focusedStaff.data?.full_name ?? "Selected staff member" : undefined}
      initialItems={walkInsOnly ? items.filter((item) => item.status !== "Completed") : items}
      todayCount={walkInsOnly ? todayItems.length : undefined}
      awaitingCount={walkInsOnly ? items.filter((item) => item.status === "Pending approval").length : undefined}
      checkedInCount={walkInsOnly ? todayItems.filter((item) => item.status === "Check In" || item.status === "In service").length : undefined}
      completedTodayCount={walkInsOnly ? todayItems.filter((item) => item.status === "Completed").length : undefined}
    />
  );
}
