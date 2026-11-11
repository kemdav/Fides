import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { ServiceCard, type ServiceCardData } from "./service-card";

export interface FeaturedServicesProps {
  /** Section heading. */
  heading?: string;
  /** Service cards to display (max 3 shown). */
  services: ServiceCardData[];
  /** "View all services" link href. */
  viewAllHref: string;
}

export function FeaturedServices({
  heading = "Featured Services",
  services,
  viewAllHref,
}: FeaturedServicesProps) {
  return (
    <section id="services" className="bg-white">
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 md:py-14 lg:px-[90px] lg:py-20">
        <h2 className="font-display text-3xl leading-[1.1] text-ink sm:text-[32px]">
          {heading}
        </h2>

        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-8">
          {services.slice(0, 3).map((service) => (
            <ServiceCard key={service.name} {...service} />
          ))}
        </div>

        <div className="mt-8 flex justify-center lg:mt-12">
          <Link
            href={viewAllHref}
            className={buttonClasses({ variant: "brand", size: "lg" })}
          >
            View all services
          </Link>
        </div>
      </div>
    </section>
  );
}

