import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PaymentsView } from "@/components/merchant/payments/payments-view";
import { loadPaymentsDashboard } from "@/features/payments";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { getTenantBySlug } from "@/lib/supabase/queries";
import { workspaceRoleFromLabel } from "@/lib/merchant/workspace-roles";

interface MerchantPaymentsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantPaymentsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

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

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  const access = await resolveTenantAccess(supabase, tenant.id);
  if (!access) {
    notFound();
  }

  const { userName, dashboardData } = await loadPaymentsDashboard(supabase, access);

  return (
    <PaymentsView
      initialData={dashboardData}
      businessName={tenant.name}
      userName={userName || user.email?.split("@")[0] || "Staff Member"}
      userEmail={user.email || "staff@merchant.ph"}
      userRole={workspaceRoleFromLabel(access.role) ?? "staff"}
      tenantId={tenant.id}
      slug={tenant.slug}
    />
  );
}
