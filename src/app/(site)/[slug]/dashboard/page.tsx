import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  OverviewView,
} from "@/components/merchant/overview/overview-view";
import { getMerchantOverview } from "@/lib/merchant/overview";
import type { OverviewPeriod } from "@/lib/merchant/overview";
import { createClient } from "@/lib/supabase/server";

interface MerchantDashboardPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ period?: string }>;
}

export async function generateMetadata({
  params,
}: MerchantDashboardPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  const title = tenant?.name?.trim()
    ? `${tenant.name.trim()} Dashboard`
    : "Merchant Dashboard";
  return {
    title,
    description: "Manage appointments, walk-ins, customers, and daily operations.",
  };
}

export default async function MerchantDashboardPage({
  params,
  searchParams,
}: MerchantDashboardPageProps) {
  const { slug } = await params;
  const { period: periodParam } = (await searchParams) ?? {};
  const period: OverviewPeriod =
    periodParam === "Today" || periodParam === "This Month"
      ? periodParam
      : "This Week";
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

  const overview = await getMerchantOverview(supabase, tenant.id, new Date(), period);
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
      revenueChangePercent={overview.metrics.revenueChangePercent}
      bookingCount={overview.metrics.bookingCount}
      activeCustomerCount={overview.metrics.activeCustomerCount}
      customerGrowthPercent={overview.metrics.customerGrowthPercent}
      averageOrderValue={Math.round(overview.metrics.averageOrderValueCents / 100)}
      initialPeriod={period}
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
