import { getManilaDateKey, getManilaWeekDays } from "@/lib/date-utils";
import { calculateVatSplit, formatPeso } from "@/lib/payments";
import { APPOINTMENTS, SOURCES, STAFF, STAFF_IDS } from "./report-fixtures";
import type { Appointment, BookingSource, Outcome, Receipt } from "./report-fixtures";

export type DateRange = { start: string; end: string };
export type SourceFilter = "all" | BookingSource;
export type TaxClass = "nonVat" | "vat";
export type BookType = "sales" | "cash";

export const OPERATIONAL_RANGE: DateRange = { start: "2026-11-09", end: "2026-11-13" };
export const BUSINESS_RANGE: DateRange = { start: "2026-10-01", end: "2026-10-21" };
export const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "quarter", label: "This quarter" },
] as const;

export const QUARTERS = [
  { id: "Q1", label: "Q1 · Jan – Mar", start: "2026-01-01", end: "2026-03-31" },
  { id: "Q2", label: "Q2 · Apr – Jun", start: "2026-04-01", end: "2026-06-30" },
  { id: "Q3", label: "Q3 · Jul – Sep", start: "2026-07-01", end: "2026-09-30" },
  { id: "Q4", label: "Q4 · Oct – Dec", start: "2026-10-01", end: "2026-12-31" },
] as const;

export type Quarter = (typeof QUARTERS)[number]["id"];
export type Preset = (typeof DATE_PRESETS)[number]["id"];

const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "UTC" });
const pesoAmount = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-PH", { style: "percent", maximumFractionDigits: 1 });

export function money(cents: number): string {
  return cents % 100 ? formatPeso(cents) : `₱${(cents / 100).toLocaleString("en-PH")}`;
}

export function decimalMoney(cents: number): string {
  return pesoAmount.format(cents / 100);
}

export function percentage(part: number, total: number): string {
  return percent.format(total ? part / total : 0);
}

export function dayLabel(day: string): string {
  return shortDate.format(new Date(day));
}

export function rangeLabel({ start, end }: DateRange): string {
  if (start === end) return `${dayLabel(start)}, ${start.slice(0, 4)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${dayLabel(start)}–${Number(end.slice(8))}, ${end.slice(0, 4)}`;
  }
  const startYear = start.slice(0, 4) !== end.slice(0, 4) ? `, ${start.slice(0, 4)}` : "";
  return `${dayLabel(start)}${startYear} – ${dayLabel(end)}, ${end.slice(0, 4)}`;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function presetRange(preset: Preset, now = new Date()): DateRange {
  const today = getManilaDateKey(now);
  const anchor = new Date(today);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  if (preset === "today") return { start: today, end: today };
  if (preset === "week") {
    return { start: getManilaWeekDays(now).at(0)?.dateKey ?? today, end: today };
  }
  if (preset === "lastMonth") {
    return { start: dateKey(new Date(Date.UTC(year, month - 1, 1))), end: dateKey(new Date(Date.UTC(year, month, 0))) };
  }
  const startMonth = preset === "quarter" ? month - month % 3 : month;
  return { start: dateKey(new Date(Date.UTC(year, startMonth, 1))), end: today };
}

export function inRange(day: string, { start, end }: DateRange): boolean {
  return day >= start && day <= end;
}

export function filterAppointments(range: DateRange, source: SourceFilter = "all"): Appointment[] {
  return APPOINTMENTS.filter((row) => inRange(row.day, range) && (source === "all" || source === row.source));
}

function outcomeCounts(rows: readonly Appointment[]): Record<Outcome, number> {
  return rows.reduce((counts, row) => {
    counts[row.outcome] += 1;
    return counts;
  }, { completed: 0, cancelled: 0, noShow: 0 });
}

export function summarize(rows: readonly Appointment[]): {
  counts: Record<Outcome, number>;
  completed: Receipt[];
  gross: number;
  commissions: number;
  staff: { id: keyof typeof STAFF; name: string; rule: string; counts: Record<Outcome, number>; quantity: number; revenue: number; commission: number }[];
} {
  const completed = rows.filter((row) => row.outcome === "completed");
  const staff = STAFF_IDS.map((id) => {
    const member = STAFF[id];
    const records = completed.filter((row) => row.staff === id);
    const quantity = records.reduce((total, row) => total + row.quantity, 0);
    const revenue = records.reduce((total, row) => total + row.grossCents, 0);
    return {
      id, name: member.name, rule: member.rule,
      counts: outcomeCounts(rows.filter((row) => row.staff === id)),
      quantity, revenue,
      commission: Math.round(revenue * member.rate) + quantity * member.fixedCents,
    };
  });
  return {
    counts: outcomeCounts(rows), completed, staff,
    gross: completed.reduce((total, row) => total + row.grossCents, 0),
    commissions: staff.reduce((total, row) => total + row.commission, 0),
  };
}

export function sourceSplit(rows: readonly Receipt[]): { source: (typeof SOURCES)[number]; count: number; gross: number }[] {
  return SOURCES.map((source) => {
    const matches = rows.filter((row) => row.source === source.id);
    return { source, count: matches.length, gross: matches.reduce((total, row) => total + row.grossCents, 0) };
  });
}

export function grossTrend(range: DateRange, source: SourceFilter): { key: string; label: string; gross: number }[] {
  const anchor = new Date(range.end);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  return Array.from({ length: 6 }, (_, index) => {
    const startOfMonth = new Date(Date.UTC(year, month - 5 + index, 1));
    const start = dateKey(startOfMonth);
    const end = dateKey(new Date(Date.UTC(year, month - 4 + index, 0)));
    const slice = index === 5 ? { start: range.start > start ? range.start : start, end: range.end } : { start, end };
    const gross = filterAppointments(slice, source).reduce((total, row) => total + (row.outcome === "completed" ? row.grossCents : 0), 0);
    return { key: start, label: monthName.format(startOfMonth), gross };
  });
}

export function ledgerDay(receipt: Receipt, book: BookType): string {
  return book === "cash" ? receipt.receiptDay : receipt.day;
}

export function taxAmounts(gross: number, tax: TaxClass): { net: number; vat: number; gross: number } {
  if (tax === "nonVat") return { net: gross, vat: 0, gross };
  const { netCents, vatCents } = calculateVatSplit(gross);
  return { net: netCents, vat: vatCents, gross };
}

export function ledgerTotals(rows: readonly Receipt[], tax: TaxClass): ReturnType<typeof taxAmounts> {
  return rows.reduce((sum, row) => {
    const amount = taxAmounts(row.grossCents, tax);
    return { net: sum.net + amount.net, vat: sum.vat + amount.vat, gross: sum.gross + amount.gross };
  }, { net: 0, vat: 0, gross: 0 });
}
