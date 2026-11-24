import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PaymentsView } from "@/components/merchant/payments/payments-view";
import { fetchPaymentsDashboardData } from "@/app/actions/payments";
import { createClient } from "@/lib/supabase/server";
import { workspaceRoleFromLabel } from "@/lib/merchant/workspace-roles";

interface MerchantPaymentsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantPaymentsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: tenant?.name?.trim() ? `${tenant.name.trim()} Payments` : "Merchant Payments",
    description: "Record appointment settlements, track balances, and review payment history.",
  };
}

export default async function MerchantPaymentsPage({
  params,
}: MerchantPaymentsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/${slug}/dashboard/payments`)}`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  // Verify membership in tenant_memberships or profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role, profiles(full_name)")
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

  const userRole =
    membership?.role || (profile?.role ? workspaceRoleFromLabel(profile.role) : undefined) || "staff";

  const userName =
    membership?.profiles?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Staff Member";

  const dashboardData = await fetchPaymentsDashboardData(tenant.id);

  return (
    <PaymentsView
      initialData={dashboardData}
      businessName={tenant.name}
      userName={userName}
      userEmail={user.email || "staff@merchant.ph"}
      userRole={userRole}
      tenantId={tenant.id}
      slug={tenant.slug}
    />
  );
}
