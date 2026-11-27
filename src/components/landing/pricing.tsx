import type { PublicPlan } from "@/lib/plans/catalog";
import { cn } from "@/lib/utils";
import { PlanCard } from "./plan-card";
import { toPlanCards } from "./pricing-plans";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Pricing({ plans }: { plans: readonly PublicPlan[] }) {
  const cards = toPlanCards(plans);

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

        <div
          className={cn(
            "mt-10 flex flex-col items-center gap-10 text-left sm:mt-[83px] xl:flex-row xl:items-start xl:gap-10",
            cards.length > 3 ? "xl:flex-wrap xl:justify-center" : "xl:justify-between"
          )}
        >
          {cards.map((plan, index) => (
            <Reveal
              key={plan.code}
              from="up"
              delay={index * 140}
              className={cn("w-full", plan.featured ? "max-w-[422px]" : "max-w-[392px] xl:mt-[83px]")}
            >
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
