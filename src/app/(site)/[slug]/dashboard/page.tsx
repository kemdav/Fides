import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OverviewView } from "@/components/merchant/overview/overview-view";
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
    redirect(`/${slug}`);
  }

  return (
    <OverviewView
      businessName={tenant.name}
      userEmail={user.email ?? "Merchant staff"}
      tenantId={tenant.id}
      basePath={`/${slug}`}
    />
  );
}
