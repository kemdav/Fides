import type { ServiceCardData } from "@/components/storefront/service-card";
import type { StorefrontService } from "./queries";

/**
 * Maps a StorefrontService from the backend into the ServiceCardData shape
 * expected by the storefront UI components.
 */
export function toStorefrontServiceCard(
  service: StorefrontService,
  slug: string
): ServiceCardData {
  const formattedPrice = `₱${Math.round(service.priceCents / 100).toLocaleString("en-PH")}`;
  return {
    name: service.name,
    category: service.categoryName || "Style & Care",
    categoryColor: "text-burnt",
    duration: `${service.durationMinutes} min`,
    price: formattedPrice,
    imageSrc: "/images/storefront/Salon Service photograph.png",
    imageAlt: `${service.name} service`,
    href: `/${slug}/book?service=${encodeURIComponent(service.id)}`,
  };
}
