"use client";

import { MetricCard } from "../metric-card";
import { useTenants } from "./tenant-provider";

const RENEWING_TENANT_ID = "olive-and-oak-spa";

export function TenantMetricCards() {
  const { tenants, openTenant } = useTenants();
  const active = tenants.filter((tenant) => tenant.access === "active").length;
  const suspended = tenants.filter((tenant) => tenant.access === "suspended");

  return (
    <>
      <MetricCard
        href="/admin/tenants"
        label="Active tenants"
        value={active}
        caption="View active accounts →"
        icon="mask-people"
        progress={65}
      />
      <MetricCard
        onClick={() => openTenant(RENEWING_TENANT_ID)}
        label="Renewing in 7 days"
        value={1}
        caption="Review the upcoming renewal →"
        icon="mask-payment"
        progress={65}
      />
      <MetricCard
        onClick={suspended[0] ? () => openTenant(suspended[0].id) : undefined}
        href={suspended[0] ? undefined : "/admin/tenants"}
        label="Suspended accounts"
        value={suspended.length}
        caption="Review account access →"
        icon="mask-lock"
        progress={65}
      />
    </>
  );
}
