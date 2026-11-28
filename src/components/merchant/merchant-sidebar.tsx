"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/admin/icon";
import { cn, getInitials } from "@/lib/utils";
import {
  canManageBookings,
  workspaceRoleFromLabel,
  staffRoleLabels,
  type WorkspaceRole,
} from "@/lib/merchant/workspace-roles";
import { merchantNameTypography } from "@/lib/brand-colors";

interface MerchantSidebarProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: WorkspaceRole | string;
  basePath?: string;
}

type NavigationItem = {
  label: string;
  icon: IconName;
  suffix?: string;
  access?: "operations" | "management";
};

const manageItems: NavigationItem[] = [
  { label: "Overview", icon: "grid", suffix: "" },
  { label: "Appointments", icon: "calendar", suffix: "/appointments" },
  {
    label: "Walk-ins",
    icon: "users",
    suffix: "/walk-ins",
    access: "operations",
  },
  { label: "QR check-in", icon: "qr-code", access: "operations" },
  {
    label: "Customers",
    icon: "users",
    suffix: "/customers",
    access: "operations",
  },
  {
    label: "Services",
    icon: "layers",
    suffix: "/services",
    access: "operations",
  },
  {
    label: "Staff & permissions",
    icon: "shield",
    suffix: "/staff",
    access: "management",
  },
  {
    label: "Availability",
    icon: "clock",
    suffix: "/availability",
    access: "operations",
  },
  {
    label: "Payments",
    icon: "card",
    suffix: "/payments",
    access: "operations",
  },
  { label: "Reports", icon: "document", access: "management" },
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
  const role = workspaceRoleFromLabel(userRole);
  const managesTeam = role === "owner" || role === "admin";
  const visibleItems = manageItems.filter(
    ({ access }) =>
      !access ||
      (access === "operations" ? canManageBookings(role) : managesTeam),
  );

  const renderItem = (item: NavigationItem) => {
    if (item.suffix === undefined) {
      return (
        <button
          key={item.label}
          type="button"
          disabled
          className="flex min-h-[clamp(32px,4.2vh,40px)] cursor-not-allowed items-center gap-3 rounded-[9px] px-3 py-1.5 text-left text-sm leading-[21px] text-glyph"
        >
          <Icon name={item.icon} className="size-5" />
          <span>{item.label}</span>
        </button>
      );
    }
    const href = `${dashboardPath}${item.suffix}`;
    const active =
      pathname === href ||
      (item.suffix !== "" && pathname.startsWith(`${href}/`));

    return (
      <Link
        key={item.label}
        href={href}
        aria-current={active ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex min-h-[clamp(32px,4.2vh,40px)] items-center gap-3 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-sm font-semibold leading-[21px] transition-colors",
          active ? "bg-sky/45 text-burnt" : "text-body hover:bg-mist",
        )}
      >
        <Icon
          name={item.icon}
          weight={active ? "fill" : "regular"}
          className="size-5"
        />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-hairline bg-white px-5 py-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1 text-body"
          aria-label="Toggle navigation menu"
        >
          <Icon name="grid" className="size-6" />
        </button>
        <span className="font-display text-2xl text-burnt">{businessName}</span>
        <span aria-hidden="true" className="size-8" />
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 flex w-[248px] shrink-0 flex-col gap-[clamp(4px,1vh,12px)] overflow-y-auto border-r border-hairline bg-white p-4 transition-transform duration-200 lg:sticky lg:z-10 lg:flex lg:h-dvh",
          mobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-hairline pb-4">
          <div>
            <h1 className={cn(merchantNameTypography, "text-burnt")}>
              {businessName}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1 text-glyph lg:hidden"
            aria-label="Close navigation menu"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <p className="text-xs leading-[18px] tracking-[1.3px] text-glyph">
          WORKSPACE
        </p>
        <nav
          aria-label="Workspace navigation"
          className="flex w-full flex-col gap-[clamp(1px,0.4vh,5px)]"
        >
          {visibleItems.map((item) => renderItem(item))}
        </nav>
        {role === "owner" && (
          <>
            <p className="mt-2 text-xs leading-[18px] tracking-[1.3px] text-glyph">
              CONFIGURATION
            </p>
            <nav
              aria-label="Merchant configuration"
              className="flex w-full flex-col gap-[clamp(1px,0.4vh,5px)]"
            >
              {renderItem({
                label: "Website settings",
                icon: "settings",
                suffix: "/settings/website",
              })}
              {renderItem({
                label: "Booking settings",
                icon: "book-settings",
                suffix: "/settings/booking",
              })}
              {renderItem({
                label: "Subscription",
                icon: "card",
                suffix: "/settings/subscription",
              })}
            </nav>
          </>
        )}
        <div className="flex-1" />
        <div className="shrink-0 border-t border-hairline pt-3">
          <Link
            href={accountPath}
            onClick={() => setMobileOpen(false)}
            aria-current={accountActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
              accountActive && "bg-sky/45",
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-burnt text-sm font-semibold text-on-burnt"
            >
              {getInitials(displayName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {displayName}
              </span>
              <span className="block truncate text-xs text-muted">
                {role === "owner"
                  ? "Business owner"
                  : role
                    ? staffRoleLabels[role]
                    : "My account"}
              </span>
            </span>
            <Icon
              name="chevron-down"
              className="size-3.5 -rotate-90 text-muted"
            />
          </Link>
        </div>
      </aside>
    </>
  );
}
