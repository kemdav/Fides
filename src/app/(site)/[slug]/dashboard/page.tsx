import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  OverviewView,
} from "@/components/merchant/overview/overview-view";
import { getMerchantOverview } from "@/lib/merchant/overview";
import type { OverviewPeriod } from "@/lib/merchant/overview";
import { getAppointmentBookingOptions } from "@/lib/merchant/appointment-booking-options";
import { getActiveStaffForProfile, getMonthlyStaffCommission } from "@/lib/merchant/staff-profile";
import { getWebsitePublished } from "@/lib/merchant/website-workspace";
import { canManageBookings, workspaceRoleFromLabel } from "@/lib/merchant/workspace-roles";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface MerchantDashboardPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ period?: string; month?: string }>;
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
  const { period: periodParam, month } = (await searchParams) ?? {};
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

  const { data: membership } = await supabase.from("tenant_memberships").select("role, profiles(full_name)")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  const { data: profile } = await supabase.from("profiles").select("full_name, role, tenant_id")
    .eq("id", user.id).maybeSingle();
  const userRole = membership?.role ?? (profile?.tenant_id === tenant.id ? workspaceRoleFromLabel(profile.role) : undefined);
  if (!userRole) notFound();
  const userName = membership?.profiles?.full_name?.trim() || profile?.full_name?.trim() || user.email?.split("@")[0] || "My account";
  const canViewBusinessMetrics = userRole === "owner" || userRole === "admin";
  const staff = userRole === "staff" ? await getActiveStaffForProfile(tenant.id, user.id) : undefined;
  const now = new Date();
  const [overview, bookingOptions, websitePublished] = await Promise.all([
    getMerchantOverview(supabase, tenant.id, now, period, { staff, calendarMonth: month }),
    canManageBookings(userRole) ? getAppointmentBookingOptions(supabase, tenant.id) : undefined,
    userRole === "owner" ? getWebsitePublished(supabase, tenant.id) : null,
  ]);
  const db = staff ? getAdminClient() : null;
  const commission = staff && db
    ? await getMonthlyStaffCommission(db, tenant.id, overview.timezone, now, staff.id)
    : [];
  const rows = overview.todayAppointments;
  const completedToday = rows.filter((row) => row.rawStatus === "completed").length;
  const checkedInToday = rows.filter((row) =>
    row.rawStatus === "checked_in" || row.rawStatus === "in_service"
  ).length;
  const pendingCount = rows.filter(
    (row) => row.rawStatus === "pending_approval"
  ).length;
  const confirmedToday = rows.filter((row) => row.rawStatus === "confirmed").length;

  return (
    <OverviewView
      businessName={tenant.name}
      userName={userName}
      userEmail={user.email ?? "Merchant staff"}
      userRole={userRole}
      tenantId={tenant.id}
      bookingOptions={bookingOptions}
      websiteSetupUserId={websitePublished === false ? user.id : undefined}
      basePath={`/${slug}`}
      todayCount={rows.length}
      confirmedCount={confirmedToday}
      pendingCount={pendingCount}
      checkedInCount={checkedInToday}
      completedVisitsCount={completedToday}
      bookingCount={overview.metrics.bookingCount}
      {...(userRole === "staff" && {
        activeCustomerCount: overview.metrics.activeCustomerCount,
        commissionThisMonth: commission.reduce((sum, total) => sum + Number(total.commission_cents), 0) / 100,
      })}
      {...(canViewBusinessMetrics && {
        revenueTotal: Math.round(overview.metrics.revenueCents / 100),
        revenueChangePercent: overview.metrics.revenueChangePercent,
        activeCustomerCount: overview.metrics.activeCustomerCount,
        customerGrowthPercent: overview.metrics.customerGrowthPercent,
        averageOrderValue: Math.round(overview.metrics.averageOrderValueCents / 100),
      })}
      initialPeriod={period}
      chartStats={overview.chartStats}
      todayActivity={rows.slice(0, 4).map((row) => ({
        time: row.time,
        customer: row.customer,
        service: row.service,
      }))}
      initialRows={rows}
      calendarAppointments={overview.calendarAppointments}
      calendarMonthKey={overview.calendarMonth}
      todayKey={overview.todayKey}
    />
  );
}
