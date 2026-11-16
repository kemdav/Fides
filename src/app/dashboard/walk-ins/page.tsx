import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WalkInsView } from "@/components/merchant/walk-ins/walk-ins-view";
import { createClient } from "@/lib/supabase/server";
import { loadWalkInsDashboardData } from "@/lib/walk-ins";

export const metadata: Metadata = {
  title: "Walk-ins & waiting list · Merchant Workspace · Fides",
  description: "Welcome every walk-in and fill available slots without displacing existing bookings.",
};

export default async function DashboardWalkInsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/walk-ins");
  }

  const { tenant: tenantSlugParam } = (await searchParams) || {};

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  let tenantId = profile?.tenant_id;
  let businessName = "Bella Vita";

  if (tenantSlugParam) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("slug", tenantSlugParam)
      .single();
    if (tData) {
      tenantId = tData.id;
      businessName = tData.name;
    }
  } else if (tenantId) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();
    if (tData) {
      businessName = tData.name;
    }
  }

  if (!tenantId) {
    return <WalkInsView businessName={businessName} userEmail={user.email ?? "Merchant staff"} />;
  }

  const data = await loadWalkInsDashboardData(supabase, tenantId);

  return (
    <WalkInsView
      businessName={businessName}
      userEmail={user.email ?? "Merchant staff"}
      tenantId={tenantId}
      initialEntries={data.initialEntries}
      availableStaff={data.availableStaff}
      staffPool={data.availableStaff}
      servedTodayCount={data.servedTodayCount}
      typicalWait={data.typicalWait}
      basePath=""
      dateISO={data.dateISO}
      dateLabel={data.dateLabel}
    />
  );
}
