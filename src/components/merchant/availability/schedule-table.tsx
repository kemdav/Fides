import { StatusPill } from "@/components/admin/primitives";
import type { ManilaWeekDay } from "@/lib/date-utils";
import { scheduleCell } from "./availability-calendar";
import type { StaffSchedule, TimeBlock } from "./availability-data";
import { RowActions, tableHeaderClass, tableRowClass } from "./availability-ui";

const headSpace = "px-3 py-3 @min-[66rem]:px-5";
const cellSpace = "px-3 py-3.5 @min-[66rem]:px-5";

export function ScheduleTable({ week, staff, blocks, onEditShift, onAddTimeOff }: {
  week: ManilaWeekDay[];
  staff: StaffSchedule[];
  blocks: TimeBlock[];
  onEditShift: (id: string) => void;
  onAddTimeOff: (id: string) => void;
}): React.JSX.Element {
  function actions(member: StaffSchedule) {
    return <RowActions label={`Actions for ${member.name}`} actions={[
      { label: "Edit shift and break", onSelect: () => onEditShift(member.id) },
      { label: "Add time off", onSelect: () => onAddTimeOff(member.id) },
    ]} />;
  }

  return (
    <>
      <table className="hidden w-full text-left text-sm @min-[58rem]:table">
        <caption className="sr-only">Recurring staff shifts for the selected week</caption>
        <thead>
          <tr className={tableHeaderClass}>
            <th scope="col" className={headSpace}>Staff</th>
            {week.map(({ day }) => <th scope="col" className={headSpace} key={day}>{day}</th>)}
            <th scope="col" className={`${headSpace} text-center`}>Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {staff.map((member) => (
            <tr key={member.id} className={tableRowClass}>
              <th scope="row" className={`${cellSpace} min-w-25 font-semibold text-ink`}>{member.name}</th>
              {week.map((day) => <td key={day.day} className={cellSpace}><ShiftCell {...scheduleCell(day, member, blocks)} /></td>)}
              <td className={`${cellSpace} text-center`}>{actions(member)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul aria-label="Recurring staff shifts" className="divide-y divide-hairline @min-[58rem]:hidden">
        {staff.map((member) => (
          <li key={member.id} className="px-4 py-3 sm:px-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">{member.name}</h3>
              {actions(member)}
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {week.map((day) => (
                <div key={day.day} className="flex min-w-0 flex-wrap items-baseline gap-x-2 rounded-lg border border-hairline px-2 py-1.5">
                  <dt className="w-7 shrink-0 text-xs font-semibold text-muted">{day.day}</dt>
                  <dd className="min-w-0 text-xs"><ShiftCell {...scheduleCell(day, member, blocks)} /></dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function ShiftCell({ label, tone, note }: ReturnType<typeof scheduleCell>): React.JSX.Element {
  return (
    <>
      {tone === "shift" ? <span className="whitespace-nowrap font-medium tabular-nums text-body">{label}</span>
        : <StatusPill tone={tone}>{label}</StatusPill>}
      {note && <span className="mt-0.5 block wrap-anywhere text-xs text-muted">{note}</span>}
    </>
  );
}
