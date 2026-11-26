"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { getManilaDateKey } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const months = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString("en-US", { month: "long" })
);
const yearsPerPage = 12;
const dayOffsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

export function calendarDateKey(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0")).join("-");
}

function localDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

type CalendarView =
  | { kind: "days" | "months" }
  | { kind: "years"; monthIndex: number; page: number; returnTo: "days" | "months" };

type CalendarPickerProps = {
  id: string;
  label?: string;
  panelLabel?: string;
  required?: boolean;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  locale?: string;
  showWeekdays?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function CalendarPicker({
  id, label, panelLabel = label || "Appointment date", required, value, onChange,
  min, max, locale = "en-US", showWeekdays = true, invalid, describedBy,
}: CalendarPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>({ kind: "days" });
  const [month, setMonth] = useState(() => new Date());
  const [focusedDate, setFocusedDate] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const today = getManilaDateKey();
  const dateAllowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const positionPanel = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 288), 360, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const placeAbove = below < 368 && above > below;
    const available = placeAbove ? above : below;
    setPanelStyle({
      position: "fixed",
      ...(available < 176 ? { top: 8 } : placeAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight: available < 176 ? window.innerHeight - 16 : available,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function followTrigger(event: Event) {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      positionPanel();
    }
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", followTrigger, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", followTrigger, true);
    };
  }, [open, positionPanel]);

  useEffect(() => {
    if (!open) return;
    const selector = view.kind === "days" ? '[data-calendar-day][tabindex="0"]' : "[data-calendar-heading]";
    panelRef.current?.querySelector<HTMLElement>(selector)?.focus();
  }, [open, view.kind]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function showDate(date: Date) {
    const iso = calendarDateKey(date);
    const bounded = min && iso < min ? min : max && iso > max ? max : iso;
    setMonth(localDate(bounded));
    setFocusedDate(bounded);
    return bounded;
  }

  function toggle() {
    if (open) return close();
    positionPanel();
    showDate(localDate(value || today));
    setView({ kind: "days" });
    setOpen(true);
  }

  function pickDate(iso: string) {
    onChange(iso);
    close();
  }

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const minDate = min ? localDate(min) : undefined;
  const maxDate = max ? localDate(max) : undefined;
  const minYear = minDate?.getFullYear();
  const maxYear = maxDate?.getFullYear();
  const caption = `${months[monthIndex]} ${year}`;
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  function monthBounds(targetYear: number) {
    return {
      lower: minDate && targetYear === minYear ? minDate.getMonth() : 0,
      upper: maxDate && targetYear === maxYear ? maxDate.getMonth() : 11,
    };
  }
  const { lower, upper } = monthBounds(year);
  const hasBoundedYears = minYear !== undefined && maxYear !== undefined;
  const visibleYears = view.kind === "years"
    ? hasBoundedYears
      ? Array.from({ length: maxYear - minYear + 1 }, (_, index) => maxYear - index)
      : Array.from({ length: yearsPerPage }, (_, index) => view.page + index)
        .filter((option) => (minYear === undefined || option >= minYear) && (maxYear === undefined || option <= maxYear))
    : [];
  const controlClasses = "grid size-10 shrink-0 place-items-center rounded-lg text-body hover:bg-mist focus-visible:outline-2 focus-visible:outline-burnt disabled:opacity-40 disabled:hover:bg-transparent";
  const choiceClasses = "min-h-11 rounded-lg px-1 text-sm text-body hover:bg-mist focus-visible:outline-2 focus-visible:outline-burnt disabled:opacity-40 disabled:hover:bg-transparent";
  const captionClasses = "rounded-md px-2 py-2 text-sm font-semibold text-ink hover:bg-burnt/10 hover:text-burnt-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burnt";
  const formattedDate = value && localDate(value).toLocaleDateString(locale, {
    month: locale === "en-GB" ? "short" : "long", day: "numeric", year: "numeric",
  });

  function chooseYearFor(selectedMonth: number, returnTo: "days" | "months") {
    setView({ kind: "years", monthIndex: selectedMonth, page: Math.floor(year / yearsPerPage) * yearsPerPage, returnTo });
  }

  return (
    <div
      onBlur={(event) => {
        if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
          {label}{required && <span className="text-burnt"> *</span>}
        </label>
      )}
      <button ref={triggerRef} id={id} type="button" aria-haspopup="dialog" aria-expanded={open}
        aria-label={[label || panelLabel, formattedDate].filter(Boolean).join(", ")} aria-controls={open ? panelId : undefined}
        aria-describedby={describedBy} data-invalid={invalid || undefined} onClick={toggle}
        className={cn(fieldOutlineClasses, "flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:border-burnt/60", open && "border-burnt", invalid && "border-danger")}>
        <span className={value ? "font-medium text-ink" : "text-muted"}>
          {formattedDate || "Select a date"}
        </span>
        <Icon name="calendar" className="size-5 text-glyph" />
      </button>
      {open && (
        <div ref={panelRef} id={panelId} role="dialog" aria-label={"Choose " + panelLabel.toLowerCase()}
          style={panelStyle} className="overscroll-contain overflow-y-auto rounded-xl border border-line bg-white p-3 shadow-xl">
          {view.kind === "days" ? (
            <div className="mb-3 flex items-center justify-between gap-1">
              <button type="button" aria-label="Previous month" disabled={year === minYear && monthIndex === lower}
                onClick={() => showDate(new Date(year, monthIndex - 1, 1))} className={controlClasses}>
                <Icon name="chevron-down" weight="bold" className="size-5 rotate-90" />
              </button>
              <div className="flex flex-wrap justify-center">
                <button type="button" aria-label={months[monthIndex] + ". Choose month"} className={captionClasses}
                  onClick={() => setView({ kind: "months" })}>
                  {months[monthIndex]}
                </button>
                <button type="button" aria-label={year + ". Choose year"} className={captionClasses}
                  onClick={() => chooseYearFor(monthIndex, "days")}>
                  {year}
                </button>
              </div>
              <button type="button" aria-label="Next month" disabled={year === maxYear && monthIndex === upper}
                onClick={() => showDate(new Date(year, monthIndex + 1, 1))} className={controlClasses}>
                <Icon name="chevron-down" weight="bold" className="size-5 -rotate-90" />
              </button>
            </div>
          ) : (
            <div className="mb-2 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
              <button type="button" aria-label={view.kind === "years" && view.returnTo === "months" ? "Back to months" : "Back to calendar"}
                onClick={() => setView({ kind: view.kind === "years" ? view.returnTo : "days" })}
                className={controlClasses}>
                <Icon name="arrow-left" className="size-5" />
              </button>
              <p tabIndex={-1} data-calendar-heading className="text-center text-sm font-semibold text-ink focus:outline-none">
                {view.kind === "years" ? "Choose year for " + months[view.monthIndex] : "Choose month"}
              </p>
            </div>
          )}

          {view.kind === "months" && (
            <div className="grid grid-cols-3 gap-1.5">
              {months.map((name, index) => (
                <button type="button" key={name} aria-pressed={monthIndex === index}
                  className={cn(choiceClasses, monthIndex === index && "bg-burnt/10 font-semibold text-burnt-dark")}
                  onClick={() => chooseYearFor(index, "months")}>
                  {name}
                </button>
              ))}
            </div>
          )}
          {view.kind === "years" && (
            <>
              {!hasBoundedYears && <div className="mb-2 flex items-center justify-between">
                <button type="button" aria-label="Earlier years" disabled={minYear !== undefined && view.page <= minYear}
                  onClick={() => setView({ ...view, page: view.page - yearsPerPage })} className={controlClasses}>
                  <Icon name="chevron-down" weight="bold" className="size-5 rotate-90" />
                </button>
                <span aria-live="polite" className="sr-only">{visibleYears[0]} &ndash; {visibleYears.at(-1)}</span>
                <button type="button" aria-label="Later years" disabled={maxYear !== undefined && view.page + yearsPerPage > maxYear}
                  onClick={() => setView({ ...view, page: view.page + yearsPerPage })} className={controlClasses}>
                  <Icon name="chevron-down" weight="bold" className="size-5 -rotate-90" />
                </button>
              </div>}
              <div className={cn("grid grid-cols-4 gap-1.5", hasBoundedYears && "max-h-56 overflow-y-auto p-1")}>
                {visibleYears.map((option) => {
                  const bounds = monthBounds(option);
                  return (
                    <button type="button" key={option} disabled={view.monthIndex < bounds.lower || view.monthIndex > bounds.upper}
                      aria-pressed={option === year}
                      className={cn(choiceClasses, option === year && "bg-burnt/10 font-semibold text-burnt-dark")}
                      onClick={() => {
                        showDate(new Date(option, view.monthIndex, 1));
                        setView({ kind: "days" });
                      }}>
                      {option}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {view.kind === "days" && (
            <>
              {showWeekdays && <div aria-hidden="true" className="mb-1 grid grid-cols-7 rounded-lg bg-mist py-2 text-center text-xs font-semibold text-muted">
                {weekdays.map((day) => <span key={day}>{day}</span>)}
              </div>}
              <div role="group" aria-label={caption} className="grid grid-cols-7 gap-0.5 text-center">
                {Array.from({ length: firstDay }, (_, index) => <span key={index} />)}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = index + 1;
                  const date = new Date(year, monthIndex, day);
                  const iso = calendarDateKey(date);
                  const selected = iso === value;
                  return (
                    <button key={iso} type="button" data-calendar-day={iso} aria-label={dayLabel.format(date)}
                      aria-pressed={selected} aria-current={today === iso ? "date" : undefined}
                      disabled={!dateAllowed(iso)} tabIndex={focusedDate === iso ? 0 : -1}
                      onFocus={() => setFocusedDate(iso)} onClick={() => pickDate(iso)}
                      onKeyDown={(event) => {
                        const offset = dayOffsets[event.key];
                        if (offset === undefined) return;
                        event.preventDefault();
                        const key = showDate(new Date(year, monthIndex, day + offset));
                        requestAnimationFrame(() => panelRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${key}"]`)?.focus());
                      }}
                      className={cn("grid min-h-10 place-items-center rounded-lg border border-transparent text-sm transition-colors focus-visible:outline-2 focus-visible:outline-burnt disabled:opacity-40 disabled:hover:bg-transparent",
                        selected ? "bg-burnt font-bold text-white" : "text-body hover:bg-burnt/10",
                        !selected && today === iso && "border-burnt/35 font-semibold text-burnt-dark")}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2">
                {dateAllowed(today) && (
                  <button type="button" onClick={() => pickDate(today)}
                    className="min-h-9 rounded-md px-3 text-sm font-semibold text-burnt-dark hover:bg-burnt/10 focus-visible:outline-2 focus-visible:outline-burnt">
                    Today
                  </button>
                )}
                <button type="button" onClick={close}
                  className="ml-auto min-h-9 rounded-md px-3 text-sm font-semibold text-body hover:bg-mist focus-visible:outline-2 focus-visible:outline-burnt">
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
