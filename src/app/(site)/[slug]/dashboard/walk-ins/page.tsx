import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WalkInsView } from "@/components/merchant/walk-ins/walk-ins-view";
import { createClient } from "@/lib/supabase/server";
import { loadWalkInsDashboardData } from "@/lib/walk-ins";

interface MerchantWalkInsPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Walk-ins & waiting list · Merchant Workspace · Fides",
  description: "Welcome every walk-in and fill available slots without displacing existing bookings.",
};

export default async function MerchantWalkInsPage({ params }: MerchantWalkInsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/walk-ins`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  const data = await loadWalkInsDashboardData(supabase, tenant.id);

  return (
    <WalkInsView
      businessName={tenant.name}
      userEmail={user.email ?? "Merchant staff"}
      tenantId={tenant.id}
      initialEntries={data.initialEntries}
      availableStaff={data.availableStaff}
      staffPool={data.availableStaff}
      servedTodayCount={data.servedTodayCount}
      typicalWait={data.typicalWait}
      basePath={`/${slug}`}
      dateISO={data.dateISO}
      dateLabel={data.dateLabel}
    />
  );
}
