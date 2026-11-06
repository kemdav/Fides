import type { Metadata } from "next";
import { TenantsScreen, type StatusFilter } from "@/components/admin/tenants-screen";

export const metadata: Metadata = {
  title: "Tenants & subscriptions",
};

const filters: StatusFilter[] = ["active", "suspended", "renewing"];

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const initialFilter = filters.find((filter) => filter === status) ?? "all";

  return <TenantsScreen initialFilter={initialFilter} />;
}
