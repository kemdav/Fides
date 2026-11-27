import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { isSitePublic } from "./visibility";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StorefrontTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  isPublished: boolean | null;
  logoUrl: string | null;
  brandColor: string | null;
  accentColor: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  displayName: string | null;
  about: string | null;
  headline: string | null;
  supportingMessage: string | null;
  coverPhotoUrl: string | null;
  hoursMonFri: string | null;
  hoursSat: string | null;
  hoursSun: string | null;
  showOpeningHours: boolean;
  showFeaturedServices: boolean;
  showContactDetails: boolean;
  instagram: string | null;
  tagline: string | null;
  businessCategory: string;
  typography: string;
  pageTitle: string | null;
  metaDescription: string | null;
  allowIndexing: boolean;
  socialTitle: string | null;
  socialDescription: string | null;
  socialImageUrl: string | null;
}

export interface StorefrontServiceCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface StorefrontService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
}

export interface StorefrontStaff {
  id: string;
  fullName: string;
  title: string | null;
  bio: string | null;
  imageUrl: string | null;
}

export interface StorefrontHomeData {
  tenant: StorefrontTenant;
  featuredServices: StorefrontService[];
  staff: StorefrontStaff[];
}

export interface StorefrontServicesData {
  tenant: StorefrontTenant;
  services: StorefrontService[];
  categories: StorefrontServiceCategory[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getClient(): Promise<SupabaseClient<Database>> | SupabaseClient<Database> {
  const admin = getAdminClient();
  if (admin) return admin;
  return createClient();
}

// ─── Tenant Query ───────────────────────────────────────────────────────────

export async function getStorefrontTenant(
  slug: string
): Promise<StorefrontTenant | null> {
  if (!slug) return null;

  const supabase = await getClient();

  const { data, error } = await supabase
    .from("tenants")
    .select(`
      id,
      name,
      slug,
      status,
      logo_url,
      brand_color,
      accent_color,
      address,
      phone,
      tenant_settings (
        is_published,
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
        show_opening_hours,
        show_featured_services,
        show_contact_details,
        instagram,
        tagline,
        business_category,
        typography,
        page_title,
        meta_description,
        allow_indexing,
        social_title,
        social_description,
        social_image_url
      )
    `)
    .eq("slug", slug.toLowerCase().trim())
    .maybeSingle();

  if (error || !data) return null;

  const settings = Array.isArray(data.tenant_settings)
    ? data.tenant_settings[0]
    : data.tenant_settings;

  const fullAddress =
    [
      settings?.street_address,
      settings?.city_province,
      settings?.postal_code,
    ]
      .filter(Boolean)
      .join(", ") ||
    data.address ||
    null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status,
    isPublished: settings?.is_published ?? null,
    logoUrl: data.logo_url ?? null,
    brandColor: data.brand_color ?? null,
    accentColor: data.accent_color ?? null,
    address: fullAddress,
    phone: settings?.phone_number || data.phone || null,
    email: settings?.business_email || null,
    displayName: settings?.display_name ?? null,
    about: settings?.about ?? null,
    headline: settings?.headline ?? null,
    supportingMessage: settings?.supporting_message ?? null,
    coverPhotoUrl: settings?.cover_photo_url ?? null,
    hoursMonFri: settings?.hours_mon_fri ?? null,
    hoursSat: settings?.hours_sat ?? null,
    hoursSun: settings?.hours_sun ?? null,
    showOpeningHours: settings?.show_opening_hours ?? true,
    showFeaturedServices: settings?.show_featured_services ?? true,
    showContactDetails: settings?.show_contact_details ?? true,
    instagram: settings?.instagram ?? null,
    tagline: settings?.tagline ?? null,
    businessCategory: settings?.business_category ?? "general",
    typography: settings?.typography ?? "Ovo + Mulish",
    pageTitle: settings?.page_title ?? null,
    metaDescription: settings?.meta_description ?? null,
    allowIndexing: settings?.allow_indexing ?? true,
    socialTitle: settings?.social_title ?? null,
    socialDescription: settings?.social_description ?? null,
    socialImageUrl: settings?.social_image_url ?? null,
  };
}

// ─── Services Query ─────────────────────────────────────────────────────────

export async function getStorefrontServices(
  tenantId: string
): Promise<StorefrontService[]> {
  if (!tenantId) return [];

  const supabase = await getClient();

  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      slug,
      description,
      duration_minutes,
      price_cents,
      category_id,
      service_categories (
        name,
        slug
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .eq("is_archived", false)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((item) => {
    const category = Array.isArray(item.service_categories)
      ? item.service_categories[0]
      : item.service_categories;
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      durationMinutes: item.duration_minutes,
      priceCents: item.price_cents,
      categoryId: item.category_id,
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
    };
  });
}

// ─── Categories Query ───────────────────────────────────────────────────────

export async function getStorefrontCategories(
  tenantId: string
): Promise<StorefrontServiceCategory[]> {
  if (!tenantId) return [];

  const supabase = await getClient();

  const { data, error } = await supabase
    .from("service_categories")
    .select("id, name, slug, sort_order")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    sortOrder: cat.sort_order,
  }));
}

// ─── Staff Query ────────────────────────────────────────────────────────────

export async function getStorefrontStaff(
  tenantId: string
): Promise<StorefrontStaff[]> {
  if (!tenantId) return [];

  const supabase = await getClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select("id, full_name, title, bio, image_url")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  return data.map((member) => ({
    id: member.id,
    fullName: member.full_name,
    title: member.title,
    bio: member.bio,
    imageUrl: member.image_url,
  }));
}

// ─── Composite Queries ──────────────────────────────────────────────────────

/**
 * Fetches all data needed for the storefront home page in parallel:
 * tenant info, featured services (first 3), and staff members.
 */
export async function getStorefrontHomeData(
  slug: string
): Promise<StorefrontHomeData | null> {
  const tenant = await getStorefrontTenant(slug);
  if (!tenant || !isSitePublic(tenant.status, tenant.isPublished)) return null;

  const [services, staff] = await Promise.all([
    getStorefrontServices(tenant.id),
    getStorefrontStaff(tenant.id),
  ]);

  return {
    tenant,
    featuredServices: services.slice(0, 3),
    staff,
  };
}

/**
 * Fetches all data needed for the storefront services page in parallel:
 * tenant info, all active services, and service categories.
 */
export async function getStorefrontServicesData(
  slug: string
): Promise<StorefrontServicesData | null> {
  const tenant = await getStorefrontTenant(slug);
  if (!tenant || !isSitePublic(tenant.status, tenant.isPublished)) return null;

  const [services, categories] = await Promise.all([
    getStorefrontServices(tenant.id),
    getStorefrontCategories(tenant.id),
  ]);

  return {
    tenant,
    services,
    categories,
  };
}