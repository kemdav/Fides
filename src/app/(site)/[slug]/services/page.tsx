import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StorefrontHeader,
  StorefrontFooter,
  ServicesList,
} from "@/components/storefront";
import { getStorefrontNav } from "@/components/storefront/storefront-data";
import { ALL_SERVICES } from "@/components/storefront/storefront-data";
import {
  getStorefrontServicesData,
  toStorefrontServiceCard,
} from "@/lib/storefront";

interface ServicesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ServicesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStorefrontServicesData(slug);
  const businessName =
    data?.tenant.displayName?.trim() || data?.tenant.name || "Storefront";

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
  const data = await getStorefrontServicesData(slug);

  if (!data) {
    notFound();
  }

  const { tenant, services: dbServices } = data;

  console.log(
    "\n[Storefront Services] Fetched data from DB:",
    JSON.stringify(
      {
        tenant: tenant.name,
        slug: tenant.slug,
        totalServices: dbServices.length,
        services: dbServices.map((s) => ({
          name: s.name,
          priceCents: s.priceCents,
          durationMinutes: s.durationMinutes,
          category: s.categoryName,
        })),
      },
      null,
      2
    )
  );

  const businessName = tenant.displayName?.trim() || tenant.name;
  const nav = getStorefrontNav(slug);

  // Map DB services to card format, fall back to demo data if none exist
  const services =
    dbServices.length > 0
      ? dbServices.map((s) => toStorefrontServiceCard(s, slug))
      : ALL_SERVICES.map((service) => ({
          ...service,
          href: `/${slug}/book?service=${encodeURIComponent(service.name)}`,
        }));

  return (
    <>
      <StorefrontHeader
        businessName={businessName}
        navLinks={nav}
        activeHref={`/${slug}/services`}
        contactHref={`/${slug}/contact`}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/book`}
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
        bookHref={`/${slug}/book`}
      />
    </>
  );
}
