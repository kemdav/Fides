import * as React from "react";
import { Icon, type IconName } from "@/components/admin/icon";
import { cn } from "@/lib/utils";
import { STEP_LABELS, type SetupStep } from "./setup-data";

const stepIcons: readonly IconName[] = [
  "grid", "layers", "document", "book-settings", "qr-code", "search", "check",
];

export function SetupProgress({ step, completedSteps, onStep, disabled }: {
  step: SetupStep;
  completedSteps: readonly SetupStep[];
  onStep: (step: SetupStep) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const listId = React.useId();
  const total = STEP_LABELS.length - 1;

  return (
    <div className="space-y-3">
      <div className="flex min-h-7 items-center justify-between gap-2 text-xs">
        <p className="hidden font-semibold text-ink lg:block">Setup progress</p>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          className="flex items-center gap-2 rounded-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-burnt lg:hidden"
          onClick={() => setExpanded(!expanded)}
        >
          {STEP_LABELS[step]}
          <Icon name="chevron-down" className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
        <span className="shrink-0 text-muted">{completedSteps.length} of {total} complete</span>
      </div>
      <div
        role="progressbar"
        aria-label="Website setup progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completedSteps.length}
        className="h-1.5 overflow-hidden rounded-full bg-mist"
      >
        <div className="h-full rounded-full bg-burnt transition-[width]" style={{ width: `${completedSteps.length / total * 100}%` }} />
      </div>
      <ol id={listId} aria-label="Website setup steps" className={cn("space-y-1 lg:block lg:pt-3", !expanded && "hidden")}>
        {STEP_LABELS.map((label, index) => {
          const current = index === step;
          const complete = completedSteps.some((completedStep) => completedStep === index);

          return (
            <li key={label}>
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                disabled={disabled}
                onClick={() => {
                  if (current) return;
                  setExpanded(false);
                  onStep(index as SetupStep);
                }}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-burnt disabled:opacity-50",
                  current ? "bg-sky/40 font-semibold text-ink" : "text-body hover:bg-mist hover:text-ink",
                )}
              >
                <Icon name={stepIcons[index]} className={cn("size-4", current ? "text-burnt" : "text-glyph")} />
                <span className="min-w-0 flex-1">{label}</span>
                {complete && (
                  <>
                    <Icon name="check" weight="bold" className="size-3.5 text-success" />
                    <span className="sr-only">Complete</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
