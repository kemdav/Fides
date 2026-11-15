import type { Metadata } from "next";
import { AdminLinkButton } from "@/components/admin/admin-button";
import { MetricCard, OverdueBadge } from "@/components/admin/metric-card";
import { AccountFollowUp } from "@/components/admin/overview/account-follow-up";
import { ActivityChart } from "@/components/admin/overview/activity-chart";
import { OverviewQueue } from "@/components/admin/overview/overview-queue";
import { RecentDecisions } from "@/components/admin/overview/recent-decisions";
import { TenantMetricCards } from "@/components/admin/overview/tenant-metric-cards";
import { UserDistribution } from "@/components/admin/overview/user-distribution";
import { PageContent, PageHeading } from "@/components/admin/primitives";
import { TenantsProvider } from "@/components/admin/tenant-provider";
import { buildDistribution, buildWeek } from "@/lib/admin/overview";
import { isOverdue } from "@/lib/admin/verification";
import { loadAdminSnapshot } from "@/lib/applications/service";

export const metadata: Metadata = {
  title: "Platform overview",
};

export default async function AdminPage() {
  const snapshot = await loadAdminSnapshot();
  const now = Date.parse(snapshot.now);
  const pending = snapshot.submissions.filter((item) => item.status === "pending");
  const overdue = pending.filter((item) => isOverdue(item, now)).length;

  return (
    <TenantsProvider tenants={snapshot.tenants} plans={snapshot.plans} now={now} mailConfigured={snapshot.mailConfigured}>
      <PageContent>
        <PageHeading
          eyebrow="ADMINISTRATION"
          title="Platform Overview"
          description="Review merchant submissions and keep provider accounts on track."
          actions={
            <AdminLinkButton variant="outline" size="md" href="/admin/subscription-tiers">
              Subscription tiers
            </AdminLinkButton>
          }
        />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            featured
            href="/admin/verification"
            label="Awaiting verification"
            value={pending.length}
            caption="Open verification →"
            icon="verified"
            progress={pending.length === 0 ? 0 : Math.min(100, 20 + pending.length * 10)}
            badge={overdue > 0 ? <OverdueBadge count={overdue} /> : undefined}
          />
          <TenantMetricCards />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1010fr)_minmax(0,578fr)]">
          <ActivityChart week={buildWeek(snapshot.submissions, now)} />
          <UserDistribution slices={buildDistribution(snapshot.tenants)} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1016fr)_minmax(0,568fr)]">
          <OverviewQueue submissions={snapshot.submissions} now={now} />
          <div className="flex flex-col gap-5">
            <RecentDecisions
              events={snapshot.activity.filter((event) => event.category !== "pricing").slice(0, 3)}
              now={now}
            />
            <AccountFollowUp />
          </div>
        </div>
      </PageContent>
    </TenantsProvider>
  );
}
