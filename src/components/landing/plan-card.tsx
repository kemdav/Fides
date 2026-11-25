import Image from "next/image";
import Link from "next/link";
import { buttonClasses, CheckIcon, type CheckIconTone } from "@/components/ui";
import { cn } from "@/lib/utils";

const planBadgeColors = "bg-powder text-info";

export type Plan = {
  name: string;
  price: string;
  billed: string;
  description: string;
  includes?: string;
  features: readonly string[];
  cta: string;
  href: string;
  background: string;
  divider: string;
  icon: string;
  filledIcon?: string;
  checkTone: CheckIconTone;
  featured?: boolean;
};

export function PlanCard({
  plan,
  selection,
}: {
  plan: Plan;
  selection?: { selected: boolean; onSelect: () => void };
}) {
  const { featured } = plan;
  const selected = selection?.selected;
  const selectionClasses = selection && cn(
    "relative isolate min-w-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-10 has-[:focus-visible]:outline-burnt",
    selected && "before:pointer-events-none before:absolute before:-inset-2 before:-z-10 before:rounded-[34px] before:bg-sky before:shadow-lg before:shadow-ink/25",
  );

  const card = (
    <article
      className={cn(
        "group relative flex w-full max-w-[391px] flex-col",
        selection ? "h-full rounded-[24px] px-4 pb-6 pt-5 sm:px-5" : "px-[35px] pb-[51px] pt-10 xl:min-h-[927px]",
        selectionClasses,
        featured
          ? "text-white"
          : !selection && "text-ink transition-[translate] duration-500 ease-out hover:-translate-y-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      )}
    >
      {selection && (
        <input
          type="radio"
          name="registration-plan"
          value={plan.name}
          aria-label={plan.name}
          checked={selection.selected}
          onChange={selection.onSelect}
          className="absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
        />
      )}
      <Image
        src={plan.background}
        alt=""
        fill
        aria-hidden
        className={cn(!featured && "drop-shadow-[0_3px_2px_rgb(9_16_29/0.24)]")}
      />

      <header className={cn("relative flex items-center", selection ? "gap-2" : "gap-2.5")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[10px] border",
            selection ? "size-8" : "size-10",
            featured ? "border-mist" : "border-burnt/60",
            selected && (featured ? "bg-powder/20" : "bg-powder"),
          )}
        >
          <Image src={selected ? plan.filledIcon ?? plan.icon : plan.icon} alt="" width={20} height={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className={cn("font-semibold", selection ? "text-lg/6" : "text-2xl/7")}>{plan.name}</h3>
          {featured && selection && (
            <span className={cn("mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs/4 font-semibold", planBadgeColors)}>
              Most Popular
            </span>
          )}
        </div>
      </header>

      {featured && !selection && (
        <span className="absolute right-[9px] top-[53px] -translate-y-1/2 text-base/6 font-semibold text-info">
          Most Popular
        </span>
      )}

      <div className={cn("relative flex items-center font-semibold", selection ? "mt-6 flex-wrap gap-x-3 gap-y-1" : "mt-[38px] gap-5")}>
        <p className={selection ? "text-3xl/9" : "text-[44px]/12"}>{plan.price}</p>
        <div className={selection ? "text-sm/5" : "text-base/6"}>
          <p>/month (Php)</p>
          <p>{plan.billed}</p>
        </div>
      </div>

      <p className={cn("relative mt-[13px] text-sm/normal", !selection && "min-h-[63px] pr-4")}>{plan.description}</p>

      <Image
        src={plan.divider}
        alt=""
        width={391}
        height={1}
        aria-hidden
        className={cn("relative h-px max-w-none", selection ? "-mx-4 mt-5 w-[calc(100%+32px)] sm:-mx-5 sm:w-[calc(100%+40px)]" : "-mx-[35px] mt-9 w-[calc(100%+70px)]")}
      />

      {plan.includes && (
        <p className="relative mt-3 text-sm/5 font-semibold italic">{plan.includes}</p>
      )}

      <ul
        className={cn(
          "relative flex flex-col",
          selection ? "mt-4 gap-3" : cn("-mr-6 gap-4", plan.includes ? "mt-[22px]" : "mt-[34px]")
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
        {selection ? (
          <span className={selected
            ? cn("inline-flex w-full items-center justify-center rounded-[32px] px-[18px] py-[14px] text-lg/7 font-semibold", planBadgeColors)
            : buttonClasses({ variant: "accent", size: "pill", className: "w-full" })}>
            {selected ? "Selected" : "Choose plan"}
          </span>
        ) : (
          <Link href={plan.href} className={buttonClasses({ variant: "accent", size: "pill" })}>
            {plan.cta}
          </Link>
        )}
      </div>
    </article>
  );

  if (!featured || selection) return card;

  return (
    <div className="w-full max-w-[422px] rounded-[30px] bg-sky py-[15px] pl-[14px] drop-shadow-[0_3px_2px_rgb(9_16_29/0.24)]">
      {card}
    </div>
  );
}
