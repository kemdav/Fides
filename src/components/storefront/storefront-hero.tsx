import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export interface StorefrontHeroProps {
  /** Main heading text. */
  heading: string;
  /** Supporting paragraph below the heading. */
  subtitle: string;
  /** CTA button label. */
  ctaLabel: string;
  /** CTA button href. */
  ctaHref: string;
  /** Hero image path (public folder). */
  imageSrc: string;
  /** Hero image alt text. */
  imageAlt: string;
}

export function StorefrontHero({
  heading,
  subtitle,
  ctaLabel,
  ctaHref,
  imageSrc,
  imageAlt,
}: StorefrontHeroProps) {
  return (
    <section id="home" className="bg-powder">
      <div className="mx-auto flex max-w-[1440px] flex-col-reverse items-center gap-8 px-4 py-12 sm:px-8 md:py-16 lg:flex-row lg:gap-16 lg:px-20 lg:py-24">
        {/* Text content */}
        <div className="flex w-full flex-col gap-4 lg:w-1/2">
          <h1 className="font-display text-3xl leading-[1.15] text-ink sm:text-4xl lg:text-[48px]">
            {heading}
          </h1>
          <p className="max-w-[440px] text-sm/6 text-muted sm:text-base/7">
            {subtitle}
          </p>
          <div className="pt-4">
            <Link
              href={ctaHref}
              className={buttonClasses({ variant: "brand", size: "cta" })}
            >
              {ctaLabel}
            </Link>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-2xl lg:w-1/2">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}

