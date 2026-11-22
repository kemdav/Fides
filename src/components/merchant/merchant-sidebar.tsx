"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/admin/icon";
import { cn, getInitials } from "@/lib/utils";
import { staffRoleLabels, type WorkspaceRole } from "@/lib/merchant/workspace-roles";
import { merchantNameTypography } from "@/lib/brand-colors";

interface MerchantSidebarProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: WorkspaceRole;
  basePath?: string;
}

const manageItems: { label: string; icon: IconName; suffix?: string }[] = [
  { label: "Overview", icon: "grid" },
  { label: "Appointments", icon: "calendar", suffix: "/appointments" },
  { label: "Walk-ins", icon: "users" },
  { label: "QR check-in", icon: "qr-code" },
  { label: "Customers", icon: "users" },
  { label: "Services", icon: "layers" },
  { label: "Staff & permissions", icon: "shield", suffix: "/staff" },
  { label: "Availability", icon: "clock" },
  { label: "Payments", icon: "card" },
  { label: "Reports", icon: "document" },
];

export function MerchantSidebar({
  businessName = "Bella Vita",
  userName,
  userEmail,
  userRole,
  basePath = "",
}: MerchantSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const dashboardPath = `${basePath}/dashboard`;
  const accountPath = `${dashboardPath}/account`;
  const accountActive = pathname === accountPath;
  const displayName = userName?.trim() || userEmail?.trim() || "My account";
  const managesTeam = userRole === "owner" || userRole === "admin";
  const visibleItems = managesTeam ? manageItems : manageItems.filter(({ label }) => label === "Overview" || label === "Appointments");
  const isActive = (suffix?: string) =>
    suffix ? pathname.startsWith(`${dashboardPath}${suffix}`) : pathname === dashboardPath;

  const renderItem = (item: (typeof manageItems)[number], configuration = false) => {
    const href = item.suffix
      ? `${dashboardPath}${item.suffix}`
      : configuration
        ? `${dashboardPath}/settings/website`
        : dashboardPath;
    const active = configuration ? pathname.startsWith(href) : isActive(item.suffix);
    const available = item.label === "Overview" || item.label === "Appointments" || item.label === "Staff & permissions" || configuration;

    if (!available) {
      return (
        <div key={item.label} className="flex min-h-[clamp(32px,4.2vh,40px)] items-center gap-3 rounded-[9px] px-3 py-1.5 text-sm leading-[21px] text-neutral-400">
          <Icon name={item.icon} className="size-5" />
          <span>{item.label}</span>
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex min-h-[clamp(32px,4.2vh,40px)] items-center gap-3 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-sm font-semibold leading-[21px] transition-colors",
          active ? "bg-[#C35000]/10 text-[#C35000]" : "text-[#354357] hover:bg-[#F4F1EA]"
        )}
      >
        <Icon name={item.icon} weight={active ? "fill" : "regular"} className="size-5" />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#EDECE8] bg-white px-5 py-4 lg:hidden">
        <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-1 text-[#354357]" aria-label="Toggle navigation menu">
          <Icon name="grid" className="size-6" />
        </button>
        <span className="font-display text-2xl text-[#C35000]">{businessName}</span>
        <span aria-hidden="true" className="size-8" />
      </div>

      {mobileOpen && (
        <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />
      )}

      <aside className={cn(
        "fixed bottom-0 left-0 top-0 z-50 flex w-[248px] shrink-0 flex-col gap-[clamp(4px,1vh,12px)] overflow-y-auto border-r border-[#EDECE8] bg-white p-4 transition-transform duration-200 lg:sticky lg:z-10 lg:flex lg:h-dvh",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex shrink-0 items-start justify-between border-b border-[#EDECE8] pb-4">
          <div>
            <h1 className={cn(merchantNameTypography, "text-burnt")}>{businessName}</h1>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)} className="p-1 text-neutral-400 lg:hidden" aria-label="Close navigation menu">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <p className="text-xs leading-[18px] tracking-[1.3px] text-neutral-400">WORKSPACE</p>
        <nav aria-label="Workspace navigation" className="flex w-full flex-col gap-[clamp(1px,0.4vh,5px)]">
          {visibleItems.map((item) => renderItem(item))}
        </nav>
        {userRole === "owner" && <>
        <p className="mt-2 text-xs leading-[18px] tracking-[1.3px] text-neutral-400">CONFIGURATION</p>
        <nav aria-label="Merchant configuration" className="flex w-full flex-col gap-[clamp(1px,0.4vh,5px)]">
          {renderItem({ label: "Website settings", icon: "settings" }, true)}
          {renderItem({ label: "Booking settings", icon: "book-settings" })}
          {renderItem({ label: "Subscription", icon: "card" })}
        </nav>
        </>}
        <div className="flex-1" />
        <div className="shrink-0 border-t border-hairline pt-3">
          <Link href={accountPath} onClick={() => setMobileOpen(false)}
            aria-current={accountActive ? "page" : undefined}
            className={cn("flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40", accountActive && "bg-burnt/10")}>
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-burnt text-sm font-semibold text-white">
              {getInitials(displayName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{displayName}</span>
              <span className="block truncate text-xs text-muted">{userRole === "owner" ? "Business owner" : userRole ? staffRoleLabels[userRole] : "My account"}</span>
            </span>
            <Icon name="chevron-down" className="size-3.5 -rotate-90 text-muted" />
          </Link>
        </div>
      </aside>
    </>
  );
}
