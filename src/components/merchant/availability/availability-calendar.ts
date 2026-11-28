import { getManilaWeekDays } from "@/lib/date-utils";
import type { ManilaWeekDay } from "@/lib/date-utils";
import { allTargets, closingDay, lunch, weekdays } from "./availability-data";
import type { Resource, Shift, StaffSchedule, TimeBlock, Weekday } from "./availability-data";

const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const dateLabel = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
const calendarSlots = ["09:00", "11:00", lunch.start, lunch.end, "16:00", "18:00"];
const manilaMidday = (date: string) => `${date}T12:00:00+08:00`;

export function getWeek(date: string): ManilaWeekDay[] {
  return getManilaWeekDays(manilaMidday(date));
}

export function moveWeek(date: string, offset: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset * weekdays.length);
  return next.toISOString().slice(0, 10);
}

export function weekLabel(week: ManilaWeekDay[], short = false): string {
  const first = week.at(0);
  const last = week.at(-1);
  if (!first || !last) return "";
  const start = new Date(`${first.dateKey}T00:00:00Z`);
  const end = new Date(`${last.dateKey}T00:00:00Z`);
  const format = short ? monthShort : monthLong;
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startLabel = `${format.format(start)} ${start.getUTCDate()}${startYear !== endYear ? `, ${startYear}` : ""}`;
  const endLabel = `${start.getUTCMonth() !== end.getUTCMonth() ? `${format.format(end)} ` : ""}${end.getUTCDate()}, ${endYear}`;
  return `${startLabel}${short ? " – " : "–"}${endLabel}`;
}

export function formatBlockDate(date: string, short = false): string {
  const value = new Date(`${date}T00:00:00Z`);
  return short ? `${monthShort.format(value)} ${value.getUTCDate()}` : dateLabel.format(value);
}

export function blockDateLabel(block: TimeBlock): string {
  const start = formatBlockDate(block.startDate);
  const end = formatBlockDate(block.endDate);
  const endYear = block.endDate.slice(0, 4);
  const startYear = block.startDate.slice(0, 4);
  const range = block.startDate === block.endDate ? start : `${start}${startYear !== endYear ? `, ${startYear}` : ""} – ${end}`;
  return `${range}, ${endYear}`;
}

export function isBusinessClosure(block: TimeBlock): boolean {
  return block.kind === "holiday" || block.kind === "closure";
}

type TimeRange = { start: string; end: string };
type DayBlock = TimeRange & { block: TimeBlock };

function forDate(date: string, blocks: TimeBlock[]): DayBlock[] {
  return blocks.flatMap((block) => {
    if (date < block.startDate || date > block.endDate) return [];
    const start = block.allDay || date !== block.startDate ? "00:00" : block.startTime;
    const end = block.allDay || date !== block.endDate ? "24:00" : block.endTime;
    return start < end ? [{ block, start, end }] : [];
  });
}

function intersects(left: TimeRange, right: TimeRange): boolean {
  return left.start < right.end && right.start < left.end;
}

function appliesToStaff(block: TimeBlock, staffId: string): boolean {
  return block.target === staffId || block.target === allTargets;
}

export function scheduleCell(
  day: ManilaWeekDay, member: StaffSchedule, blocks: TimeBlock[],
): { label: string; note?: string; tone: "neutral" | "warning" | "shift" } {
  const shift = member.shifts[day.day];
  const dayBlocks = forDate(day.dateKey, blocks);
  const closure = dayBlocks.find(({ block, start, end }) => isBusinessClosure(block) && (block.allDay || (shift && start <= shift.start && end >= shift.end)));
  if (closure) {
    return { label: "Closed", note: closure.block.reason, tone: "neutral" };
  }
  if (day.day === closingDay.value) return { label: "Closed", tone: "neutral" };
  if (!shift) return { label: "Off", tone: "neutral" };
  const related = dayBlocks.filter(({ block, start, end }) => appliesToStaff(block, member.id) && intersects(shift, { start, end }));
  const absence = related.find(({ block, start, end }) => block.kind === "leave" && start <= shift.start && end >= shift.end);
  if (absence) return { label: "On leave", note: absence.block.reason, tone: "warning" };
  const note = related.some(({ block }) => isBusinessClosure(block)) ? "Partial closure"
    : related.some(({ block }) => block.kind === "leave") ? "Time off"
    : related.some(({ block }) => block.kind === "break") ? "Temporary break" : undefined;
  return { label: `${shift.start}–${shift.end}`, note, tone: "shift" };
}

export type CoveragePart = TimeRange & {
  member: StaffSchedule;
  kind: "coverage" | "lunch" | "break" | "leave" | "resource";
};

export type CalendarCell = {
  closures: (TimeRange & { reason?: string; id: string })[];
  parts: CoveragePart[];
};

function coverageKind(
  time: string, shift: Shift, blocks: DayBlock[], linkedResources: Resource[],
): CoveragePart["kind"] | null {
  const active = blocks.filter(({ start, end }) => start <= time && time < end);
  if (active.some(({ block }) => isBusinessClosure(block))) return null;
  if (active.some(({ block }) => block.kind === "leave")) return "leave";
  if (active.some(({ block }) => block.kind === "break" && !linkedResources.some((resource) => resource.id === block.target))) return "break";
  if (shift.breakStart && shift.breakStart <= time && time < shift.breakEnd) {
    return shift.breakStart === lunch.start && shift.breakEnd === lunch.end ? "lunch" : "break";
  }
  if (linkedResources.length && linkedResources.every((resource) => active.some(({ block }) => block.target === resource.id))) return "resource";
  return "coverage";
}

function staffParts(
  member: StaffSchedule, day: Weekday, band: TimeRange, blocks: DayBlock[], resources: Resource[],
): CoveragePart[] {
  const shift = member.shifts[day];
  if (!shift || !intersects(shift, band)) return [];
  const linked = resources.filter(({ serviceIds }) => serviceIds.includes(member.serviceId));
  const relevant = blocks.filter(({ block }) => appliesToStaff(block, member.id) || linked.some(({ id }) => id === block.target));
  const start = shift.start > band.start ? shift.start : band.start;
  const end = shift.end < band.end ? shift.end : band.end;
  const inner = [shift.breakStart, shift.breakEnd, ...relevant.flatMap((block) => [block.start, block.end])]
    .filter((time) => start < time && time < end);
  const edges = [...new Set([start, ...inner, end])].toSorted();
  const parts: CoveragePart[] = [];
  edges.slice(1).forEach((endTime, index) => {
    const startTime = edges[index];
    if (!startTime) return;
    const kind = coverageKind(startTime, shift, relevant, linked);
    if (!kind) return;
    const previous = parts.at(-1);
    if (previous?.kind === kind && previous.end === startTime) previous.end = endTime;
    else parts.push({ start: startTime, end: endTime, member, kind });
  });
  return parts;
}

export function buildCalendar(
  week: ManilaWeekDay[], staff: StaffSchedule[], blocks: TimeBlock[], resources: Resource[],
): (TimeRange & { cells: CalendarCell[] })[] {
  const shiftTimes = staff.flatMap(({ shifts }) => Object.values(shifts).flatMap(({ start, end }) => [start, end]));
  const outerTimes = shiftTimes.filter((time) => time < "09:00" || time > "18:00");
  const slots = [...new Set([...calendarSlots, ...outerTimes])].toSorted();
  const dayBlocks = week.map(({ dateKey }) => forDate(dateKey, blocks));
  return slots.slice(1).flatMap((end, index) => {
    const start = slots[index];
    if (!start) return [];
    const band = { start, end };
    const cells = week.map(({ day }, dayIndex) => {
      const dated = dayBlocks[dayIndex] ?? [];
      const closures = dated.filter((item) => isBusinessClosure(item.block) && intersects(item, band)).map((closed) => ({
        id: closed.block.id,
        start: closed.start > start ? closed.start : start,
        end: closed.end < end ? closed.end : end,
        reason: closed.block.reason,
      }));
      if (day === closingDay.value) return { closures: [{ ...band, id: "weekly", reason: closures.at(0)?.reason }], parts: [] };
      return { closures, parts: staff.flatMap((member) => staffParts(member, day, band, dated, resources)) };
    });
    return [{ ...band, cells }];
  });
}
