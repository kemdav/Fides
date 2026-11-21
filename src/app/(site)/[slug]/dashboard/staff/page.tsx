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
    description: "Manage your team members, roles, and permissions.",
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

  // Fetch staff members
  const { data: staffRows } = await db
    .from("staff_members")
    .select("id, full_name, title, bio, image_url, active, sort_order, profile_id, created_at")
    .eq("tenant_id", tenant.id)
    .order("sort_order", { ascending: true });

  // Fetch profile memberships for role mapping
  const { data: memberships } = await db
    .from("tenant_memberships")
    .select("profile_id, role")
    .eq("tenant_id", tenant.id);

  // Build role lookup
  const roleMap = new Map<string, string>();
  for (const m of memberships ?? []) {
    roleMap.set(m.profile_id, m.role);
  }

  // Also get logged-in user's profile for sidebar
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Map to client shape
  const staffItems = (staffRows ?? []).map((s) => ({
    id: s.id,
    fullName: s.full_name,
    title: s.title ?? "",
    bio: s.bio ?? "",
    imageUrl: s.image_url ?? "",
    active: s.active,
    sortOrder: s.sort_order,
    profileId: s.profile_id ?? null,
    role: s.profile_id ? (roleMap.get(s.profile_id) ?? "staff") : "staff",
    createdAt: s.created_at,
  }));

  // KPI counts
  const totalStaff = staffItems.length;
  const activeStaff = staffItems.filter((s) => s.active).length;
  const ownersCount = staffItems.filter((s) => s.role === "owner").length;
  const inactiveStaff = totalStaff - activeStaff;

  return (
    <StaffView
      businessName={tenant.name}
      userName={profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "Merchant staff"}
      userRole={profile?.role === "owner" ? "Business owner" : profile?.role || "Staff"}
      tenantId={tenant.id}
      basePath={`/${slug}`}
      totalStaff={totalStaff}
      activeStaff={activeStaff}
      ownersCount={ownersCount}
      inactiveStaff={inactiveStaff}
      initialItems={staffItems}
    />
  );
}
