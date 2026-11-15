import { features } from "@/components/landing/features";
import { plans } from "@/components/landing/pricing";
import { siteConfig } from "@/lib/site";

export const landingTitle = "Fides | Booking and Business Management for Service Businesses";

export const landingDescription =
  "Give customers an easy way to discover and book your services while you manage schedules, customers, staff and daily operations in one place.";

export const baseUrl = siteConfig.url.replace(/\/$/, "");

const priceOf = (label: string) => Number(label.replace(/[^\d.]/g, ""));

export function buildStructuredData() {
  const org = `${baseUrl}/#organization`;
  const site = `${baseUrl}/#website`;
  const software = `${baseUrl}/#software`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: siteConfig.name,
        url: baseUrl,
        description: landingDescription,
        logo: { "@type": "ImageObject", url: `${baseUrl}/icons/icon-512.png`, width: 512, height: 512 },
      },
      {
        "@type": "WebSite",
        "@id": site,
        url: baseUrl,
        name: siteConfig.name,
        inLanguage: "en-PH",
        publisher: { "@id": org },
      },
      {
        "@type": "WebPage",
        "@id": `${baseUrl}/#webpage`,
        url: baseUrl,
        name: landingTitle,
        description: landingDescription,
        inLanguage: "en-PH",
        isPartOf: { "@id": site },
        about: { "@id": software },
      },
      {
        "@type": "SoftwareApplication",
        "@id": software,
        name: siteConfig.name,
        url: baseUrl,
        description: landingDescription,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        publisher: { "@id": org },
        featureList: features.map((feature) => feature.title),
        offers: plans.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          description: plan.description,
          url: `${baseUrl}/register`,
          price: priceOf(plan.price),
          priceCurrency: "PHP",
          availability: "https://schema.org/InStock",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: priceOf(plan.price),
            priceCurrency: "PHP",
            unitCode: "MON",
            unitText: "month",
          },
        })),
      },
    ],
  };
}

export function buildLlmsTxt() {
  const featureLines = features.map((feature) => `- ${feature.title}: ${feature.description}`);
  const planLines = plans.map(
    (plan) =>
      `- ${plan.name} (${plan.price} per month): ${plan.description}${
        plan.includes ? ` ${plan.includes.replace(/[()]/g, "")}` : ""
      } Includes: ${plan.features.join("; ")}.`
  );

  return [
    `# ${siteConfig.name}`,
    "",
    `> ${landingDescription}`,
    "",
    `${siteConfig.name} is a booking and business-management platform for local service businesses. Each business gets a branded website where customers can discover services and book appointments, plus a dashboard for the owner and staff.`,
    "",
    "## pages",
    `- [Home](${baseUrl}/): overview, features and pricing`,
    `- [Request an account](${baseUrl}/register): ask for a business account`,
    "",
    "## features",
    ...featureLines,
    "",
    "## plans (prices in philippine pesos)",
    ...planLines,
    "",
  ].join("\n");
}
