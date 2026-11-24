import type { Metadata } from "next";
import type { CSSProperties } from "react";
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
  getStorefrontHomeData,
  toStorefrontServiceCard,
} from "@/lib/storefront";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Serif+Display&family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&family=Montserrat:wght@400;500;600;700&family=Mulish:wght@400;500;600;700&family=Ovo&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap";

const TYPOGRAPHY_FONT_MAP: Record<string, { display: string; body: string }> = {
  "Ovo + Mulish": {
    display: "'Ovo', Georgia, serif",
    body: "'Mulish', system-ui, sans-serif",
  },
  "Playfair + Inter": {
    display: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  "Cormorant + Plus Jakarta Sans": {
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  "DM Serif + Montserrat": {
    display: "'DM Serif Display', Georgia, serif",
    body: "'Montserrat', system-ui, sans-serif",
  },
  "Lora + Source Sans 3": {
    display: "'Lora', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
};

function getTypographyFonts(typography?: string | null) {
  if (!typography) return TYPOGRAPHY_FONT_MAP["Ovo + Mulish"];
  return TYPOGRAPHY_FONT_MAP[typography] ?? TYPOGRAPHY_FONT_MAP["Ovo + Mulish"];
}

interface StorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStorefrontHomeData(slug);
  const tenant = data?.tenant;
  const businessName =
    tenant?.displayName?.trim() || tenant?.name || "Storefront";

  const title = tenant?.pageTitle?.trim() || `${businessName} – Home`;
  const description =
    tenant?.metaDescription?.trim() ||
    tenant?.supportingMessage?.trim() ||
    `Browse and book services at ${businessName}`;
  const allowIndexing = tenant?.allowIndexing ?? true;
  const socialTitle = tenant?.socialTitle?.trim() || title;
  const socialDescription = tenant?.socialDescription?.trim() || description;
  const socialImage =
    tenant?.socialImageUrl?.trim() || tenant?.coverPhotoUrl?.trim() || null;

  return {
    title,
    description,
    robots: { index: allowIndexing, follow: allowIndexing },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      type: "website",
      ...(socialImage ? { images: [{ url: socialImage }] } : {}),
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

  const fonts = getTypographyFonts(tenant.typography);
  const themeStyle = {
    "--font-display": fonts.display,
    "--font-ovo": fonts.display,
    "--font-sans": fonts.body,
    "--font-mulish": fonts.body,
    fontFamily: fonts.body,
    ...(tenant.accentColor
      ? {
          "--color-burnt": tenant.accentColor,
          "--color-burnt-dark": tenant.accentColor,
        }
      : {}),
    ...(tenant.brandColor
      ? {
          "--color-sky": tenant.brandColor,
        }
      : {}),
  } as CSSProperties;

  return (
    <div
      className="flex min-h-dvh flex-col bg-powder text-ink"
      style={themeStyle}
    >
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />

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

        {tenant.showFeaturedServices && (
          <FeaturedServices
            services={services}
            viewAllHref={`/${slug}/services`}
          />
        )}

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
    </div>
  );
}
