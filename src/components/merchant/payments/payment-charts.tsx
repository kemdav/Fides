"use client";

import * as React from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { Listbox } from "@/components/admin/listbox";
import { Surface } from "@/components/admin/primitives";
import { getManilaDateKey, getManilaTodayKey, MANILA_TIMEZONE } from "@/lib/date-utils";
import { formatPeso } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { DailyCollectionPointDTO, MethodBreakdownItemDTO, PaymentRecordDTO } from "@/types/payments";

type Timeframe = "today" | "week" | "month" | "year";

const timeframeOptions: { value: Timeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const dayLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });
const fullMonth = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const weekdayLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const hourLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", hour12: true });
const manilaHour = new Intl.DateTimeFormat("en-GB", { timeZone: MANILA_TIMEZONE, hour: "2-digit", hourCycle: "h23" });

type CollectionPoint = DailyCollectionPointDTO & { tickLabel?: string };

// Compose the separator explicitly so server and browser ICU versions render the same label.
function formatWeekLabel(start: Date, lastDay: Date): string {
  const year = lastDay.getUTCFullYear();
  if (start.getUTCFullYear() !== year) {
    return `${fullDate.format(start)} – ${fullDate.format(lastDay)}`;
  }

  const lastDayLabel = start.getUTCMonth() === lastDay.getUTCMonth()
    ? lastDay.getUTCDate()
    : dayLabel.format(lastDay);
  return `${dayLabel.format(start)} – ${lastDayLabel}, ${year}`;
}

/** Use UTC dates for Manila calendar arithmetic. Transaction timestamps are bucketed in Manila time. */
function getPeriod(todayKey: string, timeframe: Timeframe, offset: number) {
  const anchor = new Date(todayKey + "T00:00:00Z");
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const addDays = (date: Date, days: number) =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));

  if (timeframe === "today") {
    const start = addDays(anchor, -offset);
    return { start, end: addDays(start, 1), label: fullDate.format(start) };
  }

  if (timeframe === "week") {
    const daysSinceMonday = (anchor.getUTCDay() + 6) % 7;
    const start = addDays(anchor, -daysSinceMonday - offset * 7);
    return { start, end: addDays(start, 7), label: formatWeekLabel(start, addDays(start, 6)) };
  }

  if (timeframe === "month") {
    const start = new Date(Date.UTC(year, month - offset, 1));
    return { start, end: new Date(Date.UTC(year, month - offset + 1, 1)), label: fullMonth.format(start) };
  }

  return {
    start: new Date(Date.UTC(year - offset, 0, 1)),
    end: new Date(Date.UTC(year - offset + 1, 0, 1)),
    label: String(year - offset),
  };
}

function makeBuckets(start: Date, end: Date, timeframe: Timeframe): CollectionPoint[] {
  const points: CollectionPoint[] = [];
  for (const cursor = new Date(start); cursor < end;) {
    const key = cursor.toISOString().slice(0, 10);
    let dateKey = key;
    let label = dayLabel.format(cursor);
    let tickLabel: string | undefined;

    if (timeframe === "today") {
      const hour = cursor.getUTCHours();
      dateKey = key + "T" + String(hour).padStart(2, "0");
      label = hourLabel.format(cursor);
      if (hour % 4 === 0) tickLabel = label;
      cursor.setUTCHours(hour + 1);
    } else if (timeframe === "year") {
      label = fullMonth.format(cursor);
      tickLabel = monthLabel.format(cursor);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    } else {
      const day = cursor.getUTCDate();
      if (timeframe === "week") tickLabel = weekdayLabel.format(cursor);
      else if (day === 1 || day % 7 === 0) tickLabel = String(day);
      cursor.setUTCDate(day + 1);
    }

    points.push({ dateKey, label, tickLabel, grossCents: 0, netCents: 0, count: 0 });
  }
  return points;
}

export function DailyCollectionsBarChart({
  history,
  todayKey = getManilaTodayKey(),
}: {
  history: PaymentRecordDTO[];
  todayKey?: string;
}) {
  const [period, setPeriod] = React.useState<{ timeframe: Timeframe; offset: number }>({ timeframe: "week", offset: 0 });
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const timeframeId = React.useId();
  const rangeId = React.useId();
  const { timeframe, offset } = period;
  const { start, end, label } = getPeriod(todayKey, timeframe, offset);

  const datedPayments = React.useMemo(() => {
    return history.flatMap((payment) => {
      if (payment.status === "voided" || payment.status === "refunded") return [];
      const timestamp = new Date(payment.paidAt);
      if (!Number.isFinite(timestamp.getTime())) return [];
      return [{
        day: getManilaDateKey(timestamp),
        hour: manilaHour.format(timestamp),
        amountCents: payment.amountCents,
        netCents: payment.netCents,
      }];
    });
  }, [history]);

  const data = makeBuckets(start, end, timeframe);
  const buckets = new Map(data.map((point) => [point.dateKey, point]));
  for (const payment of datedPayments) {
    const key = timeframe === "today"
      ? payment.day + "T" + payment.hour
      : timeframe === "year"
        ? payment.day.slice(0, 7) + "-01"
        : payment.day;
    const point = buckets.get(key);
    if (point) {
      point.grossCents += payment.amountCents;
      point.netCents += payment.netCents;
      point.count += 1;
    }
  }

  const hoveredIndex = data.findIndex((point) => point.dateKey === hoveredKey);
  const hovered = data[hoveredIndex];
  const maxGross = Math.max(...data.map((point) => point.grossCents), 10000);

  function shiftPeriod(direction: -1 | 1) {
    setHoveredKey(null);
    setPeriod((current) => ({ ...current, offset: Math.max(0, current.offset + direction) }));
  }

  function changeTimeframe(value: string) {
    const next = timeframeOptions.find((option) => option.value === value);
    if (next) {
      setHoveredKey(null);
      setPeriod({ timeframe: next.value, offset: 0 });
    }
  }

  return (
    <Surface className="flex h-full min-w-0 flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <h2 className="text-base font-semibold leading-6 text-ink">Collections</h2>
          <p id={rangeId} className="text-sm text-muted" aria-live="polite">{label}</p>
        </div>

        <div className="flex items-center justify-between gap-1.5" role="group" aria-label="Collections period">
          <button
            type="button"
            aria-label="Previous period"
            onClick={() => shiftPeriod(1)}
            className={fieldOutlineClasses + " flex size-11 shrink-0 items-center justify-center text-glyph hover:bg-mist"}
          >
            <Icon name="chevron-down" className="size-4 rotate-90" />
          </button>
          <div className="w-28">
            <Listbox
              id={timeframeId}
              label="Collections timeframe"
              hideLabel
              describedBy={rangeId}
              value={timeframe}
              options={timeframeOptions}
              onChange={changeTimeframe}
            />
          </div>
          <button
            type="button"
            aria-label="Next period"
            disabled={offset === 0}
            onClick={() => shiftPeriod(-1)}
            className={fieldOutlineClasses + " flex size-11 shrink-0 items-center justify-center text-glyph enabled:hover:bg-mist disabled:opacity-40"}
          >
            <Icon name="chevron-down" className="size-4 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="relative my-2 w-full">
        {hovered && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-12 z-20 w-44 -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 text-xs text-white shadow-lg"
            style={{ left: "clamp(5.5rem, " + ((hoveredIndex + 0.5) / data.length) * 100 + "%, calc(100% - 5.5rem))" }}
          >
            <p className="font-semibold">{hovered.label}</p>
            <p className="text-emerald-400">Gross: {formatPeso(hovered.grossCents)}</p>
            <p className="text-neutral-300">Net: {formatPeso(hovered.netCents)}</p>
            <p className="text-[10px] text-neutral-400">
              {hovered.count} transaction{hovered.count === 1 ? "" : "s"}
            </p>
          </div>
        )}

        <div className="flex h-44 w-full items-end gap-0.5 sm:gap-1.5" role="group" aria-label="Gross collections">
          {data.map((point) => (
            <div
              key={point.dateKey}
              role="img"
              aria-label={point.label + ", gross " + formatPeso(point.grossCents) + ", net " + formatPeso(point.netCents)}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHoveredKey(point.dateKey)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div className="flex h-36 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-7 rounded-t-md transition-colors",
                    point.grossCents > 0 ? "bg-burnt" : "bg-mist",
                    hoveredKey === point.dateKey && "bg-burnt-dark",
                  )}
                  style={{ height: point.grossCents > 0 ? Math.max((point.grossCents / maxGross) * 100, 3) + "%" : "4px" }}
                />
              </div>
              <span aria-hidden className="mt-2 block h-4 text-center text-[10px] font-medium text-muted sm:text-[11px]">
                {point.tickLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="border-t border-hairline pt-3 text-[11px] text-subtle">
        Collections are shown in Philippine pesos using Asia/Manila time.
      </p>
    </Surface>
  );
}

/* ------------------------------------------------ Method Breakdown Donut */

interface MethodDonutChartProps {
  breakdown: MethodBreakdownItemDTO[];
}

const methodColors: Record<MethodBreakdownItemDTO["method"], string> = {
  cash: "var(--color-burnt)",
  ewallet: "var(--color-sky)",
  card: "var(--color-body)",
};

export function MethodDonutChart({ breakdown }: MethodDonutChartProps) {
  const totalCents = breakdown.reduce((sum, item) => sum + item.amountCents, 0);
  const arcs = [];
  let offset = 0;
  for (const item of breakdown) {
    const length = totalCents > 0 ? (item.amountCents / totalCents) * 100 : 0;
    arcs.push({ method: item.method, length, offset });
    offset += length;
  }

  return (
    <Surface className="flex h-full min-w-0 flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold leading-6 text-ink">Collections by method</h2>
        <p className="text-sm text-muted">Breakdown across settlement channels</p>
      </div>

      <div className="my-auto flex flex-wrap items-center gap-8">
        <div className="relative mx-auto size-40 shrink-0">
          <svg aria-hidden="true" className="size-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="var(--color-mist)" strokeWidth="20" />
            {arcs.map(({ method, length, offset }) => length > 0 && (
              <circle
                key={method}
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={methodColors[method]}
                strokeWidth="20"
                pathLength="100"
                strokeDasharray={length + " " + Math.max(0, 100 - length)}
                strokeDashoffset={-offset}
              />
            ))}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-xs font-medium text-muted">Total</span>
            <span className="max-w-28 break-all font-display text-xl leading-6 text-ink">
              {formatPeso(totalCents)}
            </span>
          </div>
        </div>

        <ul className="min-w-0 flex-[1_1_12rem] divide-y divide-hairline rounded-lg border border-hairline">
          {breakdown.map((item) => (
            <li key={item.method} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: methodColors[item.method] }}
                />
                <span className="min-w-0 break-words text-sm font-medium leading-5 text-ink">{item.label}</span>
              </div>
              <div className="max-w-32 text-right tabular-nums">
                <p className="break-all text-sm font-semibold leading-5 text-ink">{formatPeso(item.amountCents)}</p>
                <p className="text-xs leading-5 text-muted">
                  {item.percentage.toFixed(1)}% · {item.count} {item.count === 1 ? "payment" : "payments"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}
