import { PlanCard } from "@/components/landing/plan-card";
import { plans } from "@/components/landing/pricing-plans";
import { Icon } from "@/components/admin/icon";
import { formatPeso, PLAN_OPTIONS, TRIAL_DAYS } from "@/lib/registration/options";

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
      <PlanSummaryRow label="Plan" value={<span className="font-semibold text-burnt">{plan.name}</span>} />
      <PlanSummaryRow label="Price" value={`${formatPeso(plan.price)} / month`} />
      <PlanSummaryRow label="Billing Cycle" value="Monthly" />
      <p className="flex items-center gap-2 rounded-lg bg-[#faece3] px-3 py-2.5 text-sm text-burnt">
        <Icon name="check" weight="bold" className="size-4 text-success" />
        {TRIAL_DAYS}-day free trial included — no charge until trial ends
      </p>
    </>
  );
}

function PlanSummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 text-base">
      <span className="text-subtle">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
