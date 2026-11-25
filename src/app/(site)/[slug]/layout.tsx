import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import { normalizeBrandColor, readableForeground } from "@/lib/brand-colors";
import { getTenantBySlug } from "@/lib/supabase/queries";
import { getStorefrontHomeData } from "@/lib/storefront";
import {
  TenantProvider,
  type TenantContextValue,
} from "@/providers/tenant-provider";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Serif+Display&family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&family=Montserrat:wght@400;500;600;700&family=Mulish:wght@400;500;600;700&family=Ovo&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap";

const TYPOGRAPHY_FONT_MAP: Record<string, { display: string; body: string }> = {
  "Ovo + Mulish": {
    display: "'Ovo', Georgia, serif",
    body: "'Mulish', system-ui, sans-serif",
  },
  "Playfair + Inter": {
    display: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  "Cormorant + Plus Jakarta Sans": {
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  "DM Serif + Montserrat": {
    display: "'DM Serif Display', Georgia, serif",
    body: "'Montserrat', system-ui, sans-serif",
  },
  "Lora + Source Sans 3": {
    display: "'Lora', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
};

function getTypographyFonts(typography?: string | null) {
  if (!typography) return TYPOGRAPHY_FONT_MAP["Ovo + Mulish"];
  return TYPOGRAPHY_FONT_MAP[typography] ?? TYPOGRAPHY_FONT_MAP["Ovo + Mulish"];
}

interface TenantLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { slug } = await params;
  const [tenant, storefrontData] = await Promise.all([
    getTenantBySlug(slug),
    getStorefrontHomeData(slug),
  ]);

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

  const theme = storefrontData?.tenant;
  const fonts = getTypographyFonts(theme?.typography);
  const mainColor = normalizeBrandColor(tenant.brand_color || theme?.brandColor || null, "");
  const secondaryColor = normalizeBrandColor(tenant.secondary_color, "");
  const accentColor = normalizeBrandColor(tenant.accent_color || theme?.accentColor || null, "");

  const themeStyle = {
    "--font-display": fonts.display,
    "--font-ovo": fonts.display,
    "--font-sans": fonts.body,
    "--font-mulish": fonts.body,
    fontFamily: fonts.body,
    ...(mainColor ? { "--color-powder": mainColor } : {}),
    ...(secondaryColor ? { "--color-sky": secondaryColor } : {}),
    ...(accentColor
      ? {
          "--color-burnt": accentColor,
          "--color-burnt-dark": accentColor,
          "--color-on-burnt": readableForeground(accentColor, "#ffffff"),
        }
      : {}),
  } as CSSProperties;

  return (
    <div className="min-h-dvh bg-powder text-ink" style={themeStyle}>
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      <TenantProvider tenant={tenantContextValue}>{children}</TenantProvider>
    </div>
  );
}
