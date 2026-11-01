import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { FoxCtaMascot } from "./fox-cta-mascot";
import { landingLinks } from "./links";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Cta() {
  return (
    <section className="overflow-hidden bg-powder px-4 py-12 text-ink sm:px-8 lg:px-[78px] lg:py-[100px]">
      <div className="mx-auto flex max-w-[1286px] flex-col items-center gap-10 lg:flex-row lg:justify-between lg:gap-16">
        <Reveal from="left" className="w-full max-w-[588px]">
          <SectionHeading
            align="left"
            title={
              <>
                Ready to <span className="text-burnt">Make Your Business Easier</span>?
              </>
            }
          >
            Bring your bookings and daily operations together with Fides.
          </SectionHeading>
          <Link
            href={landingLinks.signup}
            className={buttonClasses({ variant: "brand", size: "cta", className: "mt-8 lg:mt-10" })}
          >
            Create an Account
          </Link>
        </Reveal>

        <Reveal from="bounce" className="w-full max-w-[433.75px] shrink-0">
          <div className="relative aspect-[433.75/508.7] w-full -scale-x-100">
            <div className="absolute -inset-x-[0.92%] -inset-y-[0.79%]">
              <FoxCtaMascot className="size-full overflow-visible" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
