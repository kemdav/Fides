import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ALL_SERVICES,
} from "@/components/storefront/storefront-data";
import {
  getStorefrontServicesData,
  getStorefrontStaff,
} from "@/lib/storefront";
import {
  StorefrontServicePage,
  type BookingServiceOption,
  type BookingStaffOption,
} from "@/providers/storefront-service-page";

export const metadata: Metadata = {
  title: "Book an appointment",
  robots: { index: false, follow: false },
};

type BookingPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string | string[] }>;
};

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const data = await getStorefrontServicesData(slug);

  if (!data) notFound();

  const dbServices = data.services;
  const services: BookingServiceOption[] =
    dbServices.length > 0
      ? dbServices.map((service) => ({
          id: service.id,
          name: service.name,
          category: service.categoryName || "Service",
          description: service.description,
          duration: `${service.durationMinutes} min`,
          price: `₱${Math.round(service.priceCents / 100).toLocaleString("en-PH")}`,
        }))
      : ALL_SERVICES.map((service) => ({
          id: service.name,
          name: service.name,
          category: service.category,
          duration: service.duration,
          price: service.price,
        }));
  const staff: BookingStaffOption[] = (
    await getStorefrontStaff(data.tenant.id)
  ).map(({ id, fullName, title }) => ({ id, fullName, title }));
  const initialServiceId =
    typeof query.service === "string" ? query.service : "";

  return (
    <StorefrontServicePage
      slug={slug}
      services={services}
      staff={staff}
      initialServiceId={initialServiceId}
    />
  );
}
