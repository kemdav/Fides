import type { ServiceCardData } from "@/components/storefront";

// ---------------------------------------------------------------------------
// Shared demo data for the customer-facing storefront.
// In production these would be fetched from the database for the resolved
// tenant. For now we use static data matching the Figma design.
// ---------------------------------------------------------------------------

export const BUSINESS_NAME = "Bella Vita";

/**
 * Builds tenant-scoped navigation links.
 * All hrefs are prefixed with `/<slug>` so they resolve correctly under the
 * dynamic `[slug]` route segment.
 */
export function getStorefrontNav(slug: string) {
  const base = `/${slug}`;
  return [
    { label: "Home", href: base },
    { label: "Services", href: `${base}/services` },
    { label: "About", href: `${base}#about` },
  ];
}

/**
 * All services offered by the tenant.
 * The first 3 are shown as "Featured Services" on the home page.
 */
export const ALL_SERVICES: ServiceCardData[] = [
  {
    category: "Style & Care",
    categoryColor: "text-burnt",
    name: "Signature haircut",
    duration: "45 min",
    price: "₱650",
    imageSrc: "/images/storefront/Salon Service photograph.png",
    imageAlt: "Stylist giving a signature haircut",
    href: "#book",
  },
  {
    category: "Rest & Recover",
    categoryColor: "text-success",
    name: "Wellness massage",
    duration: "60 min",
    price: "₱1,200",
    imageSrc: "/images/storefront/Massage Service photograph.png",
    imageAlt: "Wellness massage treatment",
    href: "#book",
  },
  {
    category: "Feel Your Best",
    categoryColor: "text-burnt",
    name: "Facial treatment",
    duration: "50 min",
    price: "₱950",
    imageSrc: "/images/storefront/Facial Service photograph.png",
    imageAlt: "Facial treatment in progress",
    href: "#book",
  },
  {
    category: "Style & Care",
    categoryColor: "text-burnt",
    name: "Hair color & style",
    duration: "90 min",
    price: "₱1,800",
    imageSrc: "/images/storefront/Salon Service photograph.png",
    imageAlt: "Hair color and styling service",
    href: "#book",
  },
  {
    category: "Rest & Recover",
    categoryColor: "text-success",
    name: "Manicure & pedicure",
    duration: "60 min",
    price: "₱750",
    imageSrc: "/images/storefront/Massage Service photograph.png",
    imageAlt: "Manicure and pedicure treatment",
    href: "#book",
  },
  {
    category: "Feel Your Best",
    categoryColor: "text-burnt",
    name: "Scalp care",
    duration: "30 min",
    price: "₱450",
    imageSrc: "/images/storefront/Facial Service photograph.png",
    imageAlt: "Scalp care treatment",
    href: "#book",
  },
];

