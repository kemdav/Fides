import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppointmentsView } from "@/components/merchant/appointments/appointments-view";
import { createClient } from "@/lib/supabase/server";
import { toAppointmentRow } from "@/lib/merchant/overview";

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
  const staffId = typeof staff === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(staff) ? staff : undefined;
  const basePath = `/${slug}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const path = `${basePath}/dashboard/appointments${staffId ? `?staff=${staffId}` : ""}`;
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

  let query = supabase.from("appointments")
    .select("id, starts_at, source, status, customers(full_name), staff_members(full_name), appointment_services(services(name)), assigned:appointment_services()")
    .eq("tenant_id", tenant.id)
    .in("status", ["pending_approval", "confirmed", "checked_in", "in_service"])
    .gte("starts_at", new Date().toISOString()).order("starts_at");

  if (staffId) {
    query = query.eq("assigned.staff_id", staffId).or(`staff_id.eq.${staffId},assigned.not.is.null`);
  }

  const [appointments, focusedStaff] = await Promise.all([
    query,
    staffId
      ? supabase.from("staff_members").select("full_name").eq("tenant_id", tenant.id).eq("id", staffId).maybeSingle()
      : { data: null, error: null },
  ]);
  if (appointments.error) throw appointments.error;
  if (focusedStaff.error) throw focusedStaff.error;

  return (
    <AppointmentsView
      key={staffId ?? "all"}
      businessName={tenant.name}
      userEmail={user.email ?? "Merchant staff"}
      tenantId={tenant.id}
      basePath={basePath}
      focusedStaffName={staffId ? focusedStaff.data?.full_name ?? "Selected staff member" : undefined}
      initialItems={(appointments.data ?? []).map((appointment) => ({
        ...toAppointmentRow(appointment, tenant.timezone || "Asia/Manila"),
        staffScheduleMatch: Boolean(staffId),
      }))}
    />
  );
}
