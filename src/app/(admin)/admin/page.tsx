import type { Metadata } from "next";
import Link from "next/link";
import { MetricCard, OverdueBadge } from "@/components/admin/metric-card";
import { AccountFollowUp } from "@/components/admin/overview/account-follow-up";
import { ActivityChart } from "@/components/admin/overview/activity-chart";
import { TenantMetricCards } from "@/components/admin/overview/tenant-metric-cards";
import { TenantsProvider } from "@/components/admin/tenant-provider";
import { OverviewQueue } from "@/components/admin/overview/overview-queue";
import { RecentDecisions } from "@/components/admin/overview/recent-decisions";
import { UserDistribution } from "@/components/admin/overview/user-distribution";
import { PageContent, PageHeading } from "@/components/admin/primitives";
import { isOverdue, sampleSubmissions } from "@/lib/admin/verification";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Platform overview",
};

/**
 * Platform Administrator Portal (`/admin`).
 *
 * Gated by middleware / proxy for users with role === 'admin'.
 */
export default function AdminPage() {
  const pending = sampleSubmissions.filter((item) => item.status === "pending");
  const overdue = pending.filter(isOverdue).length;

  return (
    <TenantsProvider>
    <PageContent>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Platform Overview"
        description="Review merchant submissions and keep provider account on track."
        actions={
          <Link href="/admin/subscription-tiers" className={buttonClasses({ variant: "secondary", size: "formLg" })}>
            Subscription tiers
          </Link>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          featured
          href="/admin/verification"
          label="Awaiting verification"
          value={pending.length}
          caption="Open verification"
          captionArrow
          icon="verified"
          progress={65}
          badge={overdue > 0 ? <OverdueBadge count={overdue} /> : undefined}
        />
        <TenantMetricCards />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1010fr)_minmax(0,578fr)]">
        <ActivityChart />
        <UserDistribution />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1016fr)_minmax(0,568fr)]">
        <OverviewQueue />
        <div className="flex flex-col gap-5">
          <RecentDecisions />
          <AccountFollowUp />
        </div>
      </div>
    </PageContent>
    </TenantsProvider>
  );
}
