import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { landingLinks } from "./links";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-powder">
      {/* grid fades out toward the bottom so it blends into the next section */}
      <div
        aria-hidden
        className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
      >
        {/* single layer: stacked copies at different scales read as doubled lines */}
        <div className="grid-inward absolute inset-0">
          <Image
            src="/images/landing/hero-pattern.svg"
            alt=""
            fill
            priority
            className="object-cover [filter:saturate(2.2)_brightness(0.82)]"
          />
        </div>
      </div>
      {/* tints the bottom edge into the next section's colour (burnt at 10%) */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-burnt/0 to-burnt/10"
      />
      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-4 py-12 sm:px-8 lg:min-h-[820px] lg:flex-row lg:gap-[102px] lg:px-[120px] lg:py-[86px]">
        <div className="flex w-full flex-col gap-[15px] lg:w-[595px] lg:shrink-0">
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
          {/* svg canvas carries 60px/30px of padding so the waving hand is never clipped */}
          <div className="absolute left-[-13.73%] top-[-6.68%] h-[107.47%] w-[114.59%]">
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
