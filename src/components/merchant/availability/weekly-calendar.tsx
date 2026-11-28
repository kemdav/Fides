import { useState } from "react";
import { StatusPill } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import type { ManilaWeekDay } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { buildCalendar } from "./availability-calendar";
import type { CalendarCell, CoveragePart } from "./availability-calendar";
import { services } from "./availability-data";
import type { Resource, StaffSchedule, TimeBlock, Weekday } from "./availability-data";

const kindLabels: Record<CoveragePart["kind"], string> = {
  coverage: "Shift coverage", lunch: "Lunch break", break: "Break", leave: "On leave", resource: "Resource unavailable",
};
const kindClasses: Record<CoveragePart["kind"], string> = {
  coverage: "bg-blush text-ink", lunch: "bg-mist text-body", break: "bg-mist text-body", leave: "bg-warn-bg text-warn-fg", resource: "bg-warn-bg text-warn-fg",
};

function groupParts(parts: CoveragePart[]) {
  const groups = new Map<string, { start: string; end: string; kind: CoveragePart["kind"]; members: StaffSchedule[] }>();
  for (const { kind, start, end, member } of parts) {
    const key = `${kind}-${start}-${end}`;
    const group = groups.get(key);
    if (group) group.members.push(member);
    else groups.set(key, { kind, start, end, members: [member] });
  }
  return [...groups.entries()];
}

export function WeeklyCalendar({ week, staff, blocks, resources }: {
  week: ManilaWeekDay[];
  staff: StaffSchedule[];
  blocks: TimeBlock[];
  resources: Resource[];
}): React.JSX.Element {
  const [selectedDay, setSelectedDay] = useState<Weekday>("Mon");
  const dayIndex = week.findIndex(({ day }) => day === selectedDay);
  const calendar = buildCalendar(week, staff, blocks, resources);

  return (
    <div className="space-y-3 p-4 sm:p-6 sm:pt-4">
      <div className="flex flex-wrap items-center gap-2" aria-label="Calendar legend" role="group">
        <StatusPill className="bg-blush!">Shift coverage</StatusPill>
        <StatusPill className="border border-hairline">Lunch break</StatusPill>
        <StatusPill className="bg-line!">Closed</StatusPill>
      </div>
      <table className="hidden w-full table-fixed border-separate border-spacing-x-1.5 border-spacing-y-1.5 @min-[58rem]:table">
        <caption className="sr-only">Weekly calendar of staff and service coverage</caption>
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="w-13 text-left">Time</th>
            {week.map(({ day, dateKey }) => <th scope="col" key={day} className="px-1 pb-1 font-semibold">{day} {Number(dateKey.slice(-2))}</th>)}
          </tr>
        </thead>
        <tbody>
          {calendar.map(({ start, end, cells }) => (
            <tr key={start}>
              <th scope="row" className="pt-2 text-left align-top text-xs font-semibold tabular-nums text-muted">{start}</th>
              {cells.map((cell, index) => (
                <td key={week[index]?.dateKey} className="rounded-md border border-hairline bg-mist/50 p-1 align-top">
                  <CalendarSlot cell={cell} start={start} end={end} alternate={index % 2 === 1} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-3 @min-[58rem]:hidden">
        <div className="grid grid-cols-7 gap-0.5 rounded-lg border border-hairline bg-mist p-1 sm:gap-2" role="group" aria-label="Calendar day">
          {week.map(({ day, dateKey }) => (
            <Button key={day} variant={selectedDay === day ? "brand" : "ghost"} aria-pressed={selectedDay === day}
              onClick={() => setSelectedDay(day)} className="flex h-11 min-w-0 flex-col gap-0 rounded-md px-0! text-xs/4">
              <span>{day}</span>
              <span className="tabular-nums">{Number(dateKey.slice(-2))}</span>
            </Button>
          ))}
        </div>
        <dl className="space-y-2" aria-label={`${selectedDay} calendar`}>
          {calendar.map(({ start, end, cells }) => {
            const cell = cells[dayIndex];
            return cell && (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-2" key={start}>
                <dt className="pt-2 text-xs font-semibold tabular-nums text-muted">{start}</dt>
                <dd className="rounded-md border border-hairline bg-mist/50 p-1"><CalendarSlot cell={cell} start={start} end={end} alternate={dayIndex % 2 === 1} /></dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}

function CalendarSlot({ cell, start, end, alternate }: {
  cell: CalendarCell;
  start: string;
  end: string;
  alternate: boolean;
}): React.JSX.Element {
  if (!cell.parts.length && !cell.closures.length) {
    return <p className="px-1.5 py-2 text-xs text-muted"><span aria-hidden="true">—</span><span className="sr-only">No shift coverage</span></p>;
  }
  const lunchOnly = !cell.closures.length && cell.parts.every((part) => part.kind === "lunch" && part.start === start && part.end === end);
  if (lunchOnly) return <p className="rounded bg-mist px-1.5 py-2 text-xs font-medium text-body">Lunch break</p>;

  return (
    <div className="grid gap-1 text-xs leading-4">
      {cell.closures.map((closure) => (
        <div key={closure.id} className="rounded bg-line px-1.5 py-1.5 wrap-anywhere text-body">
          <p className="font-semibold">Closed</p>
          {closure.reason && <p>{closure.reason}</p>}
          {(closure.start !== start || closure.end !== end) && <p className="tabular-nums">{closure.start}–{closure.end}</p>}
        </div>
      ))}
      {groupParts(cell.parts).map(([key, group]) => (
        <div key={key} className={cn("space-y-0.5 rounded px-1.5 py-1.5 break-words", kindClasses[group.kind], alternate && group.kind === "coverage" && "bg-selected!")}>
          {group.members.map((member) => {
            const service = services.find(({ id }) => id === member.serviceId);
            const label = group.kind === "coverage" ? service?.calendarName ?? kindLabels.coverage : kindLabels[group.kind];
            return (
              <p key={member.id} className="font-medium" title={member.name}>
                <span aria-hidden="true">{member.name.split(" ").at(0)}</span><span className="sr-only">{member.name}</span>{` · ${label}`}
              </p>
            );
          })}
          {(group.start !== start || group.end !== end) && <p className="tabular-nums text-muted">{group.start}–{group.end}</p>}
        </div>
      ))}
    </div>
  );
}
