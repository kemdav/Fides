import { WebsiteSettingsView } from "@/components/merchant/website-settings/website-settings-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Settings · Merchant Workspace · Fides",
  description:
    "Merchant website settings, domain management, 60-30-10 color palette, SEO preview, and publishing.",
};

export default function WebsiteSettingsPreviewPage() {
  return <WebsiteSettingsView />;
}
