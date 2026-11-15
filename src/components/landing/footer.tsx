import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BackToTop } from "./back-to-top";
import { landingLinks } from "./links";
import { Reveal } from "./reveal";

const columns = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: landingLinks.home },
      { label: "About", href: landingLinks.about },
      { label: "Features", href: landingLinks.features },
      { label: "Pricing", href: landingLinks.pricing },
    ],
  },
  {
    title: "Get Started",
    links: [
      { label: "Create an Account", href: landingLinks.signup },
      { label: "Log in", href: landingLinks.login },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", href: landingLinks.contact },
      { label: "Help & Support", href: landingLinks.help },
    ],
  },
];

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function FooterLink({ href, children, strong }: { href: string; children: ReactNode; strong?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 text-lg/6 transition-[translate] sm:text-xl/6 duration-300 ease-out hover:translate-x-1",
        "motion-reduce:transition-none motion-reduce:hover:translate-x-0",
        strong && "rounded-full bg-white px-4 py-1.5 font-semibold text-burnt"
      )}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-sky transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
        />
      </span>
      <ArrowIcon className="size-4 -translate-x-2 opacity-0 transition-[opacity,translate] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none" />
    </Link>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-burnt text-white">
      <div className="relative px-4 pt-12 sm:px-8 lg:px-[78px] lg:pt-[100px]">
        <div className="mx-auto max-w-[1286px]">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
            <Reveal from="up" className="flex flex-col items-start gap-6">
              <p className="font-display text-[72px] leading-[normal]">Fides</p>
              <p className="max-w-[320px] text-xl/7 font-light">
                Give customers an easy way to discover and book your services.
              </p>
            </Reveal>

            <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:col-span-3 lg:gap-10">
              {columns.map((column, i) => (
                <Reveal key={column.title} from="up" delay={(i + 1) * 120}>
                  <h2 className="font-display text-2xl leading-[normal]">{column.title}</h2>
                  <span aria-hidden className="mt-3 block h-[3px] w-10 rounded-full bg-sky" />
                  <ul className="mt-6 flex flex-col gap-4">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <FooterLink href={link.href} strong={link.label === "Create an Account"}>{link.label}</FooterLink>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-6 border-t border-white/40 pt-8 sm:flex-row sm:items-center sm:justify-between lg:mt-[83px]">
            <p className="text-xl/6">© 2026 Fides. All rights reserved.</p>
            <BackToTop />
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none relative mt-10 h-[17vw] select-none overflow-hidden lg:mt-14 lg:h-[13vw]"
      >
        <p className="relative text-center font-display text-[24vw] leading-[0.8] text-white/15 lg:text-[19vw]">
          Fides
        </p>
      </div>
    </footer>
  );
}
