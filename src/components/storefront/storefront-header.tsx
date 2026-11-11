"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

export type StorefrontNav = { label: string; href: string };

export interface StorefrontHeaderProps {
  /** Tenant display name shown as the logo text. */
  businessName: string;
  /** Navigation links rendered in the header. */
  navLinks: StorefrontNav[];
  /** Currently-active nav href (used for underline indicator). */
  activeHref?: string;
}

export function StorefrontHeader({
  businessName,
  navLinks,
  activeHref,
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
        "sticky top-0 z-50 bg-powder transition-shadow duration-300",
        scrolled && "shadow-[0_2px_12px_rgb(0_0_0/0.08)]"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1200px] items-center justify-between px-5 transition-[height] duration-300 sm:px-8 lg:px-0",
          scrolled ? "h-14 lg:h-16" : "h-16 lg:h-20"
        )}
      >
        {/* Logo */}
        <Link
          href="#home"
          className="font-display text-2xl leading-[normal] text-burnt lg:text-3xl"
        >
          {businessName}
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-10 lg:flex">
          <nav aria-label="Primary" className="flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = activeHref === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center px-4 pb-1 pt-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "text-burnt-dark"
                      : "text-muted hover:text-burnt-dark"
                  )}
                >
                  {link.label}
                  <span aria-hidden className="relative mt-1.5 h-[3px] w-full">
                    <span className="absolute inset-x-0 bottom-0 h-px bg-line" />
                    <span
                      className={cn(
                        "absolute inset-x-0 bottom-0 h-[3px] origin-center rounded-sm bg-burnt-dark transition-transform duration-300 ease-out",
                        isActive ? "scale-x-100" : "scale-x-0"
                      )}
                    />
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="#contact"
              className={buttonClasses({
                variant: "brand-outline",
                size: "md",
              })}
            >
              Contact Us
            </Link>
            <Link
              href="#book"
              className={buttonClasses({ variant: "brand", size: "md" })}
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

      {/* Mobile menu */}
      {open && (
        <div
          id="storefront-mobile-menu"
          className="absolute inset-x-0 top-full rounded-b-2xl border border-burnt/30 bg-powder px-5 pb-6 pt-2 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.15)] sm:px-8 lg:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "py-3 text-base/6 font-semibold hover:text-burnt-dark",
                  activeHref === link.href
                    ? "text-burnt-dark"
                    : "text-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex gap-3">
            <Link
              href="#contact"
              onClick={() => setOpen(false)}
              className={buttonClasses({
                variant: "brand-outline",
                size: "md",
              })}
            >
              Contact Us
            </Link>
            <Link
              href="#book"
              onClick={() => setOpen(false)}
              className={buttonClasses({ variant: "brand", size: "md" })}
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
