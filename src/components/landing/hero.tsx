import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { landingLinks } from "./links";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-powder">
      <Image
        src="/images/landing/hero-pattern.svg"
        alt=""
        fill
        priority
        aria-hidden
        className="object-cover"
      />
      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-4 py-12 sm:px-8 lg:h-[674px] lg:flex-row lg:items-start lg:gap-[102px] lg:px-[120px] lg:py-[86px]">
        <div className="flex w-full flex-col gap-[15px] lg:w-[595px] lg:shrink-0 lg:pb-5 lg:pt-[100px]">
          <h1 className="font-display text-4xl leading-[normal] text-black sm:text-5xl lg:text-[56px]">
            A Smarter Way to <span className="text-burnt">Manage</span> and{" "}
            <span className="text-burnt">Grow</span>{" "}
            <span className="text-ink">Your Business</span>
          </h1>
          <p className="max-w-[467px] text-xl/7 font-light text-black">
            Give customers an easy way to discover and book your services.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 py-[25px]">
            <Link
              href={landingLinks.getStarted}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              Get Started
            </Link>
            <Link
              href={landingLinks.bookDemo}
              className={buttonClasses({ variant: "brand-outline", size: "cta" })}
            >
              Book a Demo
            </Link>
          </div>
        </div>

        <div className="relative aspect-[466/508.7] w-full max-w-[466px] shrink-0 lg:w-[466px]">
          <div className="absolute -inset-x-[0.86%] -inset-y-[0.79%]">
            <Image
              src="/images/landing/fox-hero.svg"
              alt="Fides fox mascot waving"
              fill
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
