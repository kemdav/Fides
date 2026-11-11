import Link from "next/link";
import { cn } from "@/lib/utils";

export interface StorefrontFooterProps {
  /** Business display name. */
  businessName: string;
  /** Footer surface color. */
  background?: "powder" | "white";
  navLinks?: { label: string; href: string }[];
  activeHref?: string;
  contactHref?: string;
  bookHref?: string;
}

const navigationLinks = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
];

export function StorefrontFooter({
  businessName,
  background = "powder",
  navLinks = navigationLinks,
  activeHref,
  contactHref = "#contact",
  bookHref = "#book",
}: StorefrontFooterProps) {
  const contactLinks = [
    { label: "Contact Us", href: contactHref },
    { label: "Book Now", href: bookHref },
  ];

  return (
    <footer
      className={cn(
        "border-t border-line",
        background === "white" ? "bg-white" : "bg-powder"
      )}
    >
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-[90px] lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <Link
              href={navLinks[0]?.href ?? "#home"}
              className="font-display text-2xl leading-[normal] text-burnt"
            >
              {businessName}
            </Link>
            <p className="text-sm text-muted">
              © {businessName}. All rights reserved.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 sm:gap-16">
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink">Navigation</h3>
              <ul className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-sm transition-colors hover:text-burnt-dark",
                        activeHref === link.href
                          ? "font-semibold text-burnt-dark"
                          : "text-muted"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink">Contact</h3>
              <ul className="flex flex-col gap-2">
                {contactLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-sm transition-colors hover:text-burnt-dark",
                        activeHref === link.href
                          ? "font-semibold text-burnt-dark"
                          : "text-muted"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
