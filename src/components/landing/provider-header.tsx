"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu";

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
];

export interface ProviderHeaderProps {
  tenantName?: string;
  tenantSlug?: string;
  contactHref?: string;
  bookHref?: string;
}

export function ProviderHeader({
  tenantName = "Bella Vita",
  tenantSlug,
  contactHref = "/contact",
  bookHref = "/services",
}: ProviderHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousBody = document.body.style.overflow;
    const previousRoot = root.style.overflow;
    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = () => desktop.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = previousBody;
      root.style.overflow = previousRoot;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onChange);
    };
  }, [open]);

  const resolveHref = (href: string) => {
    if (!tenantSlug) return href;
    return href === "/" ? `/${tenantSlug}` : `/${tenantSlug}${href}`;
  };

  const isLinkActive = (href: string) => {
    const resolved = resolveHref(href);
    // Matches exact Next.js route path or tenant-prefixed path
    return pathname === href || pathname === resolved;
  };

  const resolvedContactHref = resolveHref(contactHref);
  const resolvedBookHref = resolveHref(bookHref);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 bg-powder transition-shadow duration-300 lg:h-[88px]",
        scrolled && "shadow-header"
      )}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-[81px]">
        <Link
          href={resolveHref("/")}
          className="font-display text-4xl leading-none text-burnt lg:text-[40px]"
        >
          {tenantName}
        </Link>

        <div className="hidden items-center gap-10 lg:flex">
          <nav aria-label="Primary" className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={resolveHref(link.href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 text-base/6 font-semibold transition-colors",
                    active ? "text-burnt-dark" : "text-muted hover:text-burnt-dark"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-[3px] origin-center rounded-sm bg-burnt-dark transition-transform duration-300 ease-out",
                      active ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href={resolvedContactHref}
              className={buttonClasses({ variant: "brand-outline", size: "cta" })}
            >
              Contact Us
            </Link>
            <Link
              href={resolvedBookHref}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              Book Now
            </Link>
          </div>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="flex size-11 flex-col items-center justify-center gap-1.5 rounded-lg text-burnt lg:hidden"
        >
          <span
            className={cn(
              "h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none",
              open && "translate-y-2 rotate-45"
            )}
          />
          <span
            className={cn(
              "h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none",
              open && "opacity-0"
            )}
          />
          <span
            className={cn(
              "h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none",
              open && "-translate-y-2 -rotate-45"
            )}
          />
        </button>
      </div>

      {open && (
        <MobileMenu
          id="mobile-menu"
          brand={tenantName}
          homeHref={resolveHref("/")}
          links={navLinks.map((link) => ({ label: link.label, href: resolveHref(link.href), active: isLinkActive(link.href) }))}
          actions={[
            { label: "Contact Us", href: resolvedContactHref, variant: "brand-outline" },
            { label: "Book Now", href: resolvedBookHref, variant: "brand" },
          ]}
          onClose={() => setOpen(false)}
        />
      )}
    </header>
  );
}

export default ProviderHeader;
