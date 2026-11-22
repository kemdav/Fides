import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StaffView, type StaffItem } from "@/components/merchant/staff/staff-view";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { zonedDateToUtc } from "@/lib/merchant/overview";
import { formatStaffCommission, getMonthlyStaffCommission, staffDateKey, staffRoleLabels } from "@/lib/merchant/staff-profile";

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/${slug}/dashboard/staff`);

  const { data: tenant } = await supabase.from("tenants").select("id, name, timezone").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();

  const { data: membership } = await supabase.from("tenant_memberships").select("role")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  if (membership?.role !== "owner" && membership?.role !== "admin") notFound();

  const db = getAdminClient();
  if (!db) throw new Error("The staff roster requires Supabase server credentials.");

  const timezone = tenant.timezone || "Asia/Manila";
  const now = new Date();
  const today = staffDateKey(now, timezone);
  const todayStart = zonedDateToUtc(today, timezone).toISOString();
  const todayEnd = zonedDateToUtc(today, timezone, true).toISOString();
  const [rows, memberships, skills, services, shifts, leaves, invitations, application, commission] = await Promise.all([
    db.from("staff_members").select("id, full_name, title, active, image_url, profile_id, commission_type, commission_value")
      .eq("tenant_id", tenant.id).order("sort_order").order("full_name"),
    db.from("tenant_memberships").select("profile_id, role, profiles(full_name, email)").eq("tenant_id", tenant.id),
    db.from("staff_service_skills").select("staff_id, services!inner(name)").eq("tenant_id", tenant.id).eq("services.active", true),
    db.from("services").select("id, name").eq("tenant_id", tenant.id).eq("active", true).order("name"),
    db.from("shifts").select("staff_id, starts_at, ends_at").eq("tenant_id", tenant.id)
      .lt("starts_at", todayEnd).gt("ends_at", todayStart).order("starts_at"),
    db.from("leaves").select("staff_id").eq("tenant_id", tenant.id).eq("approved", true)
      .lte("starts_on", today).gte("ends_on", today),
    db.from("staff_invitations").select("id, full_name, email, role, title, expires_at, cancelled_at")
      .eq("tenant_id", tenant.id).is("accepted_at", null).order("created_at", { ascending: false }),
    db.from("account_applications").select("plan_code").eq("tenant_id", tenant.id).eq("status", "approved")
      .order("approved_at", { ascending: false }).limit(1).maybeSingle(),
    getMonthlyStaffCommission(db, tenant.id, timezone, now),
  ]);
  for (const { error } of [rows, memberships, skills, services, shifts, leaves, application]) {
    if (error) throw error;
  }
  if (invitations.error && !["PGRST205", "42P01"].includes(invitations.error.code)) throw invitations.error;

  let staffLimit: number | null | undefined;
  if (application.data) {
    const { data: plan, error } = await db.from("subscription_plans").select("staff_limit")
      .eq("code", application.data.plan_code).maybeSingle();
    if (error) throw error;
    staffLimit = plan?.staff_limit;
  }

  const membershipByProfile = new Map(memberships.data?.map((entry) => [entry.profile_id, entry]));
  const viewerName = membershipByProfile.get(user.id)?.profiles?.full_name;
  const serviceNamesByStaff = new Map<string, string[]>();
  for (const skill of skills.data ?? []) {
    const names = serviceNamesByStaff.get(skill.staff_id) ?? [];
    names.push(skill.services.name);
    serviceNamesByStaff.set(skill.staff_id, names);
  }
  const shiftsByStaff = new Map<string, string[]>();
  const shiftTime = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (const shift of shifts.data ?? []) {
    const ranges = shiftsByStaff.get(shift.staff_id) ?? [];
    ranges.push(`${shiftTime.format(new Date(shift.starts_at))}–${shiftTime.format(new Date(shift.ends_at))}`);
    shiftsByStaff.set(shift.staff_id, ranges);
  }
  const onLeave = new Set(leaves.data?.map((leave) => leave.staff_id));
  const staffItems: StaffItem[] = (rows.data ?? []).map((row) => {
    const member = row.profile_id ? membershipByProfile.get(row.profile_id) : undefined;
    const role = member?.role ?? "staff";
    const names = (serviceNamesByStaff.get(row.id) ?? []).toSorted((a, b) => a.localeCompare(b));
    const shiftRanges = shiftsByStaff.get(row.id);
    const shiftDisplay = !row.active ? "Deactivated"
      : onLeave.has(row.id) ? "On leave"
      : shiftRanges?.length ? shiftRanges.join(" · ") : "No shift today";
    return {
      id: row.id,
      fullName: row.full_name,
      imageUrl: row.image_url,
      email: member?.profiles?.email || "Not provided",
      title: row.title ?? "",
      role,
      roleLabel: staffRoleLabels[role],
      servicesDisplay: names.length ? `${names.length} of ${services.data?.length ?? 0} services`
        : role === "staff" ? "No services assigned" : "Not applicable",
      serviceNames: names.join(" · "),
      commissionDisplay: formatStaffCommission(row.commission_type, Number(row.commission_value)),
      active: row.active,
      shiftDisplay,
    };
  });

  const invitationDate = new Intl.DateTimeFormat("en-PH", { timeZone: timezone, month: "short", day: "numeric", year: "numeric" });
  const invitationItems: StaffItem[] = (invitations.data ?? []).map((invite) => {
    const invitationStatus = invite.cancelled_at ? "cancelled" : Date.parse(invite.expires_at) <= now.getTime() ? "expired" : "pending";
    const date = invitationDate.format(new Date(invite.cancelled_at ?? invite.expires_at));
    return {
      id: invite.id,
      fullName: invite.full_name,
      email: invite.email,
      title: invite.title ?? "",
      role: invite.role,
      roleLabel: staffRoleLabels[invite.role],
      servicesDisplay: "Assigned after acceptance",
      serviceNames: "",
      commissionDisplay: "—",
      active: false,
      invitationStatus,
      shiftDisplay: `${invitationStatus === "cancelled" ? "Cancelled" : invitationStatus === "expired" ? "Expired" : "Expires"} ${date}`,
    };
  });

  return (
    <StaffView
      businessName={tenant.name}
      userName={viewerName?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "Merchant staff"}
      userRole={membership.role}
      tenantId={tenant.id}
      canViewProfiles
      basePath={`/${slug}`}
      activeMembers={staffItems.filter((staff) => staff.active).length}
      onShiftToday={staffItems.filter((staff) => staff.active && shiftsByStaff.has(staff.id) && !onLeave.has(staff.id)).length}
      pendingInvitations={invitationItems.filter((invite) => invite.invitationStatus === "pending").length}
      staffLimit={staffLimit}
      services={services.data ?? []}
      commissionThisMonth={commission.reduce((sum, entry) => sum + Number(entry.commission_cents), 0) / 100}
      initialItems={[...staffItems.filter(({ role }) => role !== "owner"), ...invitationItems]}
    />
  );
}
