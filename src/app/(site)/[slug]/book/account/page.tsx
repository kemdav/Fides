import { StorefrontBookingAccountPage } from "@/providers/storefront-service-page";
import type { BookingDetails } from "@/providers/storefront-service-page";

type AccountPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    service?: string | string[];
    serviceName?: string | string[];
    duration?: string | string[];
    price?: string | string[];
    staffName?: string | string[];
    date?: string | string[];
    time?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function BookingAccountPage({
  params,
  searchParams,
}: AccountPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const booking: BookingDetails = {
    serviceId: firstValue(query.service),
    serviceName: firstValue(query.serviceName),
    duration: firstValue(query.duration),
    price: firstValue(query.price),
    staffName: firstValue(query.staffName),
    date: firstValue(query.date),
    time: firstValue(query.time),
  };

  return <StorefrontBookingAccountPage slug={slug} booking={booking} />;
}
