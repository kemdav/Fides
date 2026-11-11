import type { Metadata } from "next";
import {
  StorefrontAboutPage,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/storefront";
import {
  BUSINESS_NAME,
  getStorefrontNav,
} from "@/components/storefront/storefront-data";

interface AboutPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { slug } = await params;
  void slug;
  return {
    title: `${BUSINESS_NAME} – About`,
    description: `Learn more about ${BUSINESS_NAME}`,
    openGraph: {
      title: `${BUSINESS_NAME} – About`,
      description: `Learn more about ${BUSINESS_NAME}`,
      type: "website",
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { slug } = await params;
  const nav = getStorefrontNav(slug);

  return (
    <>
      <StorefrontHeader
        businessName={BUSINESS_NAME}
        navLinks={nav}
        activeHref={`/${slug}/about`}
      />
      <StorefrontAboutPage businessName={BUSINESS_NAME} />
      <StorefrontFooter businessName={BUSINESS_NAME} background="white" />
    </>
  );
}
