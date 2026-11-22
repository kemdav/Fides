import { redirect } from "next/navigation";
import { getWalkInWorkspaceData } from "@/lib/merchant/walk-ins";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { WalkInsView } from "@/components/merchant/walk-ins/walk-ins-view";

export const dynamic = "force-dynamic";

export default async function DashboardWalkInsPage() {
  const initialData = await getWalkInWorkspaceData();
  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#FFFDF7] lg:flex-row">
      <MerchantSidebar />
      <main className="min-w-0 flex-1">
        <WalkInsView initialData={initialData} />
      </main>
    </div>
  );
}
