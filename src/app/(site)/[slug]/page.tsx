import type { Metadata } from "next";
import {
  StorefrontHeader,
  StorefrontHero,
  FeaturedServices,
  StorefrontAbout,
  StorefrontFooter,
} from "@/components/storefront";
import {
  BUSINESS_NAME,
  getStorefrontNav,
  ALL_SERVICES,
} from "@/components/storefront/storefront-data";

// ---------------------------------------------------------------------------
// In production these would be fetched from the database for the resolved
// tenant slug. For now we use static demo data matching the Figma design.
// ---------------------------------------------------------------------------

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  void slug; // Will be used to look up tenant metadata.
  return {
    title: `${BUSINESS_NAME} – Home`,
    description: `Browse and book services at ${BUSINESS_NAME}`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${BUSINESS_NAME} – Home`,
      description: `Browse and book services at ${BUSINESS_NAME}`,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const nav = getStorefrontNav(slug);

  // TODO: Fetch tenant config + services from DB using `slug`.

  return (
    <>
      <StorefrontHeader
        businessName={BUSINESS_NAME}
        navLinks={nav}
        activeHref={`/${slug}`}
      />

      <main className="flex-1">
        <StorefrontHero
          heading="A little time for yourself."
          subtitle="Thoughtful care, experienced specialists, and easy online booking. Choose a service and find a time that works for you."
          ctaLabel="Book An Appointment"
          ctaHref="#book"
          imageSrc="/images/storefront/hero Image.png"
          imageAlt={`${BUSINESS_NAME} booking on a mobile phone`}
        />

        <FeaturedServices
          services={ALL_SERVICES.slice(0, 3)}
          viewAllHref={`/${slug}/services`}
        />

        <StorefrontAbout
          businessName={BUSINESS_NAME}
          description="Our mission is simple: to create a warm, welcoming space where everyone can find a little time for themselves."
          ctaHref={`/${slug}#about`}
          imageSrc="/images/storefront/hero Image.png"
          imageAlt={`About ${BUSINESS_NAME}`}
        />
      </main>

      <StorefrontFooter businessName={BUSINESS_NAME} />
    </>
  );
}
