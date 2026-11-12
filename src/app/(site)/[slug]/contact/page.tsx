import type { Metadata } from "next";
import {
  StorefrontContactPage,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import { BUSINESS_NAME, getStorefrontNav } from "@/components/storefront/storefront-data";

interface ContactPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { slug } = await params;
  void slug;
  return {
    title: `${BUSINESS_NAME} – Contact`,
    description: `Contact ${BUSINESS_NAME}`,
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { slug } = await params;
  const nav = getStorefrontNav(slug);
  const contactHref = `/${slug}/contact`;

  return (
    <>
      <StorefrontHeader
        businessName={BUSINESS_NAME}
        navLinks={nav}
        activeHref={contactHref}
        contactHref={contactHref}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/services`}
      />
      <StorefrontContactPage servicesHref={`/${slug}/services`} />
      <StorefrontFooter
        businessName={BUSINESS_NAME}
        navLinks={nav}
        activeHref={contactHref}
        contactHref={contactHref}
        bookHref={`/${slug}/services`}
        background="white"
      />
    </>
  );
}
