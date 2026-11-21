import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StaffView } from "@/components/merchant/staff/staff-view";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

interface StaffPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StaffPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} Staff & Permissions`
      : "Staff & Permissions",
    description:
      "Manage team access, service eligibility, invitations, and commission rules.",
  };
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/staff`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  // Use admin client for full column access (commission data)
  const adminClient = getAdminClient();
  const db = adminClient ?? supabase;

  // ── Parallel data fetching ────────────────────────────────────────────────
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    { data: staffRows },
    { data: memberships },
    { data: skills },
    { data: allServices },
    { data: allProfiles },
    { data: completedAppointments },
    { data: profile },
  ] = await Promise.all([
    db
      .from("staff_members")
      .select(
        "id, full_name, title, bio, image_url, active, sort_order, profile_id, created_at, commission_type, commission_value"
      )
      .eq("tenant_id", tenant.id)
      .order("sort_order", { ascending: true }),
    db
      .from("tenant_memberships")
      .select("profile_id, role")
      .eq("tenant_id", tenant.id),
    db
      .from("staff_service_skills")
      .select("staff_id, service_id")
      .eq("tenant_id", tenant.id),
    db
      .from("services")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .eq("active", true),
    db.from("profiles").select("id, email").eq("tenant_id", tenant.id),
    db
      .from("appointments")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("status", "completed")
      .gte("starts_at", monthStart.toISOString()),
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
  ]);

  // ── Build lookups ─────────────────────────────────────────────────────────

  // Role map from memberships
  const roleMap = new Map<string, string>();
  for (const m of memberships ?? []) {
    roleMap.set(m.profile_id, m.role);
  }

  // Email map from profiles
  const emailMap = new Map<string, string>();
  for (const p of allProfiles ?? []) {
    emailMap.set(p.id, p.email ?? "");
  }

  // Service name map
  const serviceNameMap = new Map<string, string>();
  for (const s of allServices ?? []) {
    serviceNameMap.set(s.id, s.name);
  }
  const totalServiceCount = allServices?.length ?? 0;

  // Skills grouped by staff_id
  const skillsByStaff = new Map<string, string[]>();
  for (const skill of skills ?? []) {
    const list = skillsByStaff.get(skill.staff_id) ?? [];
    const name = serviceNameMap.get(skill.service_id);
    if (name) list.push(name);
    skillsByStaff.set(skill.staff_id, list);
  }

  // ── Commission this month ─────────────────────────────────────────────────

  // Build commission config per staff
  const commissionConfig = new Map<
    string,
    { type: string; value: number }
  >();
  for (const s of staffRows ?? []) {
    commissionConfig.set(s.id, {
      type: s.commission_type ?? "fixed",
      value: Number(s.commission_value ?? 0),
    });
  }

  let commissionCents = 0;
  const completedIds = (completedAppointments ?? []).map(
    (a: { id: string }) => a.id
  );
  if (completedIds.length > 0) {
    const { data: completedSvcs } = await db
      .from("appointment_services")
      .select("price_cents, staff_id")
      .eq("tenant_id", tenant.id)
      .in("appointment_id", completedIds);

    for (const svc of completedSvcs ?? []) {
      if (!svc.staff_id) continue;
      const comm = commissionConfig.get(svc.staff_id);
      if (!comm || comm.value <= 0) continue;
      if (comm.type === "percentage") {
        commissionCents += Math.round(
          (svc.price_cents * comm.value) / 100
        );
      } else {
        // fixed: commission_value is in pesos
        commissionCents += Math.round(comm.value * 100);
      }
    }
  }
  const commissionThisMonth = Math.round(commissionCents / 100);

  // ── Helper to format role labels ──────────────────────────────────────────

  function getRoleLabel(role: string): string {
    switch (role) {
      case "owner":
        return "Owner";
      case "admin":
        return "Admin";
      case "receptionist":
        return "Receptionist";
      default:
        return "Service Staff";
    }
  }

  function getServicesDisplay(
    role: string,
    staffSkills: string[]
  ): string {
    if (role === "owner" || role === "admin" || role === "receptionist") {
      return "Not applicable";
    }
    if (staffSkills.length === 0) return "No services assigned";
    return `${staffSkills.length} of ${totalServiceCount} services`;
  }

  function getCommissionDisplay(type: string, value: number): string {
    if (value <= 0) return "No commission";
    if (type === "percentage") return `${value}% of service price`;
    return `Fixed ₱${value.toLocaleString()} / service`;
  }

  // ── Map to client shape ───────────────────────────────────────────────────

  const staffItems = (staffRows ?? []).map((s) => {
    const role = s.profile_id
      ? (roleMap.get(s.profile_id) ?? "staff")
      : "staff";
    const staffSkills = skillsByStaff.get(s.id) ?? [];
    const email = s.profile_id
      ? (emailMap.get(s.profile_id) ?? "Not provided")
      : "Not provided";
    const commType = s.commission_type ?? "fixed";
    const commValue = Number(s.commission_value ?? 0);

    return {
      id: s.id,
      fullName: s.full_name,
      email,
      title: s.title ?? "",
      role,
      roleLabel: getRoleLabel(role),
      servicesDisplay: getServicesDisplay(role, staffSkills),
      serviceNames: staffSkills.join(" · "),
      commissionDisplay: getCommissionDisplay(commType, commValue),
      active: s.active,
      sortOrder: s.sort_order,
      createdAt: s.created_at,
    };
  });

  // ── KPI counts ────────────────────────────────────────────────────────────
  const activeMembers = staffItems.filter((s) => s.active).length;
  const onShiftToday = activeMembers; // Approximate: same as active for now
  const pendingInvitations = 0; // No invitation system yet

  return (
    <StaffView
      businessName={tenant.name}
      userName={
        profile?.full_name?.trim() ||
        user.email?.split("@")[0] ||
        "Merchant"
      }
      userEmail={user.email ?? "Merchant staff"}
      userRole={
        profile?.role === "owner"
          ? "Business owner"
          : profile?.role || "Staff"
      }
      tenantId={tenant.id}
      basePath={`/${slug}`}
      activeMembers={activeMembers}
      onShiftToday={onShiftToday}
      pendingInvitations={pendingInvitations}
      commissionThisMonth={commissionThisMonth}
      initialItems={staffItems}
    />
  );
}
