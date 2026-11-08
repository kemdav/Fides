import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Footer } from "@/components/landing/footer";
import { ProviderHeader } from "@/components/landing/provider-header";
import { getTenantBySlug } from "@/lib/supabase/queries";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
};

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  const tenantName = tenant.display_name || tenant.name;

  return (
    <div className="min-h-screen bg-[#FFFFEB] text-ink">
      <ProviderHeader tenantName={tenantName} tenantSlug={tenantSlug} />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
