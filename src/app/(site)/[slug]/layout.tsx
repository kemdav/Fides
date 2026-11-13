import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/supabase/queries";
import { TenantProvider, type TenantContextValue } from "@/providers/tenant-provider";

interface TenantLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  // If the tenant does not exist or is not active, trigger 404
  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  const businessName = tenant.display_name?.trim() || tenant.name;

  const tenantContextValue: TenantContextValue = {
    id: tenant.id,
    tenant_id: tenant.id,
    name: tenant.name,
    businessName,
    business_name: businessName,
    slug: tenant.slug,
    status: tenant.status,
    logo_url: tenant.logo_url,
    brand_color: tenant.brand_color,
    display_name: tenant.display_name,
    about: tenant.about,
    phone: tenant.phone,
    address: tenant.address,
    email: tenant.email,
    headline: tenant.headline,
    supporting_message: tenant.supporting_message,
    cover_photo_url: tenant.cover_photo_url,
    hours_mon_fri: tenant.hours_mon_fri,
    hours_sat: tenant.hours_sat,
    hours_sun: tenant.hours_sun,
    show_opening_hours: tenant.show_opening_hours,
  };

  return <TenantProvider tenant={tenantContextValue}>{children}</TenantProvider>;
}
