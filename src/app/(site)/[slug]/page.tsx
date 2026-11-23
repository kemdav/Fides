import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StorefrontHeader,
  StorefrontHero,
  FeaturedServices,
  StorefrontAbout,
  StorefrontFooter,
} from "@/components/storefront";
import { getStorefrontNav } from "@/components/storefront/storefront-data";
import { ALL_SERVICES } from "@/components/storefront/storefront-data";
import {
  getStorefrontHomeData,
  toStorefrontServiceCard,
} from "@/lib/storefront";

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStorefrontHomeData(slug);
  const businessName =
    data?.tenant.displayName?.trim() || data?.tenant.name || "Storefront";

  return {
    title: `${businessName} – Home`,
    description:
      data?.tenant.supportingMessage ||
      `Browse and book services at ${businessName}`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${businessName} – Home`,
      description:
        data?.tenant.supportingMessage ||
        `Browse and book services at ${businessName}`,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const data = await getStorefrontHomeData(slug);

  if (!data) {
    notFound();
  }

  const { tenant, featuredServices } = data;

  const businessName = tenant.displayName?.trim() || tenant.name;
  const nav = getStorefrontNav(slug);

  // Map DB services to card format, fall back to demo data if no services exist
  const services =
    featuredServices.length > 0
      ? featuredServices.map((s) => toStorefrontServiceCard(s, slug))
      : ALL_SERVICES.slice(0, 3);

  const heroHeading = tenant.headline || "A little time for yourself.";
  const heroSubtitle =
    tenant.supportingMessage ||
    "Thoughtful care, experienced specialists, and easy online booking. Choose a service and find a time that works for you.";
  const heroImageSrc =
    tenant.coverPhotoUrl || "/images/storefront/hero Image.png";

  const aboutDescription =
    tenant.about ||
    "Our mission is simple: to create a warm, welcoming space where everyone can find a little time for themselves.";

  return (
    <>
      <StorefrontHeader
        businessName={businessName}
        navLinks={nav}
        activeHref={`/${slug}`}
        contactHref={`/${slug}/contact`}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/services`}
      />

      <main className="flex-1">
        <StorefrontHero
          heading={heroHeading}
          subtitle={heroSubtitle}
          ctaLabel="Book An Appointment"
          ctaHref={`/${slug}/services`}
          imageSrc={heroImageSrc}
          imageAlt={`${businessName} booking on a mobile phone`}
        />

        <FeaturedServices
          services={services}
          viewAllHref={`/${slug}/services`}
        />

        <StorefrontAbout
          businessName={businessName}
          description={aboutDescription}
          ctaHref={`/${slug}/about`}
          imageSrc={heroImageSrc}
          imageAlt={`About ${businessName}`}
        />
      </main>

      <StorefrontFooter
        businessName={businessName}
        navLinks={nav}
        activeHref={`/${slug}`}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/services`}
      />
    </>
  );
}
