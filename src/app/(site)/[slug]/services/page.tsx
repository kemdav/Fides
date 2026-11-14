import type { Metadata } from "next";
import {
  StorefrontHeader,
  StorefrontFooter,
  ServicesList,
} from "@/components/storefront";
import {
  BUSINESS_NAME,
  getStorefrontNav,
  ALL_SERVICES,
} from "@/components/storefront/storefront-data";

interface ServicesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ServicesPageProps): Promise<Metadata> {
  const { slug } = await params;
  void slug; // Will be used to look up tenant metadata.
  return {
    title: `${BUSINESS_NAME} – Services`,
    description: `Browse all services offered by ${BUSINESS_NAME}`,
    openGraph: {
      title: `${BUSINESS_NAME} – Services`,
      description: `Browse all services offered by ${BUSINESS_NAME}`,
      type: "website",
    },
  };
}

export default async function ServicesPage({ params }: ServicesPageProps) {
  const { slug } = await params;
  const nav = getStorefrontNav(slug);

  // TODO: Fetch tenant services from DB using `slug`.

  return (
    <>
      <StorefrontHeader
        businessName={BUSINESS_NAME}
        navLinks={nav}
        activeHref={`/${slug}/services`}
        contactHref={`/${slug}/contact`}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/services`}
      />

      <main className="flex flex-1 bg-powder">
        <ServicesList
          services={ALL_SERVICES}
          contactHref={`/${slug}/contact`}
        />
      </main>

      <StorefrontFooter
        businessName={BUSINESS_NAME}
        navLinks={nav}
        activeHref={`/${slug}/services`}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/services`}
      />
    </>
  );
}
