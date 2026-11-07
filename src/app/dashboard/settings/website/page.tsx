import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WebsiteSettingsView } from "@/components/merchant/website-settings/website-settings-view";
import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";

export default async function WebsiteSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If unauthenticated, redirect to login
  if (!user) {
    redirect("/login?redirect=/dashboard/settings/website");
  }

  const { tenant: tenantSlugParam } = (await searchParams) || {};

  // Fetch user profile and memberships to resolve active tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  let tenantId = profile?.tenant_id;

  if (tenantSlugParam) {
    const { data: requestedTenant } = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("slug", tenantSlugParam)
      .single();
    if (requestedTenant) {
      tenantId = requestedTenant.id;
    }
  }

  let initialData: Partial<WebsiteSettingsData> = {};
  let resolvedSlug = tenantSlugParam || "bellavita";

  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug, brand_color, secondary_color, accent_color, address, phone")
      .eq("id", tenantId)
      .single();

    const { data: settings } = await supabase
      .from("tenant_settings")
      .select("display_name, tagline, about")
      .eq("tenant_id", tenantId)
      .single();

    if (tenant) {
      resolvedSlug = tenant.slug || resolvedSlug;
      initialData = {
        businessName: settings?.display_name || tenant.name || "Bella Vita Salon & Spa",
        subdomain: tenant.slug || resolvedSlug,
        accentColor: tenant.accent_color || tenant.brand_color || "#CC5000",
        secondaryColor: tenant.secondary_color || "#ADD8E6",
        mainColor: "#FFFFEB",
        headline: settings?.tagline || "A little time for yourself.",
        about: settings?.about || "Thoughtful hair, skin, and wellness care in a calm, welcoming space.",
        streetAddress: tenant.address || "24 Acacia Street, Lahug",
        phoneNumber: tenant.phone || "+63 917 555 0148",
      };
    }
  }

  return (
    <WebsiteSettingsView
      initialData={initialData}
      tenantSlug={resolvedSlug}
      userEmail={user.email}
    />
  );
}
