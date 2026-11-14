import type { Metadata } from "next";
import { TenantsScreen, type StatusFilter } from "@/components/admin/tenants-screen";
import { loadAdminSnapshot } from "@/lib/applications/service";

export const metadata: Metadata = {
  title: "Tenants & subscriptions",
};

const filters: StatusFilter[] = ["active", "suspended", "renewing"];

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const initialFilter = filters.find((filter) => filter === status) ?? "all";
  const snapshot = await loadAdminSnapshot();

  return (
    <TenantsScreen
      initialFilter={initialFilter}
      tenants={snapshot.tenants}
      pending={snapshot.submissions
        .filter((item) => item.status === "pending")
        .map((item) => ({
          id: item.id,
          business: item.business,
          owner: item.owner,
          email: item.email,
          plan: item.plan,
          reference: item.reference,
          submittedAt: item.submittedAt,
        }))}
      plans={snapshot.plans}
      now={Date.parse(snapshot.now)}
      mailConfigured={snapshot.mailConfigured}
    />
  );
}
