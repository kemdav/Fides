import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@/components/admin/icon";
import { SelectField } from "@/components/ui/select-field";
import { AvailabilityDialog, DialogButtons, FormError, labelClass } from "./availability-ui";
import { closingDay, defaultShift, weekdays } from "./availability-data";
import type { Shift, StaffSchedule, Weekday } from "./availability-data";
import { TimeField } from "./time-field";

const openDays = weekdays.filter(({ value }) => value !== closingDay.value);

function memberPatterns(member: StaffSchedule): { days: Weekday[]; shift: Shift }[] {
  const patterns = new Map<string, { days: Weekday[]; shift: Shift }>();
  openDays.forEach(({ value }) => {
    const shift = member.shifts[value];
    if (!shift) return;
    const key = [shift.start, shift.end, shift.breakStart, shift.breakEnd].join("/");
    const pattern = patterns.get(key);
    if (pattern) pattern.days.push(value);
    else patterns.set(key, { days: [value], shift });
  });
  return [...patterns.values()];
}

export function ShiftEditor({ staff, initialStaffId, onClose, onSave }: {
  staff: StaffSchedule[];
  initialStaffId?: string;
  onClose: () => void;
  onSave: (member: StaffSchedule) => void;
}): React.JSX.Element | null {
  const [staffId, setStaffId] = useState(initialStaffId ?? staff.at(0)?.id ?? "");
  const member = staff.find(({ id }) => id === staffId);
  if (!member) return null;

  return <ShiftFields key={member.id} member={member} staff={staff} onChangeStaff={setStaffId} onSave={onSave} onClose={onClose} />;
}

function ShiftFields({ member, staff, onChangeStaff, onSave, onClose }: {
  member: StaffSchedule;
  staff: StaffSchedule[];
  onChangeStaff: (id: string) => void;
  onSave: (member: StaffSchedule) => void;
  onClose: () => void;
}): React.JSX.Element {
  const patterns = memberPatterns(member);
  const first = patterns.at(0);
  const [patternId, setPatternId] = useState(first ? "0" : "new");
  const [days, setDays] = useState<Weekday[]>(first?.days ?? []);
  const [shift, setShift] = useState(first?.shift ?? defaultShift);
  const [error, setError] = useState("");
  const pattern = patterns[Number(patternId)];
  const options = patterns.map(({ days: patternDays }, index) => ({ value: String(index), label: patternDays.join(", ") }));
  if (openDays.some(({ value }) => !member.shifts[value])) options.push({ value: "new", label: "Add working days" });

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!days.length && !pattern) return setError("Select at least one working day.");
    if (days.length && (!shift.start || !shift.end || shift.start >= shift.end)) return setError("Shift end must be after shift start.");
    if (days.length && (shift.breakStart || shift.breakEnd) && (
      !shift.breakStart || !shift.breakEnd || shift.breakStart >= shift.breakEnd || shift.breakStart < shift.start || shift.breakEnd > shift.end
    )) return setError("Enter both break times in order and within the shift.");

    const shifts = { ...member.shifts };
    pattern?.days.forEach((day) => delete shifts[day]);
    days.forEach((day) => { shifts[day] = shift; });
    onSave({ ...member, shifts });
  }

  return (
    <AvailabilityDialog title="Edit recurring shift" description={`${member.name} · Weekly working hours`} onClose={onClose}
      onSubmit={save} footer={<DialogButtons onCancel={onClose} submit="Save shift" />}>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-shift-staff">Staff</label>
          <SelectField id="availability-shift-staff" value={member.id} options={staff.map(({ id, name }) => ({ value: id, label: name }))} onChange={onChangeStaff} />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-shift-pattern">Weekly shift</label>
          <SelectField id="availability-shift-pattern" value={patternId} options={options} onChange={(next) => {
            const nextPattern = patterns[Number(next)];
            setPatternId(next);
            setDays(nextPattern?.days ?? []);
            setShift(nextPattern?.shift ?? defaultShift);
            setError("");
          }} />
        </div>
      </div>
      <fieldset className="min-w-0">
        <legend className={labelClass}>Working days</legend>
        <div className="flex flex-wrap gap-2">
          {openDays.map(({ value, label }) => (
            <label key={value} className="flex min-h-10 min-w-12 items-center justify-center rounded-md border border-line px-2 text-sm has-checked:border-burnt has-checked:bg-blush has-checked:font-semibold has-focus-visible:ring-2 has-focus-visible:ring-burnt has-disabled:cursor-default has-disabled:opacity-50">
              <input type="checkbox" className="sr-only" aria-label={label} checked={days.includes(value)}
                disabled={Boolean(member.shifts[value] && !pattern?.days.includes(value))}
                onChange={(event) => setDays((current) => event.target.checked ? [...current, value] : current.filter((day) => day !== value))} />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        {([
          ["start", "Shift starts"], ["end", "Shift ends"], ["breakStart", "Break starts"], ["breakEnd", "Break ends"],
        ] as const).map(([key, label]) => (
          <TimeField key={key} id={`availability-shift-${key}`} label={label} value={shift[key]} optional={key === "breakStart" || key === "breakEnd"}
            onChange={(value) => setShift({ ...shift, [key]: value })} />
        ))}
      </div>
      <p className="flex items-start gap-2 text-sm text-muted">
        <Icon name="check" className="mt-0.5 size-4 text-burnt" />
        <span>Repeats every week. Select No break in both break fields for a continuous shift. Use Add time off for dated leave.</span>
      </p>
    </AvailabilityDialog>
  );
}
