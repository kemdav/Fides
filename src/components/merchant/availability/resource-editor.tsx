import { useState } from "react";
import type { FormEvent } from "react";
import { CheckboxDropdown } from "@/components/admin/checkbox-dropdown";
import { inputClasses } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { resourceHours, resourceTypes, services } from "./availability-data";
import type { Resource } from "./availability-data";
import { AvailabilityConfirmation, AvailabilityDialog, DialogButtons, FormError, labelClass } from "./availability-ui";

export function ResourceEditor({ resource, resources, onClose, onSave, onArchive }: {
  resource?: Resource;
  resources: Resource[];
  onClose: () => void;
  onSave: (resource: Resource) => void;
  onArchive: (resource: Resource) => void;
}): React.JSX.Element {
  const [name, setName] = useState(resource?.name ?? "");
  const [type, setType] = useState<Resource["type"]>(resource?.type ?? "chair");
  const [hours, setHours] = useState<Resource["hours"]>(resource?.hours ?? "business");
  const [capacity, setCapacity] = useState(String(resource?.capacity ?? 1));
  const [serviceIds, setServiceIds] = useState(resource?.serviceIds ?? []);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError("Enter a resource name.");
    if (resources.some((item) => item.id !== resource?.id && !item.archived && item.name.toLowerCase() === trimmedName.toLowerCase())) {
      return setError("An active resource already uses this name.");
    }
    const count = Number(capacity);
    if (!Number.isSafeInteger(count) || count < 1) return setError("Enter a whole-number capacity of at least 1.");
    if (!serviceIds.length) return setError("Select at least one eligible service.");
    onSave({ id: resource?.id ?? crypto.randomUUID(), name: trimmedName, type, hours, capacity: count, serviceIds, archived: false });
  }

  if (resource && confirm) {
    return <AvailabilityConfirmation title="Archive resource?" warning
      description="New bookings can no longer be assigned to this pool. Existing bookings are retained."
      onClose={() => setConfirm(false)} action={{ label: "Archive resource", onSelect: () => onArchive(resource) }} />;
  }

  return (
    <AvailabilityDialog title={resource ? "Edit shared resource" : "Add shared resource"}
      description="Link a room, chair, or piece of equipment to eligible services." onClose={onClose} onSubmit={save}
      footer={<DialogButtons onCancel={onClose} submit="Save resource"
        destructive={resource ? { label: "Archive resource", onSelect: () => setConfirm(true) } : undefined} />}>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-resource-name">Resource name</label>
          <input id="availability-resource-name" className={inputClasses()} value={name} required maxLength={80}
            placeholder="e.g. Chair C" onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-resource-type">Resource type</label>
          <SelectField id="availability-resource-type" value={type} options={resourceTypes} onChange={setType} />
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-resource-capacity">Capacity</label>
          <input id="availability-resource-capacity" className={`${inputClasses()} tabular-nums`} type="number" min={1} step={1} required
            aria-describedby="availability-capacity-note" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
          <p id="availability-capacity-note" className="mt-1.5 text-xs text-muted">Maximum simultaneous bookings for this pool.</p>
        </div>
        <div className="min-w-0">
          <label className={labelClass} htmlFor="availability-resource-hours">Availability</label>
          <SelectField id="availability-resource-hours" value={hours} options={resourceHours} onChange={setHours} />
        </div>
      </div>
      <CheckboxDropdown label="Eligible services" description="Choose which services can use this resource."
        options={services} value={serviceIds} onChange={setServiceIds} selectedLabel="Linked services"
        selectionSummary={(count) => count ? `${count} selected` : "Select services"} emptyMessage="No services available." />
    </AvailabilityDialog>
  );
}
