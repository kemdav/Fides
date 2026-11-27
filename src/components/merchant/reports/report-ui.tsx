import { useCallback, useId, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "@/components/admin/icon";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, inputClasses } from "@/components/ui/input";
import { useOutsideClose } from "@/lib/use-outside-close";
import { cn } from "@/lib/utils";
import { DATE_PRESETS, presetRange, rangeLabel } from "./report-data";
import type { DateRange } from "./report-data";
import styles from "./reports.module.css";

export const fieldLabel = "mb-1.5 block text-xs font-semibold text-muted";
export const numeric = "text-right tabular-nums";

export function ReportCard({ title, description, children, className }: {
  title: string; description?: string; children: ReactNode; className?: string;
}): ReactElement {
  return (
    <Card className={cn("min-w-0 rounded-xl border-hairline p-4 shadow-card sm:p-6", className)}>
      <h2 className="text-lg leading-6 font-semibold text-body">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {children}
    </Card>
  );
}

export function ReportTable({ label, stack, children }: {
  label: string; stack?: boolean; children: ReactNode;
}): ReactElement {
  return (
    <table aria-label={label} className={cn(styles.table, stack && styles.stack, "w-full text-left text-sm text-body")}>
      {children}
    </table>
  );
}

export function FilterPopover({ label, value, filterIcon, active, placement = "end", children }: {
  label: string;
  value?: string;
  filterIcon?: boolean;
  active?: boolean;
  placement?: "start" | "end";
  children: (close: () => void) => ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const triggerId = `${id}-trigger`;
  useOutsideClose(open, useCallback(() => setOpen(false), []), wrapper);

  function close(): void {
    setOpen(false);
    document.getElementById(triggerId)?.focus();
  }

  return (
    <div
      ref={wrapper}
      className="relative min-w-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open && !event.defaultPrevented) {
          event.stopPropagation();
          close();
        }
      }}
    >
      {value && <span className={fieldLabel}>{label}</span>}
      <Button
        id={triggerId}
        variant="outline"
        className={cn("h-11 w-full justify-between rounded-lg border-hairline bg-white px-3.5 text-left text-body", (open || active) && "border-burnt")}
        aria-label={value ? `${label}, ${value}` : label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        {filterIcon && <Icon name="filter" className="size-4 text-glyph" />}
        <span className="min-w-0 flex-1 whitespace-normal">{value ?? label}</span>
        {active && <span className="size-1.5 shrink-0 rounded-full bg-burnt" role="img" aria-label="Filters applied" />}
        <Icon name="chevron-down" className={cn("size-3.5", open && "rotate-180")} />
      </Button>
      {open && (
        <div id={id} className={cn("absolute top-full z-50 mt-1 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-hairline bg-white p-3 shadow-popover", placement === "start" ? "start-0" : "end-0")}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function DateRangeFilter({ value, onChange, placement = "start" }: { value: DateRange; onChange: (range: DateRange) => void; placement?: "start" | "end" }): ReactElement {
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState(false);
  const errorId = useId();

  return (
    <FilterPopover label="Date range" value={rangeLabel(value)} placement={placement}>
      {(close) => (
        <div className="grid gap-1">
          {DATE_PRESETS.map((preset) => (
            <Button key={preset.id} variant="ghost" className="h-10 justify-start" onClick={() => {
              onChange(presetRange(preset.id));
              setCustom(false);
              close();
            }}>
              {preset.label}
            </Button>
          ))}
          <Button variant="ghost" className="h-10 justify-start text-burnt" aria-expanded={custom} onClick={() => {
            setCustom(!custom);
            setDraft(value);
            setError(false);
          }}>
            Custom range
          </Button>
          {custom && (
            <div className="grid gap-2 border-t border-hairline pt-3">
              <label className="min-w-0 text-xs font-semibold text-muted">
                Start date
                <Input unstyled className={cn(inputClasses(error), "mt-1 h-11")} type="date" value={draft.start} aria-invalid={error} aria-describedby={error ? errorId : undefined} onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
              </label>
              <label className="min-w-0 text-xs font-semibold text-muted">
                End date
                <Input unstyled className={cn(inputClasses(error), "mt-1 h-11")} type="date" value={draft.end} aria-invalid={error} aria-describedby={error ? errorId : undefined} onChange={(event) => setDraft({ ...draft, end: event.target.value })} />
              </label>
              {error && <p id={errorId} role="alert" className="text-xs text-danger-text">Enter both dates with the end date on or after the start date.</p>}
              <Button variant="brand" onClick={() => {
                if (!draft.start || !draft.end || draft.end < draft.start) {
                  setError(true);
                  return;
                }
                onChange(draft);
                setCustom(false);
                close();
              }}>
                Use date range
              </Button>
            </div>
          )}
        </div>
      )}
    </FilterPopover>
  );
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}): ReactElement {
  return (
    <div role="group" aria-label={label} className="inline-grid min-w-0 grid-cols-2 gap-1 rounded-lg bg-mist p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={buttonClasses({
            variant: value === option.value ? "brand" : "ghost",
            className: "h-auto min-h-10 px-2 py-1.5 text-center leading-5 whitespace-normal sm:px-4",
          })}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
