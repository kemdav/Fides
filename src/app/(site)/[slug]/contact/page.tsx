import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StorefrontContactPage,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import { getStorefrontNav } from "@/components/storefront/storefront-data";
import { getTenantBySlug } from "@/lib/supabase/queries";

interface ContactPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ContactPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  const businessName =
    tenant?.display_name?.trim() || tenant?.name || "Storefront";

  return {
    title: `${businessName} – Contact`,
    description: `Contact ${businessName}. Have questions about our services or need guidance? We are here to help.`,
    openGraph: {
      title: `${businessName} – Contact`,
      description: `Contact ${businessName}. Have questions about our services or need guidance? We are here to help.`,
      type: "website",
    },
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  const businessName = tenant.display_name?.trim() || tenant.name;
  const nav = getStorefrontNav(slug);
  const contactHref = `/${slug}/contact`;

  return (
    <>
      <StorefrontHeader
        businessName={businessName}
        navLinks={nav}
        activeHref={contactHref}
        contactHref={contactHref}
        homeHref={`/${slug}`}
        bookHref={`/${slug}/services`}
      />
      <StorefrontContactPage
        tenantId={tenant.id}
        tenantSlug={slug}
        businessName={businessName}
        email={tenant.email}
        phone={tenant.phone}
        address={tenant.address}
        servicesHref={`/${slug}/services`}
      />
      <StorefrontFooter
        businessName={businessName}
        navLinks={nav}
        activeHref={contactHref}
        contactHref={contactHref}
        bookHref={`/${slug}/services`}
        background="white"
      />
    </>
  );
}
