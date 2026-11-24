import { PlanCard } from "./plan-card";
import { plans } from "./pricing-plans";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Pricing() {
  const [starter, professional, business] = plans;

  return (
    <section
      id="pricing"
      className="scroll-mt-16 bg-burnt/10 px-4 py-12 text-ink sm:px-8 lg:scroll-mt-[88px] lg:px-[78px] lg:py-[100px]"
    >
      <div className="mx-auto max-w-[1286px]">
        <SectionHeading reveal title="Find the Right Plan for Your Business">
          Whether you&apos;re just starting out or growing your business, Fides has a
          plan to support your next step.
        </SectionHeading>

        <div className="mt-10 flex flex-col items-center gap-10 text-left sm:mt-[83px] xl:flex-row xl:items-start xl:justify-between xl:gap-10">
          <Reveal from="up" className="w-full max-w-[391px] xl:mt-[83px]">
            <PlanCard plan={starter} />
          </Reveal>
          <Reveal from="up" delay={140} className="w-full max-w-[422px]">
            <PlanCard plan={professional} />
          </Reveal>
          <Reveal from="up" delay={280} className="w-full max-w-[393px] xl:mt-[83px]">
            <PlanCard plan={business} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
