"use client";

import { AdminButton } from "../admin-button";
import { Icon, type IconName } from "../icon";
import { Surface } from "../primitives";
import { formatNextBilling, isRenewingSoon } from "@/lib/admin/tenants";
import { useTenants } from "../tenant-provider";

export function AccountFollowUp() {
  const { tenants, openTenant, now } = useTenants();
  const renewing = tenants.filter((tenant) => isRenewingSoon(tenant, now)).sort((a, b) => Date.parse(a.nextBilling ?? "") - Date.parse(b.nextBilling ?? ""))[0];
  const suspended = tenants.find((tenant) => tenant.access === "suspended");

  const followUps: { icon: IconName; title: string; detail: string; action: string; onClick?: () => void }[] = [
    {
      icon: "clock",
      title: "Upcoming renewal",
      detail: renewing ? `${renewing.name} · ${formatNextBilling(renewing)}` : "No renewals due within 7 days",
      action: "Manage",
      onClick: renewing ? () => openTenant(renewing.id) : undefined,
    },
    {
      icon: "lock",
      title: "Restricted account access",
      detail: suspended ? "Review suspended tenant accounts" : "No suspended tenant accounts",
      action: "Review",
      onClick: suspended ? () => openTenant(suspended.id) : undefined,
    },
  ];

  return (
    <Surface className="flex flex-col gap-3 shadow-[0_3px_7px_rgb(44_58_75/0.04)]">
      <h2 className="text-base font-semibold leading-6">Account follow-up</h2>
      {followUps.map((item) => (
        <div key={item.title} className="flex min-h-[72px] items-center gap-3">
          <Icon name={item.icon} className="size-6 text-glyph" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-semibold leading-5">{item.title}</p>
            <p className="text-xs text-muted">{item.detail}</p>
          </div>
          <AdminButton
            variant="outline"
            size="md"
            className="min-w-[104px] shrink-0"
            disabled={!item.onClick}
            onClick={item.onClick}
          >
            {item.action}
          </AdminButton>
        </div>
      ))}
    </Surface>
  );
}
