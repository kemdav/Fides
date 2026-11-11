import type { Metadata } from "next";
import {
  StorefrontHeader,
  StorefrontHero,
  FeaturedServices,
  StorefrontAbout,
  StorefrontFooter,
} from "@/components/storefront";
import type { ServiceCardData } from "@/components/storefront";

// ---------------------------------------------------------------------------
// In production these would be fetched from the database for the resolved
// tenant slug. For now we use static demo data matching the Figma design.
// ---------------------------------------------------------------------------

const BUSINESS_NAME = "Bella Vita";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
];

const FEATURED_SERVICES: ServiceCardData[] = [
  {
    category: "Style & Care",
    categoryColor: "text-burnt",
    name: "Signature haircut",
    duration: "45 min",
    price: "₱650",
    imageSrc: "/images/storefront/service-haircut.svg",
    imageAlt: "Stylist giving a signature haircut",
    href: "#book",
  },
  {
    category: "Rest & Recover",
    categoryColor: "text-success",
    name: "Wellness massage",
    duration: "60 min",
    price: "₱1,200",
    imageSrc: "/images/storefront/service-massage.svg",
    imageAlt: "Wellness massage treatment",
    href: "#book",
  },
  {
    category: "Feel Your Best",
    categoryColor: "text-burnt",
    name: "Facial treatment",
    duration: "50 min",
    price: "₱950",
    imageSrc: "/images/storefront/service-facial.svg",
    imageAlt: "Facial treatment in progress",
    href: "#book",
  },
];

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  // In production, look up the tenant by slug for real metadata.
  return {
    title: `${BUSINESS_NAME} – Services`,
    description: `Browse and book services at ${BUSINESS_NAME}`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${BUSINESS_NAME} – Services`,
      description: `Browse and book services at ${BUSINESS_NAME}`,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug } = await params;

  // TODO: Fetch tenant config + services from DB using `slug`.

  return (
    <>
      <StorefrontHeader
        businessName={BUSINESS_NAME}
        navLinks={NAV_LINKS}
        activeHref="#home"
      />

      <main className="flex-1">
        <StorefrontHero
          heading="A little time for yourself."
          subtitle="Thoughtful care, experienced specialists, and easy online booking. Choose a service and find a time that works for you."
          ctaLabel="Book An Appointment"
          ctaHref="#book"
          imageSrc="/images/storefront/hero.svg"
          imageAlt={`${BUSINESS_NAME} booking on a mobile phone`}
        />

        <FeaturedServices
          services={FEATURED_SERVICES}
          viewAllHref="#services"
        />

        <StorefrontAbout
          businessName={BUSINESS_NAME}
          description="Our mission is simple: to create a warm, welcoming space where everyone can find a little time for themselves."
          ctaHref="#about"
          imageSrc="/images/storefront/about.svg"
          imageAlt={`About ${BUSINESS_NAME}`}
        />
      </main>

      <StorefrontFooter businessName={BUSINESS_NAME} />
    </>
  );
}
