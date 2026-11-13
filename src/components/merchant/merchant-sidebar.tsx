"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/admin/icon";
import { cn } from "@/lib/utils";

interface MerchantSidebarProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  basePath?: string;
}

const manageItems: { label: string; icon: IconName; suffix?: string }[] = [
  { label: "Overview", icon: "grid" },
  { label: "Appointments", icon: "calendar", suffix: "/appointments" },
  { label: "Walk-ins", icon: "users" },
  { label: "QR check-in", icon: "verified" },
  { label: "Customers", icon: "users" },
  { label: "Services", icon: "layers" },
  { label: "Staff & permissions", icon: "shield" },
  { label: "Availability", icon: "clock" },
  { label: "Payments", icon: "card" },
  { label: "Reports", icon: "verified" },
];

export function MerchantSidebar({
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole = "Business owner",
  basePath = "",
}: MerchantSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const dashboardPath = `${basePath}/dashboard`;
  const displayName = userName || userEmail;
  const isActive = (suffix?: string) =>
    suffix ? pathname.startsWith(`${dashboardPath}${suffix}`) : pathname === dashboardPath;

  const renderItem = (item: (typeof manageItems)[number], configuration = false) => {
    const href = item.suffix
      ? `${dashboardPath}${item.suffix}`
      : configuration
        ? `${dashboardPath}/settings/website`
        : dashboardPath;
    const active = configuration ? pathname.startsWith(href) : isActive(item.suffix);
    const available = item.label === "Overview" || item.label === "Appointments" || configuration;

    if (!available) {
      return (
        <div key={item.label} className="flex h-[45px] items-center gap-3 rounded-[9px] p-3 text-sm leading-[21px] text-neutral-400">
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
          "flex h-[45px] items-center gap-3 whitespace-nowrap rounded-[9px] p-3 text-sm font-semibold leading-[21px] transition-colors",
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
        <span className="text-xs font-semibold uppercase tracking-[1.2px] text-neutral-400">Merchant</span>
      </div>

      {mobileOpen && (
        <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" />
      )}

      <aside className={cn(
        "fixed bottom-0 left-0 top-0 z-50 flex w-[248px] shrink-0 flex-col gap-3 border-r border-[#EDECE8] bg-white p-5 transition-transform duration-200 lg:sticky lg:z-10 lg:flex",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-start justify-between border-b border-[#EDECE8] pb-5">
          <div>
            <h1 className="font-display text-[32px] leading-[42px] tracking-tight text-[#C35000]">{businessName}</h1>
            <p className="text-xs font-semibold uppercase leading-[18px] tracking-[1.3px] text-neutral-400">Merchant Workspace</p>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)} className="p-1 text-neutral-400 lg:hidden" aria-label="Close navigation menu">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <p className="text-xs leading-[18px] tracking-[1.3px] text-neutral-400">WORKSPACE</p>
        <nav aria-label="Merchant workspace" className="flex w-full flex-col gap-[7px]">
          {manageItems.map((item) => renderItem(item))}
        </nav>
        <p className="mt-2 text-xs leading-[18px] tracking-[1.3px] text-neutral-400">CONFIGURATION</p>
        <nav aria-label="Merchant configuration" className="flex w-full flex-col gap-[7px]">
          {renderItem({ label: "Website settings", icon: "layers" }, true)}
          {renderItem({ label: "Booking settings", icon: "clock" })}
          {renderItem({ label: "Subscription", icon: "card" })}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-3 border-t border-[#EDECE8] pt-5">
          <div className="flex size-10 items-center justify-center rounded-full bg-[#C35000] text-sm font-semibold text-white">MS</div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-[21px] text-[#354357]">{displayName}</span>
            <span className="block text-xs leading-[18px] text-neutral-400">{userRole}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
