"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/admin/icon";
import { useOutsideClose } from "@/lib/use-outside-close";
import { cn } from "@/lib/utils";
import { inputClasses } from "./input";
import { useAnchoredPopover } from "./use-anchored-popover";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (value: number) => String(value).padStart(2, "0");
export const toIsoDate = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

type Parts = { y: number; m: number; d: number };

function parseIso(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

const key = (p: Parts) => p.y * 10000 + p.m * 100 + p.d;

export function formatDisplayDate(value: string): string {
  const parsed = parseIso(value);
  if (!parsed) return "";
  return `${parsed.d} ${MONTHS[parsed.m]?.slice(0, 3) ?? ""} ${parsed.y}`;
}

/**
 * Branded date picker (month grid + year list). Use it instead of `<input type="date">`.
 * Values are ISO `yyyy-mm-dd` strings. `min` / `max` are inclusive limits; without `max` the picker allows 10 years ahead.
 * To submit it in a plain <form>, render a hidden input with the value.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  minYear,
  invalid = false,
  placeholder = "Select date",
  describedBy,
  ariaLabel = "Choose date",
  compact = false,
  disabled = false,
  className,
  floating: _floating = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable date (ISO yyyy-mm-dd). */
  min?: string;
  /** Latest selectable date (ISO yyyy-mm-dd). */
  max?: string;
  minYear?: number;
  invalid?: boolean;
  placeholder?: string;
  describedBy?: string;
  ariaLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  floating?: boolean;
}) {
  const now = new Date();
  const today: Parts = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  const maxParts = parseIso(max ?? "") ?? { y: today.y + 10, m: 11, d: 31 };
  const minParts = parseIso(min ?? "");
  const firstYear = minParts?.y ?? minYear ?? 1900;
  const selected = parseIso(value);
  const startParts = (): { y: number; m: number } => {
    const base = selected ?? (key(today) > key(maxParts) ? maxParts : minParts && key(today) < key(minParts) ? minParts : today);
    return { y: base.y, m: base.m };
  };
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "years">("days");
  const [cursor, setCursor] = useState<{ y: number; m: number }>(startParts);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const yearRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const panelRef = useAnchoredPopover<HTMLDivElement>(open, buttonRef, { width: 288, maxHeight: 360, fitContent: true });

  const close = () => {
    setOpen(false);
    setView("days");
  };
  useOutsideClose(open, close, wrapRef);

  useEffect(() => {
    if (open && view === "years") yearRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [open, view]);

  function toggle() {
    if (open) return close();
    setCursor(startParts());
    setView("days");
    setOpen(true);
  }

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const count = new Date(cursor.y, cursor.m + 1, 0).getDate();
    return [...Array.from({ length: first }, () => null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [cursor]);

  const outOfRange = (y: number, m: number, d: number) => {
    const k = y * 10000 + m * 100 + d;
    return k > key(maxParts) || (minParts !== null && k < key(minParts));
  };
  const canGoNext = cursor.y < maxParts.y || (cursor.y === maxParts.y && cursor.m < maxParts.m);
  const canGoPrev = minParts ? cursor.y > minParts.y || (cursor.y === minParts.y && cursor.m > minParts.m) : cursor.y > firstYear || cursor.m > 0;

  function shift(delta: number) {
    setCursor((current) => {
      const date = new Date(current.y, current.m + delta, 1);
      return { y: date.getFullYear(), m: date.getMonth() };
    });
  }

  const years = Array.from({ length: maxParts.y - firstYear + 1 }, (_, index) => maxParts.y - index);

  return (
    <div
      ref={wrapRef}
      className={cn("relative", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-describedby={describedBy}
        onClick={toggle}
        className={
          compact
            ? cn(
                "flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3.5 text-left text-sm text-body transition-colors",
                "focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:cursor-not-allowed disabled:opacity-50",
                open ? "border-burnt" : "border-hairline hover:border-outline"
              )
            : cn(inputClasses(invalid), "flex cursor-pointer items-center justify-between gap-2 text-left")
        }
      >
        <span className={cn("truncate", !value && "text-subtle")}>{value ? formatDisplayDate(value) : placeholder}</span>
        <Icon name="calendar" className={cn("shrink-0 text-glyph", compact ? "size-4" : "size-5")} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          popover="manual"
          role="dialog"
          aria-label={ariaLabel}
          className="fixed inset-auto m-0 overflow-auto overscroll-contain rounded-lg border border-hairline bg-white p-3 text-ink shadow-popover"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setView((current) => (current === "days" ? "years" : "days"))}
              aria-live="polite"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            >
              {MONTHS[cursor.m]} {cursor.y}
              <Icon name="chevron-down" className={cn("size-4 transition-transform", view === "years" && "rotate-180")} />
            </button>
            {view === "days" ? (
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous month" disabled={!canGoPrev} onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-md text-ink hover:bg-mist disabled:opacity-30">
                  <Icon name="chevron-left" className="size-5" />
                </button>
                <button type="button" aria-label="Next month" disabled={!canGoNext} onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-md text-ink hover:bg-mist disabled:opacity-30">
                  <Icon name="chevron-right" className="size-5" />
                </button>
              </div>
            ) : null}
          </div>

          {view === "years" ? (
            <div role="listbox" aria-label="Year" className="grid max-h-[232px] grid-cols-4 gap-1 overflow-auto pr-1">
              {years.map((year) => {
                const isCurrent = year === cursor.y;
                return (
                  <button
                    key={year}
                    ref={isCurrent ? yearRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => {
                      setCursor((current) => ({ y: year, m: year === maxParts.y ? Math.min(current.m, maxParts.m) : current.m }));
                      setView("days");
                    }}
                    className={cn("h-9 rounded-md text-sm hover:bg-mist", isCurrent ? "bg-burnt font-semibold text-on-burnt hover:bg-burnt" : "text-ink")}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
              </div>
              <div role="grid" aria-label={`${MONTHS[cursor.m]} ${cursor.y}`} className="grid grid-cols-7 gap-y-0.5 text-center">
                {cells.map((day, index) => {
                  if (day === null) return <span key={`blank-${index}`} />;
                  const blocked = outOfRange(cursor.y, cursor.m, day);
                  const isSelected = selected?.y === cursor.y && selected.m === cursor.m && selected.d === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      disabled={blocked}
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(toIsoDate(cursor.y, cursor.m, day));
                        close();
                        buttonRef.current?.focus();
                      }}
                      className={cn(
                        "mx-auto flex size-9 items-center justify-center rounded-full text-sm",
                        isSelected ? "bg-burnt font-semibold text-on-burnt" : "text-ink hover:bg-mist",
                        blocked && "cursor-not-allowed text-line hover:bg-transparent"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
                buttonRef.current?.focus();
              }}
              className="rounded px-2 py-1 text-burnt hover:bg-burnt/10"
            >
              Clear
            </button>
            <button type="button" onClick={() => { close(); buttonRef.current?.focus(); }} className="rounded px-2 py-1 text-muted hover:bg-mist">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
