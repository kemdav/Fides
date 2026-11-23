import Image from "next/image";
import { CheckIcon } from "@/components/ui";
import { formatPeso, PLAN_OPTIONS, TRIAL_DAYS } from "@/lib/registration/options";
import { cn } from "@/lib/utils";

const planBackgrounds: Record<string, string> = {
  starter: "/images/landing/plan-starter-bg.svg",
  professional: "/images/landing/plan-pro-bg.svg",
  business: "/images/landing/plan-business-bg.svg",
};

const checkTones = { starter: "success", professional: "powder", business: "deep" } as const;

export function PlanCardGrid({ selectedCode, onSelect }: { selectedCode: string; onSelect: (code: string) => void }) {
  return (
      <div role="group" aria-label="Subscription package" className="mx-auto flex max-w-[420px] flex-col items-stretch gap-6 xl:max-w-none xl:flex-row xl:items-stretch xl:gap-5">
        {PLAN_OPTIONS.map((plan) => {
          const selected = selectedCode === plan.code;
          const featured = plan.code === "professional";
          return (
            <button
              key={plan.code}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(plan.code)}
              className={cn(
                "relative flex flex-1 flex-col rounded-[30px] p-[14px] text-left transition-[transform,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burnt/40",
                featured ? "bg-sky" : "bg-transparent",
                selected ? "-translate-y-1 shadow-[0_14px_30px_-12px_rgb(9_16_29/0.45)] ring-4 ring-burnt" : "hover:-translate-y-1"
              )}
            >
              <span className={cn("relative flex h-full flex-col px-7 pb-8 pt-8", featured ? "text-white" : "text-ink")}>
                <Image src={planBackgrounds[plan.code]} alt="" fill aria-hidden className="rounded-[24px]" />
                <span className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-xl font-semibold xl:text-2xl">{plan.name}</span>
                  {featured ? <span className="-mr-7 shrink-0 whitespace-nowrap text-xs font-semibold text-info xl:text-sm">Most Popular</span> : null}
                </span>
                <span className="relative mt-5 flex flex-wrap items-end gap-x-3 gap-y-1 font-semibold">
                  <span className="text-[30px] leading-10 xl:text-[34px]">{formatPeso(plan.price)}</span>
                  <span className="whitespace-nowrap pb-1 text-xs leading-5 xl:text-sm">
                    /month (Php)
                    <br />
                    Billed monthly
                  </span>
                </span>
                <span className="relative mt-3 min-h-[84px] text-sm">{plan.description}</span>
                <span aria-hidden className={cn("relative mt-5 block border-t border-dashed", featured ? "border-white/60" : "border-ink/30")} />
                {plan.includes ? <span className="relative mt-4 text-xs font-semibold italic">{plan.includes}</span> : null}
                <span className="relative mt-4 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <span key={feature} className="flex items-center gap-3 text-sm">
                      <CheckIcon tone={checkTones[plan.code]} className="size-5" />
                      {feature}
                    </span>
                  ))}
                </span>
                <span
                  className={cn(
                    "relative mt-auto inline-flex items-center justify-center self-stretch rounded-[32px] px-4 py-3 text-sm font-semibold",
                    selected ? "bg-ink text-white" : "bg-sky text-ink",
                    "mt-8"
                  )}
                >
                  {selected ? "Selected" : "Choose plan"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
  );
}

export function PlanComparisonRow({ feature, availability }: { feature: string; availability: readonly boolean[] }) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="px-2 py-2 text-left font-medium">{feature}</th>
      {PLAN_OPTIONS.map((plan, index) => (
        <td key={plan.code} className="px-2 py-2 text-center">{availability[index] ? "Yes" : "No"}</td>
      ))}
    </tr>
  );
}

export function SelectedPlanSummary({ code }: { code: string }) {
  const plan = PLAN_OPTIONS.find((option) => option.code === code);
  if (!plan) return null;
  return (
    <>
      <PlanSummaryRow label="Plan" value={<span className="font-semibold text-burnt">{plan.name}</span>} />
      <PlanSummaryRow label="Price" value={`${formatPeso(plan.price)} / month`} />
      <PlanSummaryRow label="Billing Cycle" value="Monthly" />
      <p className="flex items-center gap-2 rounded-lg bg-[#faece3] px-3 py-2.5 text-xs text-burnt">
        <CheckIcon tone="success" className="size-4" />
        {TRIAL_DAYS}-day free trial included — no charge until trial ends
      </p>
    </>
  );
}

function PlanSummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 text-sm">
      <span className="text-subtle">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
