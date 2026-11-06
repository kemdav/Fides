"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const navItems: { label: string; href: string; icon: IconName }[] = [
  { label: "Overview", href: "/admin", icon: "grid" },
  { label: "Verification", href: "/admin/verification", icon: "shield" },
  { label: "Tenants", href: "/admin/tenants", icon: "users" },
  { label: "Subscription tiers", href: "/admin/subscription-tiers", icon: "layers" },
  { label: "Activity log", href: "/admin/activity", icon: "clock" },
];

export function AdminNav({
  orientation,
  onNavigate,
}: {
  orientation: "vertical" | "horizontal";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <nav
      aria-label="Admin"
      className={cn(vertical ? "flex w-full flex-col gap-[7px]" : "flex items-center gap-2")}
    >
      {navItems.map((item) => {
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex h-[45px] items-center gap-3 whitespace-nowrap rounded-[9px] p-3 text-sm font-semibold leading-[21px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
              active ? "bg-burnt/10 text-burnt" : "text-ink hover:bg-mist",
              vertical ? "w-full" : "px-3"
            )}
          >
            <Icon name={item.icon} weight={active ? "fill" : "regular"} className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
