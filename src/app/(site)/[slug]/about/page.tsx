import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StorefrontAboutPage,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import { getStorefrontNav } from "@/components/storefront/storefront-data";
import { getTenantBySlug } from "@/lib/supabase/queries";

interface AboutPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const businessName =
    tenant?.display_name?.trim() || tenant?.name || "Storefront";

  return {
    title: `${businessName} – About`,
    description: tenant?.about || `Learn more about ${businessName}`,
    openGraph: {
      title: `${businessName} – About`,
      description: tenant?.about || `Learn more about ${businessName}`,
      type: "website",
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  const businessName = tenant.display_name?.trim() || tenant.name;
  const nav = getStorefrontNav(slug);

  return (
    <>
      <StorefrontHeader
        businessName={businessName}
        navLinks={nav}
        activeHref={`/${slug}/about`}
        contactHref={`/${slug}/contact`}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/services`}
      />
      <StorefrontAboutPage
        businessName={businessName}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/services`}
        aboutText={tenant.about}
        address={tenant.address}
        phone={tenant.phone}
        hoursMonFri={tenant.hours_mon_fri}
        hoursSat={tenant.hours_sat}
        hoursSun={tenant.hours_sun}
        showOpeningHours={tenant.show_opening_hours}
      />
      <StorefrontFooter
        businessName={businessName}
        background="white"
        navLinks={nav}
        activeHref={`/${slug}/about`}
        contactHref={`/${slug}/contact`}
        bookHref={`/${slug}/services`}
      />
    </>
  );
}
