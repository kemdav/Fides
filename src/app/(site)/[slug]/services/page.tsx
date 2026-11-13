import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StorefrontHeader,
  StorefrontFooter,
  ServicesList,
} from "@/components/storefront";
import {
  getStorefrontNav,
  ALL_SERVICES,
} from "@/components/storefront/storefront-data";
import {
  getTenantBySlug,
  getServicesByTenantId,
  toServiceCardData,
} from "@/lib/supabase/queries";

interface ServicesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ServicesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const businessName =
    tenant?.display_name?.trim() || tenant?.name || "Storefront";

  return {
    title: `${businessName} – Services`,
    description: `Browse all services offered by ${businessName}`,
    openGraph: {
      title: `${businessName} – Services`,
      description: `Browse all services offered by ${businessName}`,
      type: "website",
    },
  };
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  const businessName = tenant.display_name?.trim() || tenant.name;
  const nav = getStorefrontNav(slug);

  // Fetch all active services for this tenant from Supabase
  const dbServices = await getServicesByTenantId(tenant.id);
  const services =
    dbServices.length > 0
      ? dbServices.map((service) => toServiceCardData(service, slug))
      : ALL_SERVICES;

  return (
    <>
      <StorefrontHeader
        businessName={businessName}
        navLinks={nav}
        activeHref={`/${slug}/services`}
        contactHref={`/${slug}/contact`}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/services`}
      />

      <main className="flex flex-1 bg-powder">
        <ServicesList
          services={services}
          contactHref={`/${slug}/contact`}
        />
      </main>

      <StorefrontFooter
        businessName={businessName}
        navLinks={nav}
        activeHref={`/${slug}/services`}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/services`}
      />
    </>
  );
}
