import type { Metadata } from "next";
import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Operations } from "@/components/landing/operations";
import { Pricing } from "@/components/landing/pricing";
import { buildStructuredData, landingDescription, landingTitle } from "@/lib/landing-seo";

export const metadata: Metadata = {
  title: { absolute: landingTitle },
  description: landingDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Fides",
    locale: "en_PH",
    url: "/",
    title: landingTitle,
    description: landingDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: landingTitle,
    description: landingDescription,
  },
};

export default function Home() {
  const structuredData = JSON.stringify(buildStructuredData()).replace(/</g, "\\u003c");

  return (
    <div className="bg-powder">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-burnt"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Operations />
        <Features />
        <Pricing />
        <Cta />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
    </div>
  );
}
