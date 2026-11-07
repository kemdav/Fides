import type { ReactNode } from "react";
import { Footer } from "@/components/landing/footer";
import { ProviderHeader } from "@/components/landing/provider-header";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
};

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { tenantSlug } = await params;

  return (
    <div className="min-h-screen bg-[#FFFFEB] text-ink">
      <ProviderHeader tenantName="Bella Vita" tenantSlug={tenantSlug} />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
