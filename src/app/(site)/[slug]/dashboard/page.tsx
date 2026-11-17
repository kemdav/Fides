import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  OverviewView,
} from "@/components/merchant/overview/overview-view";
import { getMerchantOverview } from "@/lib/merchant/overview";
import { createClient } from "@/lib/supabase/server";

interface MerchantDashboardPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantDashboardPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} Merchant Workspace`,
    description: "Manage appointments, walk-ins, customers, and daily operations.",
  };
}

export default async function MerchantDashboardPage({
  params,
}: MerchantDashboardPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/${slug}/dashboard`);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();
  if (tenantError || !tenant) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const overview = await getMerchantOverview(supabase, tenant.id);
  const rows = overview.todayAppointments;
  const completedToday = rows.filter((row) => row.rawStatus === "completed").length;
  const checkedInToday = rows.filter((row) =>
    row.rawStatus === "checked_in" || row.rawStatus === "in_service"
  ).length;
  const pendingCount = overview.calendarAppointments.filter(
    (row) => row.rawStatus === "pending_approval"
  ).length;
  const confirmedToday = rows.filter((row) => row.rawStatus === "confirmed").length;

  return (
    <OverviewView
      businessName={tenant.name}
      userName={profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "Merchant staff"}
      userRole={profile?.role === "owner" ? "Business owner" : profile?.role || "Staff"}
      tenantId={tenant.id}
      basePath={`/${slug}`}
      todayCount={rows.length}
      confirmedCount={confirmedToday}
      pendingCount={pendingCount}
      checkedInCount={checkedInToday}
      completedVisitsCount={completedToday}
      revenueTotal={Math.round(overview.metrics.revenueCents / 100)}
      chartStats={overview.chartStats}
      todayActivity={rows.slice(0, 4).map((row) => ({
        time: row.time,
        customer: row.customer,
        service: row.service,
      }))}
      initialRows={rows}
      calendarAppointments={overview.calendarAppointments}
    />
  );
}
