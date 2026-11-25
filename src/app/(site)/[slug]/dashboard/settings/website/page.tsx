import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WebsiteSettingsView } from "@/components/merchant/website-settings/website-settings-view";
import type {
  PreviewServiceItem,
  WebsiteSettingsData,
} from "@/components/merchant/website-settings/types";

interface MerchantWebsiteSettingsPageProps {
  params: Promise<{ slug: string }>;
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "BV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatRoleLabel(role: string | null | undefined): string {
  if (role === "owner") return "Business owner";
  if (role === "admin") return "Workspace admin";
  if (role === "receptionist") return "Receptionist";
  return "Staff member";
}

export async function generateMetadata({
  params,
}: MerchantWebsiteSettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  const title = tenant?.name?.trim()
    ? `Website Settings · ${tenant.name.trim()}`
    : "Website Settings";

  return {
    title,
    description:
      "Manage website branding, homepage content, business information, address, and SEO settings.",
  };
}

export default async function MerchantWebsiteSettingsPage({
  params,
}: MerchantWebsiteSettingsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/settings/website`);
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, logo_url, brand_color, secondary_color, accent_color, address, phone, timezone",
    )
    .eq("slug", slug)
    .single();

  if (tenantError || !tenant) {
    notFound();
  }

  const [
    { data: profile },
    { data: membership },
    { data: settings },
    { data: services },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, tenant_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenant.id)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(3),
  ]);

  const isMember = Boolean(membership) || profile?.tenant_id === tenant.id;
  if (!isMember) {
    redirect(`/${slug}/dashboard`);
  }

  const effectiveRole =
    membership?.role ??
    (profile?.tenant_id === tenant.id ? profile.role : null);
  const canEdit = effectiveRole === "owner";

  const displayName = settings?.display_name || tenant.name;

  const liveData: Partial<WebsiteSettingsData> = {
    businessName: displayName,
    logoInitials: deriveInitials(displayName),
    logoUrl: tenant.logo_url || "",
    typography: settings?.typography || "Ovo + Mulish",
    mainColor: tenant.brand_color || "#FFFFEB",
    secondaryColor: tenant.secondary_color || "#ADD8E6",
    accentColor: tenant.accent_color || "#CC5000",
    headline:
      settings?.headline || settings?.tagline || "A little time for yourself.",
    supportingMessage: settings?.supporting_message || "",
    coverPhotoName: settings?.cover_photo_name || "bella-vita-studio.jpg",
    coverPhotoUrl: settings?.cover_photo_url || "",
    showFeaturedServices: settings?.show_featured_services ?? true,
    showContactDetails: settings?.show_contact_details ?? true,
    businessCategory: settings?.business_category || "Beauty & wellness",
    about: settings?.about || "",
    businessEmail: settings?.business_email || "",
    phoneNumber: settings?.phone_number || tenant.phone || "",
    instagram: settings?.instagram || "",
    streetAddress: settings?.street_address || tenant.address || "",
    cityProvince: settings?.city_province || "",
    postalCode: settings?.postal_code || "",
    hoursMonFri: settings?.hours_mon_fri || "9:00 AM – 6:00 PM",
    hoursSat: settings?.hours_sat || "10:00 AM – 5:00 PM",
    hoursSun: settings?.hours_sun || "Closed",
    timeZone:
      settings?.time_zone || tenant.timezone || "Asia/Manila (UTC+08:00)",
    showOpeningHours: settings?.show_opening_hours ?? true,
    subdomain: tenant.slug,
    customDomain: settings?.custom_domain || "",
    isDomainVerified: settings?.custom_domain_status === "active",
    pageTitle: settings?.page_title || "",
    metaDescription: settings?.meta_description || "",
    allowIndexing: settings?.allow_indexing ?? true,
    socialTitle: settings?.social_title || "",
    socialDescription: settings?.social_description || "",
    socialImageUrl: settings?.social_image_url || "",
    socialImageName: settings?.social_image_name || "",
  };

  const draftData =
    settings?.draft_settings &&
    typeof settings.draft_settings === "object" &&
    !Array.isArray(settings.draft_settings)
      ? (settings.draft_settings as Partial<WebsiteSettingsData>)
      : null;

  const previewServices: PreviewServiceItem[] = (services ?? []).map((svc) => ({
    id: svc.id,
    name: svc.name,
    durationMinutes: svc.duration_minutes,
    priceCents: svc.price_cents,
  }));

  return (
    <WebsiteSettingsView
      initialData={liveData}
      initialDraft={draftData}
      tenantSlug={tenant.slug}
      tenantId={tenant.id}
      basePath={`/${tenant.slug}`}
      canEdit={canEdit}
      previewServices={previewServices}
      customDomainToken={
        settings?.custom_domain_token ||
        `fides-verify=${tenant.id.slice(0, 12)}`
      }
      userName={profile?.full_name || user.email || "Merchant User"}
      userEmail={user.email || ""}
      userRole={formatRoleLabel(effectiveRole)}
    />
  );
}
