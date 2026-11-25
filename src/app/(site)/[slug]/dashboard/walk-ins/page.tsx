import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageBookings } from "@/lib/merchant/workspace-roles";
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/${slug}/dashboard/walk-ins`)}`);
  const { data: tenant } = await supabase.from("tenants").select("id, name").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();
  const { data: membership } = await supabase.from("tenant_memberships").select("role, profiles(full_name)")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  if (!canManageBookings(membership?.role)) notFound();
  const initialData = await getWalkInWorkspaceData(tenant.id);
  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <MerchantSidebar basePath={`/${slug}`} businessName={tenant.name} userName={membership?.profiles?.full_name ?? undefined}
        userEmail={user.email} userRole={membership?.role} />
      <main className="min-w-0 flex-1">
        <WalkInsView initialData={initialData} />
      </main>
    </div>
  );
}
