import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerProfileAction } from "@/app/actions/customers";
import { CustomerProfileView } from "@/components/merchant/customers/customer-profile-view";

interface MerchantCustomerProfilePageProps {
  params: Promise<{ slug: string; customerId: string }>;
}

export async function generateMetadata({
  params,
}: MerchantCustomerProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} · Customer Profile`
      : "Customer Profile · Merchant Workspace",
    description:
      "View customer details, account invitation status, staff notes, and visit history.",
  };
}

export default async function MerchantCustomerProfilePage({
  params,
}: MerchantCustomerProfilePageProps) {
  const { slug, customerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/customers/${customerId}`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  const result = await getCustomerProfileAction(tenant.id, customerId);
  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <CustomerProfileView initialData={result.data} basePath={`/${slug}`} />
  );
}
