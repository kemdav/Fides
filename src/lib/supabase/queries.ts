import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ServiceCardData } from "@/components/storefront/service-card";

export type TenantData = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  brand_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  about: string | null;
  headline: string | null;
  supporting_message: string | null;
  cover_photo_url: string | null;
  hours_mon_fri: string | null;
  hours_sat: string | null;
  hours_sun: string | null;
  show_opening_hours: boolean;
};

export async function getTenantBySlug(slug: string): Promise<TenantData | null> {
  if (!slug) return null;

  const supabase = getAdminClient() ?? (await createClient());

  const { data, error } = await supabase
    .from("tenants")
    .select(`
      id,
      name,
      slug,
      status,
      logo_url,
      brand_color,
      address,
      phone,
      tenant_settings (
        display_name,
        about,
        headline,
        supporting_message,
        cover_photo_url,
        business_email,
        phone_number,
        street_address,
        city_province,
        postal_code,
        hours_mon_fri,
        hours_sat,
        hours_sun,
        show_opening_hours
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const settings = Array.isArray(data.tenant_settings)
    ? data.tenant_settings[0]
    : data.tenant_settings;

  const fullAddress = [
    settings?.street_address,
    settings?.city_province,
    settings?.postal_code,
  ]
    .filter(Boolean)
    .join(", ") || data.address || null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status,
    logo_url: data.logo_url ?? null,
    brand_color: data.brand_color ?? null,
    address: fullAddress,
    phone: settings?.phone_number || data.phone || null,
    email: settings?.business_email || null,
    display_name: settings?.display_name ?? null,
    about: settings?.about ?? null,
    headline: settings?.headline ?? null,
    supporting_message: settings?.supporting_message ?? null,
    cover_photo_url: settings?.cover_photo_url ?? null,
    hours_mon_fri: settings?.hours_mon_fri ?? null,
    hours_sat: settings?.hours_sat ?? null,
    hours_sun: settings?.hours_sun ?? null,
    show_opening_hours: settings?.show_opening_hours ?? true,
  };
}

export type ServiceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  category_name?: string | null;
};

export async function getServicesByTenantId(tenantId: string): Promise<ServiceItem[]> {
  if (!tenantId) return [];

  const supabase = getAdminClient() ?? (await createClient());

  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      slug,
      description,
      duration_minutes,
      price_cents,
      active,
      service_categories (
        name
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((item) => {
    const category = Array.isArray(item.service_categories)
      ? item.service_categories[0]
      : item.service_categories;
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      duration_minutes: item.duration_minutes,
      price_cents: item.price_cents,
      category_name: category?.name ?? null,
    };
  });
}

export function toServiceCardData(
  service: ServiceItem,
  slug: string
): ServiceCardData {
  const formattedPrice = `₱${Math.round(service.price_cents / 100).toLocaleString("en-PH")}`;
  return {
    name: service.name,
    category: service.category_name || "Style & Care",
    categoryColor: "text-burnt",
    duration: `${service.duration_minutes} min`,
    price: formattedPrice,
    imageSrc: "/images/storefront/Salon Service photograph.png",
    imageAlt: `${service.name} service`,
    href: `/${slug}/services`,
  };
}
