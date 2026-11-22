"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MobileMenu } from "@/components/landing/mobile-menu";

export type StorefrontNav = { label: string; href: string };

export interface StorefrontHeaderProps {
  /** Tenant display name shown as the logo text. */
  businessName: string;
  /** Navigation links rendered in the header. */
  navLinks: StorefrontNav[];
  /** Currently-active nav href (used for underline indicator). */
  activeHref?: string;
  contactHref?: string;
  homeHref?: string;
  bookHref?: string;
}

export function StorefrontHeader({
  businessName,
  navLinks,
  activeHref,
  contactHref = "#contact",
  homeHref = "#home",
  bookHref = "#book",
}: StorefrontHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevRoot = root.style.overflow;
    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.body.style.overflow = prevBody;
      root.style.overflow = prevRoot;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-16 bg-powder transition-shadow duration-300 lg:h-[88px]",
        scrolled && "shadow-[0_2px_12px_rgb(0_0_0/0.08)]"
      )}
    >
      <div className="relative mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-14">
        {/* Logo */}
        <Link
          href={homeHref}
          className="font-display text-2xl leading-[normal] text-burnt lg:text-4xl"
        >
          {businessName}
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-10 lg:flex">
          <nav
            aria-label="Primary"
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1"
          >
            {navLinks.map((link) => {
              const isActive = activeHref === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 text-base/6 font-semibold transition-colors",
                    isActive
                      ? "text-burnt-dark"
                      : "text-muted hover:text-burnt-dark"
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-[3px] origin-center rounded-sm bg-burnt-dark transition-transform duration-300 ease-out",
                      isActive ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={contactHref}
              className={buttonClasses({
                variant: "brand-outline",
                size: "lg",
              })}
            >
              Contact Us
            </Link>
            <Link
              href={bookHref}
              className={buttonClasses({ variant: "brand", size: "lg" })}
            >
              Book Now
            </Link>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="storefront-mobile-menu"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 flex-col items-center justify-center gap-1.5 rounded-lg text-burnt lg:hidden"
        >
          <span
            className={cn(
              "h-0.5 w-5 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out",
              open && "translate-y-2 rotate-45"
            )}
          />
          <span
            className={cn(
              "h-0.5 w-5 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out",
              open && "opacity-0"
            )}
          />
          <span
            className={cn(
              "h-0.5 w-5 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out",
              open && "-translate-y-2 -rotate-45"
            )}
          />
        </button>
      </div>

      {open && (
        <MobileMenu
          id="storefront-mobile-menu"
          brand={businessName}
          homeHref={homeHref}
          links={navLinks.map((link) => ({ label: link.label, href: link.href, active: activeHref === link.href }))}
          actions={[
            { label: "Contact Us", href: contactHref, variant: "brand-outline" },
            { label: "Book Now", href: bookHref, variant: "brand" },
          ]}
          onClose={() => setOpen(false)}
        />
      )}
    </header>
  );
}
