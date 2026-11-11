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
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 md:py-20 lg:px-20 lg:py-28">
        <h2 className="font-display text-2xl leading-[normal] text-ink sm:text-3xl lg:text-[36px]">
          {heading}
        </h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-8">
          {services.slice(0, 3).map((service) => (
            <ServiceCard key={service.name} {...service} />
          ))}
        </div>

        <div className="mt-10 flex justify-center lg:mt-14">
          <Link
            href={viewAllHref}
            className={buttonClasses({ variant: "brand", size: "md" })}
          >
            View all services
          </Link>
        </div>
      </div>
    </section>
  );
}

