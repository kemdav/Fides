import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionWorkspaceAction } from "@/app/actions/subscription";
import { SubscriptionSettingsView } from "@/components/merchant/subscription/subscription-settings-view";

interface MerchantSubscriptionSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantSubscriptionSettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} · Subscription Settings`
      : "Subscription Settings · Merchant Workspace",
    description:
      "Manage your subscription plan, usage limits, invoices, and billing preferences.",
  };
}

export default async function MerchantSubscriptionSettingsPage({
  params,
}: MerchantSubscriptionSettingsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/settings/subscription`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  const result = await getSubscriptionWorkspaceAction(tenant.id);
  if (!result.success || !result.data) {
    redirect(`/${slug}/dashboard`);
  }

  return (
    <SubscriptionSettingsView initialData={result.data} basePath={`/${slug}`} />
  );
}
