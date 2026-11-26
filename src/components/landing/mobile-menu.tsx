"use client";

import Link from "next/link";
import { buttonClasses, type ButtonVariant } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/admin/icon";

export type MobileMenuLink = { label: string; href: string; active?: boolean };
export type MobileMenuAction = { label: string; href: string; variant: ButtonVariant };

export function MobileMenu({
  id,
  brand,
  homeHref,
  links,
  actions,
  onClose,
}: {
  id: string;
  brand: string;
  homeHref: string;
  links: MobileMenuLink[];
  actions: MobileMenuAction[];
  onClose: () => void;
}) {
  return (
    <div id={id} role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-powder lg:hidden">
      <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-8">
        <Link href={homeHref} onClick={onClose} className="truncate font-display text-4xl leading-none text-burnt">
          {brand}
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <Icon name="close" weight="medium" className="size-6" />
        </button>
      </div>

      <nav aria-label="Mobile" className="flex flex-1 flex-col gap-1 px-4 pt-6 sm:px-8">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={onClose}
            aria-current={link.active ? "page" : undefined}
            className={cn("rounded-lg px-3 py-3 text-lg/7 font-semibold hover:text-burnt-dark", link.active ? "text-burnt-dark" : "text-muted")}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-4 pb-8 pt-6 sm:px-8">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} onClick={onClose} className={buttonClasses({ variant: action.variant, size: "cta", className: "w-full justify-center text-center" })}>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
