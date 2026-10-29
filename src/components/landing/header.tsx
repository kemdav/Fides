"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { landingLinks, navLinks } from "./links";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-powder">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:h-[120px] lg:px-[81px]">
        <Link
          href={landingLinks.home}
          className="px-2 font-display text-4xl leading-[normal] text-burnt lg:px-[23px] lg:text-[40px]"
        >
          Fides
        </Link>

        <div className="hidden items-center gap-[59px] lg:flex">
          <nav aria-label="Primary" className="flex items-center gap-5">
            {navLinks.map((link, index) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={index === 0 ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-t px-4 pt-2 text-base/6 font-semibold",
                  index === 0 ? "text-burnt-dark" : "text-muted hover:text-burnt-dark"
                )}
              >
                {link.label}
                <span
                  aria-hidden
                  className={cn(
                    "mt-2 w-full rounded-sm",
                    index === 0 ? "h-[3px] bg-burnt-dark" : "h-px bg-line"
                  )}
                />
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
              href={landingLinks.login}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              Log in
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
        <div id="mobile-menu" className="border-t border-line px-4 pb-6 pt-2 sm:px-8 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base/6 font-semibold text-muted hover:text-burnt-dark"
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
              href={landingLinks.login}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
