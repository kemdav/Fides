import { redirect } from "next/navigation";
import { getWalkInWorkspaceData } from "@/lib/merchant/walk-ins";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { WalkInsView } from "@/components/merchant/walk-ins/walk-ins-view";

export const dynamic = "force-dynamic";

export default async function TenantWalkInsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const initialData = await getWalkInWorkspaceData();
  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-powder lg:flex-row">
      <MerchantSidebar basePath={`/${slug}`} />
      <main className="min-w-0 flex-1">
        <WalkInsView initialData={initialData} />
      </main>
    </div>
  );
}
