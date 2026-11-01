"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { landingLinks, navLinks } from "./links";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>(navLinks[0].id);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);

      const offset = window.innerHeight * 0.35;
      let current: string = navLinks[0].id;
      for (const { id } of navLinks) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) current = id;
      }
      setActive(current);
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

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-powder transition-shadow duration-300",
        scrolled && "shadow-[0_2px_12px_rgb(0_0_0/0.08)]"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1440px] items-center justify-between px-4 transition-[height] duration-300 sm:px-8 lg:px-[81px]",
          scrolled ? "h-16 lg:h-[88px]" : "h-20 lg:h-[120px]"
        )}
      >
        <Link
          href={landingLinks.home}
          className="px-2 font-display text-4xl leading-[normal] text-burnt lg:px-[23px] lg:text-[40px]"
        >
          Fides
        </Link>

        <div className="hidden items-center gap-[59px] lg:flex">
          <nav aria-label="Primary" className="flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={link.id === active ? "location" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-t px-4 pt-2 text-base/6 font-semibold transition-colors",
                  link.id === active ? "text-burnt-dark" : "text-muted hover:text-burnt-dark"
                )}
              >
                {link.label}
                <span aria-hidden className="relative mt-2 h-[3px] w-full">
                  <span className="absolute inset-x-0 bottom-0 h-px bg-line" />
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[3px] origin-center rounded-sm bg-burnt-dark transition-transform duration-300 ease-out",
                      link.id === active ? "scale-x-100" : "scale-x-0"
                    )}
                  />
                </span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <Link
              href={landingLinks.contact}
              className={buttonClasses({ variant: "brand-outline", size: "cta" })}
            >
              Contact Us
            </Link>
            <Link
              href={landingLinks.signup}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              Sign up
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
          <span className="h-0.5 w-6 rounded bg-current" />
          <span className="h-0.5 w-6 rounded bg-current" />
          <span className="h-0.5 w-6 rounded bg-current" />
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full border-t border-line bg-powder px-4 pb-6 pt-2 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.15)] sm:px-8 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "py-3 text-base/6 font-semibold hover:text-burnt-dark",
                  link.id === active ? "text-burnt-dark" : "text-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex gap-3">
            <Link
              href={landingLinks.contact}
              onClick={() => setOpen(false)}
              className={buttonClasses({ variant: "brand-outline", size: "cta" })}
            >
              Contact Us
            </Link>
            <Link
              href={landingLinks.signup}
              onClick={() => setOpen(false)}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
