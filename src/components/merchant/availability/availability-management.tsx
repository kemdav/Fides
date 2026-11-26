import { Icon } from "@/components/admin/icon";
import { StatusPill, Surface } from "@/components/admin/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { blockDateLabel, formatBlockDate } from "./availability-calendar";
import { allTargets, blockTypes, services } from "./availability-data";
import type { Resource, StaffSchedule, TimeBlock } from "./availability-data";
import { AvailabilityDialog, RowActions, surfaceClass, tableHeaderClass, tableRowClass } from "./availability-ui";

const headSpace = "px-3 py-3 sm:px-5";
const cellSpace = "px-3 py-3.5 sm:px-5";

function ResourceTable({ resources, onEdit }: { resources: Resource[]; onEdit?: (resource: Resource) => void }) {
  if (!resources.length) return <p className="px-4 py-5 text-sm text-muted sm:px-6">No shared resources yet.</p>;
  return (
    <table className="w-full table-fixed text-left text-sm">
      <caption className="sr-only">Shared resource pools and service links</caption>
      <thead>
        <tr className={tableHeaderClass}>
          <th scope="col" className={cn(headSpace, "w-[34%]")}>Resource</th>
          <th scope="col" className={headSpace}>Linked service</th>
          <th scope="col" className="w-19 px-2 py-3 text-right sm:w-25 sm:pr-5">Capacity</th>
          {onEdit && <th scope="col" className="w-12 px-1 py-3 text-right sm:w-16"><span className="sr-only">Action</span></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {resources.map((resource) => {
          const linked = services.filter(({ id }) => resource.serviceIds.includes(id)).map(({ name }) => name);
          return (
            <tr key={resource.id} className={tableRowClass}>
              <th scope="row" className={cn(cellSpace, "wrap-anywhere font-semibold text-ink")}>
                {resource.name}
                {onEdit && <StatusPill tone={resource.archived ? "neutral" : "success"} className="mt-1 w-fit flex! whitespace-normal!">{resource.archived ? "Archived" : "Active"}</StatusPill>}
              </th>
              <td className={cn(cellSpace, "break-words text-muted")}>{linked.join(", ") || "—"}</td>
              <td className="px-2 py-3.5 text-right font-semibold wrap-anywhere tabular-nums text-ink sm:pr-5">{resource.capacity}</td>
              {onEdit && <td className="px-1 text-center">{!resource.archived && <RowActions label={`Actions for ${resource.name}`} actions={[
                { label: "Edit resource", onSelect: () => onEdit(resource) },
              ]} />}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function AvailabilityManagement({ resources, upcoming, onManageResources, onManageClosures }: {
  resources: Resource[];
  upcoming: TimeBlock[];
  onManageResources: () => void;
  onManageClosures: () => void;
}): React.JSX.Element {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Surface className={surfaceClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-4 sm:px-6">
          <h2 className="text-base font-semibold leading-6 text-ink">Shared resources</h2>
          <Button variant="outline" onClick={onManageResources}>Manage resources</Button>
        </div>
        <ResourceTable resources={resources} />
      </Surface>
      <Surface className={surfaceClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline p-4 sm:px-6">
          <h2 className="text-base font-semibold leading-6 text-ink">Upcoming closures</h2>
          <Button variant="outline" onClick={onManageClosures}>Manage closures</Button>
        </div>
        {upcoming.length ? (
          <ul className="divide-y divide-hairline">
            {upcoming.map((block) => (
              <li key={block.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-blush text-burnt"><Icon name="calendar" className="size-5" /></span>
                <div className="min-w-0">
                  <p className="wrap-anywhere text-sm font-semibold text-ink">
                    {block.startDate === block.endDate ? formatBlockDate(block.startDate) : blockDateLabel(block)} · {block.reason}
                  </p>
                  <p className="mt-1 text-xs text-muted">All staff and resources unavailable for bookings</p>
                  {!block.allDay && <p className="mt-1 text-xs tabular-nums text-muted">{block.startTime}–{block.endTime}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-5 text-sm text-muted sm:px-6">No upcoming business closures.</p>}
      </Surface>
    </div>
  );
}

export function ResourceList({ resources, onClose, onAdd, onEdit }: {
  resources: Resource[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (resource: Resource) => void;
}): React.JSX.Element {
  return (
    <AvailabilityDialog wide title="Shared resource pools"
      description="Manage which services use each resource and how many simultaneous bookings it supports." onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="brand" onClick={onAdd}>Add resource</Button></>}>
      <div className="rounded-xl border border-hairline"><ResourceTable resources={resources} onEdit={onEdit} /></div>
    </AvailabilityDialog>
  );
}

export function ClosureList({ blocks, staff, resources, onClose, onAdd, onEdit }: {
  blocks: TimeBlock[];
  staff: StaffSchedule[];
  resources: Resource[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (block: TimeBlock) => void;
}): React.JSX.Element {
  return (
    <AvailabilityDialog wide title="Closures & approved leave"
      description="Manage dated blocks for staff leave, breaks, and business closures." onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="brand" onClick={onAdd}>Add time off or closure</Button></>}>
      {blocks.length ? (
        <div className="rounded-xl border border-hairline">
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">Dated closures, breaks, and approved leave</caption>
            <thead><tr className={tableHeaderClass}>
              <th scope="col" className={cn(headSpace, "w-[34%]")}>Date</th>
              <th scope="col" className={headSpace}>Type</th>
              <th scope="col" className="px-2 py-3 sm:px-5">Applies to</th>
              <th scope="col" className="w-12 sm:w-16"><span className="sr-only">Action</span></th>
            </tr></thead>
            <tbody className="divide-y divide-hairline">
              {blocks.map((block) => (
                <tr key={block.id} className={tableRowClass}>
                  <th scope="row" className={cn(cellSpace, "font-medium text-ink")}>
                    {blockDateLabel(block)}
                    {!block.allDay && <span className="mt-1 block text-xs tabular-nums text-muted">{block.startTime}–{block.endTime}</span>}
                  </th>
                  <td className={cn(cellSpace, "wrap-anywhere text-body")}>
                    {blockTypes.find(({ value }) => value === block.kind)?.label}
                    <span className="mt-1 block text-xs text-muted">{block.reason}</span>
                  </td>
                  <td className="px-2 py-3.5 wrap-anywhere text-muted sm:px-5">
                    {block.target === allTargets ? "All staff and resources" : [...staff, ...resources].find(({ id }) => id === block.target)?.name}
                  </td>
                  <td className="text-center"><RowActions label={`Actions for ${block.reason}`} actions={[
                    { label: "Edit unavailable time", onSelect: () => onEdit(block) },
                  ]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-muted">No closures, breaks, or leave have been scheduled.</p>}
    </AvailabilityDialog>
  );
}
