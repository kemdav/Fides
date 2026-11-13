import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StorefrontHeader,
  StorefrontHero,
  FeaturedServices,
  StorefrontAbout,
  StorefrontFooter,
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

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const businessName =
    tenant?.display_name?.trim() || tenant?.name || "Storefront";

  return {
    title: `${businessName} – Home`,
    description:
      tenant?.supporting_message ||
      `Browse and book services at ${businessName}`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${businessName} – Home`,
      description:
        tenant?.supporting_message ||
        `Browse and book services at ${businessName}`,
      type: "website",
    },
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  const businessName = tenant.display_name?.trim() || tenant.name;
  const nav = getStorefrontNav(slug);

  // Fetch tenant services from Supabase for the featured services section
  const dbServices = await getServicesByTenantId(tenant.id);
  const services =
    dbServices.length > 0
      ? dbServices.slice(0, 3).map((service) => toServiceCardData(service, slug))
      : ALL_SERVICES.slice(0, 3);

  const heroHeading = tenant.headline || "A little time for yourself.";
  const heroSubtitle =
    tenant.supporting_message ||
    "Thoughtful care, experienced specialists, and easy online booking. Choose a service and find a time that works for you.";
  const heroImageSrc =
    tenant.cover_photo_url || "/images/storefront/hero Image.png";

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
