import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { landingLinks } from "./links";
import { Reveal } from "./reveal";

export function Cta() {
  return (
    <section className="overflow-hidden bg-powder px-4 pb-12 pt-6 sm:px-8 lg:pb-[100px] lg:pl-[138px] lg:pr-[120px] lg:pt-[50px]">
      <div className="mx-auto flex max-w-[1182px] flex-col items-center gap-10 lg:flex-row lg:justify-between">
        <Reveal from="left" className="flex w-full max-w-[588px] flex-col items-start gap-[15px] text-ink">
          <h2 className="font-display text-3xl leading-[normal] sm:text-5xl lg:text-[56px]">
            Ready to <span className="text-burnt">Make Your Business Easier</span>?
          </h2>
          <p className="text-base/6 font-light sm:text-xl/7">
            Bring your bookings and daily operations together with Fides.
          </p>
          <Link
            href={landingLinks.signup}
            className={buttonClasses({ variant: "brand", size: "cta", className: "mt-6" })}
          >
            Create an Account
          </Link>
        </Reveal>

        <Reveal from="right" delay={150} className="w-full max-w-[433.75px] shrink-0">
          <div className="relative aspect-[433.75/508.7] w-full -scale-x-100">
            <div className="float-slow absolute -inset-x-[0.92%] -inset-y-[0.79%]">
              <Image src="/images/landing/fox-cta.svg" alt="" fill aria-hidden />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
