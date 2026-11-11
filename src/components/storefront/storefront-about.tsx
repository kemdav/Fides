import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export interface StorefrontAboutProps {
  /** Business display name used in the heading. */
  businessName: string;
  /** About body text. */
  description: string;
  /** "Learn more" CTA href. */
  ctaHref: string;
  /** About section image path (public folder). */
  imageSrc: string;
  /** Image alt text. */
  imageAlt: string;
}

export function StorefrontAbout({
  businessName,
  description,
  ctaHref,
  imageSrc,
  imageAlt,
}: StorefrontAboutProps) {
  return (
    <section id="about" className="bg-mist">
      <div className="mx-auto flex max-w-[1440px] flex-col-reverse items-center gap-8 px-5 py-10 sm:px-8 md:py-14 lg:flex-row lg:gap-16 lg:px-[90px] lg:py-20">
        {/* Text */}
        <div className="flex w-full flex-col gap-4 lg:w-1/2">
          <h2 className="font-display text-3xl leading-[1.1] text-ink sm:text-[32px]">
            About {businessName}
          </h2>
          <p className="max-w-[560px] text-sm/6 text-muted sm:text-base/7">
            {description}
          </p>
          <div className="pt-2">
            <Link
              href={ctaHref}
              className={buttonClasses({
                variant: "brand-outline",
                size: "lg",
              })}
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Image */}
        <div className="relative aspect-[1.55/1] w-full max-w-[560px] overflow-hidden rounded-lg lg:w-1/2">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>
    </section>
  );
}
