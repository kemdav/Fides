import Link from "next/link";
import { landingLinks } from "./links";

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

export function Footer() {
  return (
    <footer id="contact" className="bg-burnt px-4 py-12 text-white sm:px-8 lg:px-20 lg:py-[50px]">
      <div className="mx-auto max-w-[1280px]">
        <div className="flex flex-col gap-10 border-b border-white pb-12 lg:flex-row lg:items-center lg:gap-[182px] lg:pb-[50px]">
          <p className="font-display text-[72px] leading-[normal] lg:w-[435px]">Fides</p>

          <div className="grid gap-8 sm:grid-cols-[218px_265px_auto]">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="font-display text-2xl leading-[normal]">{column.title}</h2>
                <ul className="mt-[23px] flex flex-col gap-2.5 text-xl/6">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xl/6">© 2026 Fides. All rights reserved.</p>
      </div>
    </footer>
  );
}
