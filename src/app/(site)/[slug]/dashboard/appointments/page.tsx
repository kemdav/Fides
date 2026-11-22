import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppointmentsView } from "@/components/merchant/appointments/appointments-view";
import { createClient } from "@/lib/supabase/server";
import { toAppointmentRow } from "@/lib/merchant/overview";
import { getActiveStaffForProfile } from "@/lib/merchant/staff-profile";

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
  const requestedStaffId = typeof staff === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(staff) ? staff : undefined;
  const basePath = `/${slug}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const path = `${basePath}/dashboard/appointments${requestedStaffId ? `?staff=${requestedStaffId}` : ""}`;
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
  if (!membership) notFound();

  const isServiceStaff = membership.role === "staff";
  const tenantId = tenant.id;
  const ownStaff = isServiceStaff ? await getActiveStaffForProfile(tenantId, user.id) : null;
  const staffId = isServiceStaff ? ownStaff?.id : requestedStaffId;

  function buildQuery() {
    const query = supabase.from("appointments")
      .select("id, starts_at, source, status, customers(full_name), staff_members(full_name), appointment_services(services(name)), assigned:appointment_services()")
      .eq("tenant_id", tenantId).order("starts_at").order("id");
    if (staffId) query.eq("assigned.staff_id", staffId).or(`staff_id.eq.${staffId},assigned.not.is.null`);
    if (!isServiceStaff) query.in("status", ["pending_approval", "confirmed", "checked_in", "in_service"])
      .gte("starts_at", new Date().toISOString());
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

  return (
    <AppointmentsView
      key={staffId ?? "all"}
      businessName={tenant.name}
      userName={membership?.profiles?.full_name ?? undefined}
      userEmail={user.email ?? "Merchant staff"}
      userRole={membership.role}
      tenantId={tenant.id}
      basePath={basePath}
      focusedStaffName={!isServiceStaff && staffId ? focusedStaff.data?.full_name ?? "Selected staff member" : undefined}
      initialItems={appointments.map((appointment) => ({
        ...toAppointmentRow(appointment, tenant.timezone || "Asia/Manila"),
        ...(staffName && { staff: staffName }),
        staffScheduleMatch: !isServiceStaff && Boolean(staffId),
      }))}
    />
  );
}
