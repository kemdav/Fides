"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu";
import { landingLinks, navLinks } from "./links";

const actions = [
  { label: "Contact Us", href: landingLinks.contact, variant: "brand-outline" },
  { label: "Get Started", href: landingLinks.getStarted, variant: "brand" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>(navLinks[0].id);

  const onHome = usePathname() === "/";

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      if (!onHome) return setActive("");

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
  }, [onHome]);

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
    <header className={cn("sticky top-0 z-50 h-16 bg-powder transition-shadow duration-300 lg:h-[88px]", scrolled && "shadow-[0_2px_12px_rgb(0_0_0/0.08)]")}>
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-[81px]">
        <Link href={landingLinks.home} onClick={() => setOpen(false)} className="font-display text-4xl leading-none text-burnt lg:text-[40px]">
          Fides
        </Link>

        <div className="hidden items-center gap-10 lg:flex">
          <nav aria-label="Primary" className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                aria-current={link.id === active ? "location" : undefined}
                className={cn(
                  "relative px-4 py-2 text-base/6 font-semibold transition-colors",
                  link.id === active ? "text-burnt-dark" : "text-muted hover:text-burnt-dark"
                )}
              >
                {link.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-4 -bottom-0.5 h-[3px] origin-center rounded-sm bg-burnt-dark transition-transform duration-300 ease-out",
                    link.id === active ? "scale-x-100" : "scale-x-0"
                  )}
                />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {actions.map((action) => (
              <Link key={action.label} href={action.href} className={buttonClasses({ variant: action.variant, size: "cta" })}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="flex size-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg text-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 lg:hidden"
        >
          <span className={cn("h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none", open && "translate-y-2 rotate-45")} />
          <span className={cn("h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none", open && "opacity-0")} />
          <span className={cn("h-0.5 w-6 rounded bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none", open && "-translate-y-2 -rotate-45")} />
        </button>
      </div>

      {open && (
        <MobileMenu
          id="mobile-menu"
          brand="Fides"
          homeHref={landingLinks.home}
          links={navLinks.map((link) => ({ label: link.label, href: link.href, active: link.id === active }))}
          actions={[...actions]}
          onClose={() => setOpen(false)}
        />
      )}
    </header>
  );
}
