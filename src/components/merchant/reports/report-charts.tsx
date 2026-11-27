import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import { dayLabel, money, percentage, sourceSplit } from "./report-data";
import type { grossTrend } from "./report-data";
import { SOURCES } from "./report-fixtures";
import type { Receipt } from "./report-fixtures";

export function DailyAppointments({ rows }: { rows: readonly Receipt[] }): ReactElement {
  const byDate = new Map<string, Receipt[]>();
  for (const row of rows) {
    const records = byDate.get(row.day) ?? [];
    records.push(row);
    byDate.set(row.day, records);
  }
  const days = Array.from(byDate.entries()).sort(([left], [right]) => left.localeCompare(right));
  const max = Math.max(1, ...days.map(([, records]) => records.length));

  return (
    <div className="mt-4">
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-body" aria-label="Booking sources">
        {SOURCES.map((source) => (
          <li key={source.id} className="flex items-center gap-2">
            <span aria-hidden className={cn("size-2.5 rounded-xs", source.color)} />{source.short}
          </li>
        ))}
      </ul>
      {days.length ? (
        <ul aria-label="Completed appointments by day and source" className="grid max-h-60 gap-2 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
          {days.map(([day, records]) => {
            const split = sourceSplit(records);
            return (
              <li key={day} className="grid grid-cols-[3.4rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs text-body">
                <span>{dayLabel(day)}</span>
                <div role="img" aria-label={split.map(({ source, count }) => `${source.short} ${count}`).join(", ")} className="flex h-5 items-stretch gap-px">
                  {split.filter(({ count }) => count > 0).map(({ source, count }) => (
                    <span key={source.id} title={`${source.short} · ${count}`} className={cn("rounded-xs", source.color)} style={{ width: percentage(count, max) }} />
                  ))}
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{records.length}</span>
              </li>
            );
          })}
        </ul>
      ) : <p className="py-6 text-sm text-muted">No completed appointments in this range.</p>}
    </div>
  );
}

export function SourceDonut({ rows }: { rows: readonly Receipt[] }): ReactElement {
  const split = sourceSplit(rows);
  let runningTotal = 0;
  const stops = split.map(({ source, count }) => {
    const from = percentage(runningTotal, rows.length);
    runningTotal += count;
    return `${source.token} ${from} ${percentage(runningTotal, rows.length)}`;
  });

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
      <div
        aria-label={`${rows.length} completed appointments`}
        role="img"
        className="grid size-32 shrink-0 place-items-center rounded-full bg-mist sm:size-36"
        style={rows.length ? { backgroundImage: `conic-gradient(${stops.join(", ")})` } : undefined}
      >
        <div className="flex size-[74%] flex-col items-center justify-center rounded-full bg-white text-body">
          <span aria-hidden className="text-2xl font-semibold tabular-nums">{rows.length}</span>
          <span aria-hidden className="text-xs">completed</span>
        </div>
      </div>
      <ul className="grid min-w-[10rem] flex-1 gap-3">
        {split.map(({ source, count, gross }) => (
          <li key={source.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 text-xs">
            <span aria-hidden className={cn("mt-1 size-2.5 rounded-xs", source.color)} />
            <span className="text-body">{source.split}</span>
            <span className="text-right font-semibold tabular-nums">{percentage(count, rows.length)}</span>
            <span className="col-span-2 col-start-2 text-muted tabular-nums">{money(gross)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SalesTrend({ points }: { points: ReturnType<typeof grossTrend> }): ReactElement {
  const peak = Math.max(...points.map(({ gross }) => gross));
  const step = [250_000, 500_000, 1_000_000, 2_500_000, 5_000_000].find((tick) => peak <= tick * 4) ?? Math.ceil(peak / 4_000_000) * 1_000_000;
  return (
    <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 sm:gap-x-5">
      <div aria-hidden className="flex h-44 flex-col justify-between text-xs text-muted tabular-nums">
        {[4, 3, 2, 1, 0].map((tick) => (
          <span key={tick}>{tick ? `₱${(tick * step / 100_000).toLocaleString("en-PH")}k` : "₱0"}</span>
        ))}
      </div>
      <ul aria-label="Monthly gross sales in Philippine pesos" className="grid grid-cols-6 gap-1 text-center sm:gap-3">
        {points.map(({ key, label, gross }) => (
          <li key={key} className="min-w-0 text-xs text-body">
            <div className="flex h-44 flex-col items-center justify-end gap-1">
              <span className="tabular-nums" title={money(gross)}><span className="sr-only">{money(gross)}</span><span aria-hidden>{gross ? `${(gross / 100_000).toFixed(1)}k` : "0"}</span></span>
              <span aria-hidden className="w-2/3 max-w-8 rounded-t-sm bg-burnt" style={{ height: percentage(gross, step * 4) }} />
            </div>
            <p className="mt-2">{label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
