import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { getTenantBySlug } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import styles from "@/components/merchant/reports/reports.module.css";

export default async function ReportsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}): Promise<ReactNode> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const access = await resolveTenantAccess(await createClient(), tenant.id);
  if (access?.role !== "owner" && access?.role !== "admin") notFound();

  return (
    <div className={`flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden ${styles.workspace}`}>
      <div className="contents print:hidden">
        <MerchantSidebar businessName={tenant.name} userRole={access.role} basePath={`/${encodeURIComponent(tenant.slug)}`} />
      </div>
      <div className={`min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto ${styles.content}`}>{children}</div>
    </div>
  );
}
