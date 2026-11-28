import { useState } from "react";
import type { FormEvent } from "react";
import { Checkbox } from "@/components/admin/primitives";
import { DatePicker } from "@/components/ui/date-picker";
import { inputClasses } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import type { SelectOption } from "@/components/ui/select-field";
import { allTargets, blockTypes, defaultShift } from "./availability-data";
import type { Resource, StaffSchedule, TimeBlock } from "./availability-data";
import { AvailabilityConfirmation, AvailabilityDialog, DialogButtons, FormError, labelClass } from "./availability-ui";
import { TimeField } from "./time-field";

const everyone = { value: allTargets, label: "All staff and resources" };

function targetOptions(kind: TimeBlock["kind"], staff: StaffSchedule[], resources: Resource[]): SelectOption[] {
  const members = staff.map(({ id, name }) => ({ value: id, label: name }));
  const pools = resources.map(({ id, name }) => ({ value: id, label: name }));
  switch (kind) {
    case "holiday":
    case "closure": return [everyone];
    case "leave": return members;
    case "break": return [everyone, ...members, ...pools];
    case "resource": return pools;
  }
}

export function TimeOffEditor({ block, initialStaffId, staff, resources, onClose, onSave, onRemove }: {
  block?: TimeBlock;
  initialStaffId?: string;
  staff: StaffSchedule[];
  resources: Resource[];
  onClose: () => void;
  onSave: (block: TimeBlock) => void;
  onRemove: (block: TimeBlock) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<TimeBlock>(() => block ?? ({
    id: "", kind: "leave", target: initialStaffId ?? staff.at(0)?.id ?? "",
    allDay: true, startDate: "", endDate: "", startTime: defaultShift.start, endTime: defaultShift.end, reason: "",
  }));
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const selectableResources = resources.filter(({ id, archived }) => !archived || id === block?.target);
  const targets = targetOptions(draft.kind, staff, selectableResources);

  function changeKind(kind: TimeBlock["kind"]) {
    const nextTargets = targetOptions(kind, staff, selectableResources);
    const target = nextTargets.some(({ value }) => value === draft.target) ? draft.target : nextTargets.at(0)?.value ?? "";
    setDraft({ ...draft, kind, target });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targets.some(({ value }) => value === draft.target)) return setError("Choose who or what this block applies to.");
    if (!draft.startDate || !draft.endDate) return setError("Select a start date and an end date.");
    if (draft.endDate < draft.startDate) return setError("End date must be on or after the start date.");
    if (!draft.allDay && (!draft.startTime || !draft.endTime || (draft.startDate === draft.endDate && draft.endTime <= draft.startTime))) {
      return setError("Enter a start and end time with the end after the start.");
    }
    const reason = draft.reason.trim();
    if (!reason) return setError("Enter a reason for this block.");
    onSave({ ...draft, reason, id: draft.id || crypto.randomUUID() });
  }

  if (block && confirm) {
    return <AvailabilityConfirmation title="Remove this block?"
      description="The blocked time will become available again, subject to staff and resource availability."
      onClose={() => setConfirm(false)} action={{ label: "Remove block", onSelect: () => onRemove(block) }} />;
  }

  return (
    <AvailabilityDialog title={block ? "Edit unavailable time" : "Add time off or closure"}
      description="Block bookings for selected staff, resources, or the whole business." onClose={onClose} onSubmit={save}
      footer={<DialogButtons onCancel={onClose} submit={block ? "Save changes" : "Save unavailable time"}
        destructive={block ? { label: "Remove block", onSelect: () => setConfirm(true) } : undefined} />}>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-block-type">Type</label>
          <SelectField id="availability-block-type" value={draft.kind} options={blockTypes} onChange={changeKind} />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-block-target">Applies to</label>
          <SelectField id="availability-block-target" value={draft.target} options={targets} disabled={targets.length === 1 && draft.target === allTargets}
            onChange={(target) => setDraft({ ...draft, target })} />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-block-start">Start date</label>
          <DatePicker id="availability-block-start" ariaLabel="Start date" value={draft.startDate} onChange={(startDate) => setDraft({
            ...draft, startDate, endDate: draft.endDate >= startDate ? draft.endDate : startDate,
          })} />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-block-end">End date</label>
          <DatePicker id="availability-block-end" ariaLabel="End date" value={draft.endDate} min={draft.startDate || undefined}
            onChange={(endDate) => setDraft({ ...draft, endDate })} />
        </div>
      </div>
      <Checkbox label="All day" tone="brand" className="min-h-10" checked={draft.allDay} onChange={(allDay) => setDraft({ ...draft, allDay })} />
      {!draft.allDay && <div className="grid grid-cols-2 gap-4">
        {([["startTime", "Start time"], ["endTime", "End time"]] as const).map(([key, label]) => (
          <TimeField key={key} id={`availability-block-${key}`} label={label} value={draft[key]}
            onChange={(value) => setDraft({ ...draft, [key]: value })} />
        ))}
      </div>}
      <label className="block">
        <span className={labelClass}>Reason</span>
        <textarea value={draft.reason} className={inputClasses(false, true)} rows={2} maxLength={200} required
          placeholder="e.g. Approved personal leave" onChange={(event) => setDraft({ ...draft, reason: event.target.value })} />
      </label>
    </AvailabilityDialog>
  );
}
