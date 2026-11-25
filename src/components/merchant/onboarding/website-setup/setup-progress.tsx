import { STEP_LABELS, type SetupStep } from "./setup-data";

export function SetupProgress({ step, completed }: { step: SetupStep; completed: number }) {
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs font-semibold">
          <span className="text-ink">{STEP_LABELS[step]}</span>
          <span className="text-muted">{step === 0 ? "Getting started" : `Step ${step} of 6`}</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5" role="progressbar" aria-label="Current setup step" aria-valuemin={0} aria-valuemax={6} aria-valuenow={step}>
          {STEP_LABELS.slice(1).map((label, index) => (
            <span key={label} className={`h-1.5 rounded-full ${index + 1 <= step ? "bg-burnt" : "bg-line"}`} />
          ))}
        </div>
      </div>
      <div className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-burnt) ${completed / 6 * 100}%, var(--color-line) 0)` }}>
        <span className="grid size-8 place-items-center rounded-full bg-white text-[10px] font-semibold text-body" aria-label={`${completed} of 6 steps completed`}>{completed}/6</span>
      </div>
    </div>
  );
}
