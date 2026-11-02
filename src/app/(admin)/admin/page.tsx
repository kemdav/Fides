import type { Metadata } from "next";
import { AdminLinkButton } from "@/components/admin/admin-button";
import { MetricCard, OverdueBadge } from "@/components/admin/metric-card";
import { AccountFollowUp } from "@/components/admin/overview/account-follow-up";
import { ActivityChart } from "@/components/admin/overview/activity-chart";
import { TenantMetricCards } from "@/components/admin/overview/tenant-metric-cards";
import { TenantsProvider } from "@/components/admin/overview/tenant-provider";
import { OverviewQueue } from "@/components/admin/overview/overview-queue";
import { RecentDecisions } from "@/components/admin/overview/recent-decisions";
import { UserDistribution } from "@/components/admin/overview/user-distribution";
import { PageContent, PageHeading } from "@/components/admin/primitives";
import { isOverdue, sampleSubmissions } from "@/lib/admin/verification";

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
          <AdminLinkButton variant="outline" size="md" href="/admin/subscription-tiers">
            Subscription tiers
          </AdminLinkButton>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          featured
          href="/admin/verification"
          label="Awaiting verification"
          value={pending.length}
          caption="Open verification →"
          icon="mask-verified"
          progress={65}
          badge={overdue > 0 ? <OverdueBadge count={overdue} /> : undefined}
        />
        <TenantMetricCards />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1010fr_578fr]">
        <ActivityChart />
        <UserDistribution />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1016fr_568fr]">
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
