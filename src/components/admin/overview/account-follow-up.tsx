"use client";

import { Icon, type IconName } from "../icon";
import { Surface } from "../primitives";
import { useTenants } from "../tenant-provider";
import { Button } from "@/components/ui/button";

export function AccountFollowUp() {
  const { tenants, openTenant } = useTenants();
  const suspended = tenants.find((tenant) => tenant.access === "suspended");

  const followUps: { icon: IconName; title: string; detail: string; action: string; onClick?: () => void }[] = [
    {
      icon: "clock",
      title: "Upcoming renewal",
      detail: "Olive & Oak Spa · Oct 12",
      action: "Manage",
      onClick: () => openTenant("olive-and-oak-spa"),
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
    <Surface className="flex flex-col gap-3 shadow-card-sm">
      <h2 className="text-base font-semibold leading-6">Account follow-up</h2>
      {followUps.map((item) => (
        <div key={item.title} className="flex min-h-[72px] items-center gap-3">
          <Icon name={item.icon} className="size-6 text-glyph" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-sm font-semibold leading-5">{item.title}</p>
            <p className="text-xs text-muted">{item.detail}</p>
          </div>
          <Button
            variant="secondary"
            size="formLg"
            className="min-w-[104px] shrink-0"
            disabled={!item.onClick}
            onClick={item.onClick}
          >
            {item.action}
          </Button>
        </div>
      ))}
    </Surface>
  );
}
