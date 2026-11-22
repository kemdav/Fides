import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerRegistryAction } from "@/app/actions/customers";
import { CustomersRegistryView } from "@/components/merchant/customers/customers-registry-view";

interface MerchantCustomersPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantCustomersPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} · Customers`
      : "Customers · Merchant Workspace",
    description:
      "Centralized customer registry for online accounts, walk-in records, visit history, and registration invites.",
  };
}

export default async function MerchantCustomersPage({
  params,
}: MerchantCustomersPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/customers`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  const result = await getCustomerRegistryAction(tenant.id);
  if (!result.success || !result.data) {
    redirect(`/${slug}/dashboard`);
  }

  return (
    <CustomersRegistryView initialData={result.data} basePath={`/${slug}`} />
  );
}
