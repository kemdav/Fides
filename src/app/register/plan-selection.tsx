import { SummaryRow } from "./parts";
import { PlanCard } from "@/components/landing/plan-card";
import { plans } from "@/components/landing/pricing-plans";
import { formatPeso, PLAN_OPTIONS } from "@/lib/registration/options";

export function PlanCardGrid({ selectedCode, onSelect }: { selectedCode: string; onSelect: (code: string) => void }) {
  return (
    <div className="@container">
      <div role="group" aria-label="Subscription package" className="mx-auto grid max-w-[422px] gap-6 @min-[56rem]:max-w-none @min-[56rem]:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.code} plan={plan}
            selection={{ selected: selectedCode === plan.code, onSelect: () => onSelect(plan.code) }}
          />
        ))}
      </div>
    </div>
  );
}

export function SelectedPlanSummary({ code }: { code: string }) {
  const plan = PLAN_OPTIONS.find((option) => option.code === code);
  if (!plan) return null;
  return (
    <>
      <SummaryRow label="Plan" value={<span className="font-semibold text-burnt">{plan.name}</span>} />
      <SummaryRow label="Price" value={`${formatPeso(plan.price)} / month`} />
      <SummaryRow label="Billing Cycle" value="Monthly" />
    </>
  );
}
