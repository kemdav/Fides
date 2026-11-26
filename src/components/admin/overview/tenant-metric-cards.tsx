"use client";

import { MetricCard } from "../metric-card";
import { useTenants } from "../tenants-provider";

export function TenantMetricCards() {
  const { tenants } = useTenants();
  const active = tenants.filter((tenant) => tenant.access === "active").length;
  const suspended = tenants.filter((tenant) => tenant.access === "suspended");

  return (
    <>
      <MetricCard
        href="/admin/tenants?status=active"
        label="Active tenants"
        value={active}
        caption="View active accounts"
        captionArrow
        icon="users"
        progress={65}
      />
      <MetricCard
        href="/admin/tenants?status=renewing"
        label="Renewing in 7 days"
        value={1}
        caption="Review the upcoming renewal"
        captionArrow
        icon="card"
        progress={65}
      />
      <MetricCard
        href="/admin/tenants?status=suspended"
        label="Suspended accounts"
        value={suspended.length}
        caption="Review account access"
        captionArrow
        icon="lock"
        progress={65}
      />
    </>
  );
}
