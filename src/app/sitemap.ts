import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/landing-seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: baseUrl, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/request-account`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
