import Image from "next/image";
import Link from "next/link";
import { buttonClasses, CheckIcon, type CheckIconTone } from "@/components/ui";
import { cn } from "@/lib/utils";

export type Plan = {
  name: string;
  price: string;
  billed: string;
  description: string;
  includes?: string;
  features: string[];
  cta: string;
  href: string;
  background: string;
  divider: string;
  icon: string;
  checkTone: CheckIconTone;
  featured?: boolean;
};

export function PlanCard({ plan }: { plan: Plan }) {
  const { featured } = plan;

  const card = (
    <article
      className={cn(
        "group relative flex w-full max-w-[391px] flex-col px-[35px] pb-[51px] pt-10 xl:min-h-[927px]",
        featured
          ? "text-white"
          : "text-ink transition-[translate] duration-500 ease-out hover:-translate-y-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      )}
    >
      <Image
        src={plan.background}
        alt=""
        fill
        aria-hidden
        className={cn(
          !featured &&
            "drop-shadow-[0_3px_2px_rgb(9_16_29/0.24)]"
        )}
      />

      <header className="relative flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[10px] border",
            featured ? "border-mist" : "border-burnt/60"
          )}
        >
          <Image src={plan.icon} alt="" width={20} height={20} aria-hidden />
        </span>
        <h3 className="text-2xl/7 font-semibold">{plan.name}</h3>
      </header>

      {featured && (
        <span className="absolute right-[9px] top-[53px] -translate-y-1/2 text-base/6 font-semibold text-info">
          Most Popular
        </span>
      )}

      <div className="relative mt-[38px] flex items-center gap-5 font-semibold">
        <p className="text-[44px]/12">{plan.price}</p>
        <div className="text-base/6">
          <p>/month (Php)</p>
          <p>{plan.billed}</p>
        </div>
      </div>

      <p className="relative mt-[13px] min-h-[63px] pr-4 text-sm/normal">{plan.description}</p>

      <Image
        src={plan.divider}
        alt=""
        width={391}
        height={1}
        aria-hidden
        className="relative -mx-[35px] mt-9 h-px w-[calc(100%+70px)] max-w-none"
      />

      {plan.includes && (
        <p className="relative mt-3 text-sm/5 font-semibold italic">{plan.includes}</p>
      )}

      <ul
        className={cn(
          "relative -mr-6 flex flex-col gap-4",
          plan.includes ? "mt-[22px]" : "mt-[34px]"
        )}
      >
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm/normal">
            <CheckIcon tone={plan.checkTone} />
            {feature}
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex justify-center pt-8">
        <Link href={plan.href} className={buttonClasses({ variant: "accent", size: "pill" })}>
          {plan.cta}
        </Link>
      </div>
    </article>
  );

  if (!featured) return card;

  return (
    <div className="w-full max-w-[422px] rounded-[30px] bg-sky py-[15px] pl-[14px] drop-shadow-[0_3px_2px_rgb(9_16_29/0.24)]">
      {card}
    </div>
  );
}
