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
  let customDomainToken = "";

  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug, logo_url, brand_color, secondary_color, accent_color, address, phone, timezone")
      .eq("id", tenantId)
      .single();

    const { data: settings } = await supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (tenant) {
      resolvedSlug = tenant.slug || resolvedSlug;
      customDomainToken = settings?.custom_domain_token || `fides-site-verification=${tenantId}`;

      const liveSettings: Partial<WebsiteSettingsData> = {
        businessName: settings?.display_name || tenant.name || "Bella Vita Salon & Spa",
        subdomain: tenant.slug || resolvedSlug,
        logoUrl: tenant.logo_url || "",
        typography: settings?.typography || "Ovo + Mulish",
        accentColor: tenant.accent_color || "#CC5000",
        secondaryColor: tenant.secondary_color || "#ADD8E6",
        mainColor: tenant.brand_color || "#FFFFEB",
        headline: settings?.headline || settings?.tagline || "A little time for yourself.",
        supportingMessage: settings?.supporting_message || "",
        coverPhotoName: settings?.cover_photo_name || "bella-vita-studio.jpg",
        coverPhotoUrl: settings?.cover_photo_url || "",
        showFeaturedServices: settings?.show_featured_services ?? true,
        showContactDetails: settings?.show_contact_details ?? true,
        businessCategory: settings?.business_category || "Beauty & wellness",
        about: settings?.about || "Thoughtful hair, skin, and wellness care in a calm, welcoming space.",
        businessEmail: settings?.business_email || "",
        phoneNumber: tenant.phone || settings?.phone_number || "+63 917 555 0148",
        instagram: settings?.instagram || "",
        streetAddress: tenant.address || settings?.street_address || "24 Acacia Street, Lahug",
        cityProvince: settings?.city_province || "Cebu City, Cebu",
        postalCode: settings?.postal_code || "6000",
        hoursMonFri: settings?.hours_mon_fri || "9:00 AM – 6:00 PM",
        hoursSat: settings?.hours_sat || "10:00 AM – 5:00 PM",
        hoursSun: settings?.hours_sun || "Closed",
        timeZone: tenant.timezone || settings?.time_zone || "Asia/Manila (UTC+08:00)",
        showOpeningHours: settings?.show_opening_hours ?? true,
        customDomain: settings?.custom_domain || "",
        isDomainVerified: settings?.custom_domain_status === "active",
        pageTitle: settings?.page_title || "",
        metaDescription: settings?.meta_description || "",
        allowIndexing: settings?.allow_indexing ?? true,
        socialTitle: settings?.social_title || "",
        socialDescription: settings?.social_description || "",
      };

      // QA #9: Restore saved drafts in editor by merging draft_settings over live
      const draft = settings?.draft_settings as Partial<WebsiteSettingsData> | null;
      if (draft && typeof draft === "object") {
        initialData = {
          ...liveSettings,
          ...draft,
        };
      } else {
        initialData = liveSettings;
      }
    }
  }

  return (
    <WebsiteSettingsView
      initialData={initialData}
      tenantSlug={resolvedSlug}
      tenantId={tenantId ?? undefined}
      customDomainToken={customDomainToken}
      userEmail={user.email}
    />
  );
}
