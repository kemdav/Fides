import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WebsiteSettingsView } from "@/components/merchant/website-settings/website-settings-view";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Website Settings · Merchant Workspace",
  description: "Merchant website settings, domain management, color palette, SEO preview, and publishing.",
};

export default async function MerchantWebsiteSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/${slug}/dashboard/settings/website`);

  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();

  const access = await resolveTenantAccess(supabase, tenant.id);
  if (!access || (access.role !== "owner" && access.role !== "admin")) notFound();

  return <WebsiteSettingsView />;
}
