import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { Footer } from "@/components/landing/footer";
import { FoxCtaMascot } from "@/components/landing/fox-cta-mascot";
import { Header } from "@/components/landing/header";
import { landingLinks } from "@/components/landing/links";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const questionMarks = [
  { className: "right-[6%] top-[-4%] text-5xl sm:text-6xl", delay: "0s", tilt: "12deg" },
  { className: "right-[30%] top-[-10%] text-3xl sm:text-4xl", delay: "1.1s", tilt: "-10deg" },
  { className: "right-[-2%] top-[14%] text-2xl sm:text-3xl", delay: "2.2s", tilt: "18deg" },
];

export default function NotFound() {
  return (
    <div className="bg-powder">
      <Header />
      <main className="flex min-h-[calc(100dvh-4rem-96px)] items-center overflow-hidden px-4 py-12 sm:px-8 lg:min-h-[calc(100dvh-88px-140px)] lg:px-[78px] lg:py-[72px]">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col-reverse items-center gap-10 lg:flex-row lg:justify-between lg:gap-16">
          <div className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center lg:items-start lg:text-left">
            <p className="font-display text-[96px] leading-none text-burnt sm:text-[140px]" aria-hidden>
              404
            </p>
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-5xl">
              We can&apos;t find that <span className="text-burnt">page</span>
            </h1>
            <p className="max-w-[460px] text-base/6 text-muted sm:text-xl/7">
              The link may be broken, or the page may have moved. Head back home to keep exploring Fides.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-start">
              <Link href={landingLinks.home} className={buttonClasses({ variant: "brand", size: "cta" })}>
                Back to home
              </Link>
              <Link href={landingLinks.contact} className={buttonClasses({ variant: "brand-outline", size: "cta" })}>
                Contact Us
              </Link>
            </div>
          </div>

          <div data-fox="confused" className="relative w-[220px] shrink-0 sm:w-[300px] lg:w-[400px]">
            <div className="relative aspect-[433.75/508.7] w-full -scale-x-100">
              <div className="absolute -inset-x-[0.92%] -inset-y-[0.79%]">
                <FoxCtaMascot className="size-full overflow-visible" />
              </div>
            </div>
            {questionMarks.map((mark) => (
              <span
                key={mark.className}
                aria-hidden
                className={`fox-qmark absolute font-display leading-none text-burnt ${mark.className}`}
                style={{ animationDelay: mark.delay, ["--tilt" as string]: mark.tilt }}
              >
                ?
              </span>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
