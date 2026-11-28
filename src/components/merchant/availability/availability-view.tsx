"use client";

import { useState } from "react";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
import {
  PageContent,
  PageHeading,
  Surface,
} from "@/components/admin/primitives";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { SuccessFeedbackModal } from "@/components/merchant/services/confirmation-modals";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { MANILA_TIMEZONE } from "@/lib/date-utils";
import type { WorkspaceRole } from "@/lib/merchant/workspace-roles";
import {
  formatBlockDate,
  getWeek,
  isBusinessClosure,
  moveWeek,
  weekLabel,
} from "./availability-calendar";
import {
  closingDay,
  defaultWeek,
  initialBlocks,
  initialResources,
  initialStaff,
  lunch,
} from "./availability-data";
import type { Resource, StaffSchedule, TimeBlock } from "./availability-data";
import {
  AvailabilityManagement,
  ClosureList,
  ResourceList,
} from "./availability-management";
import { surfaceClass } from "./availability-ui";
import { ResourceEditor } from "./resource-editor";
import { ScheduleTable } from "./schedule-table";
import { ShiftEditor } from "./shift-editor";
import { TimeOffEditor } from "./time-off-editor";
import { WeeklyCalendar } from "./weekly-calendar";

type Mode = "table" | "calendar";
type ReturnTo = "resources" | "closures";
type Dialog =
  | { type: ReturnTo }
  | { type: "shift"; staffId?: string }
  | { type: "resource"; resource?: Resource; returnTo?: "resources" }
  | {
      type: "time-off";
      block?: TimeBlock;
      staffId?: string;
      returnTo?: "closures";
    }
  | {
      type: "success";
      title: string;
      description: string;
      returnTo?: ReturnTo;
    };

const modes = [
  { value: "table", label: "Schedule table", icon: "list" },
  { value: "calendar", label: "Weekly calendar", icon: "calendar" },
] as const;

function replaceById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.some(({ id }) => id === updated.id)
    ? items.map((item) => (item.id === updated.id ? updated : item))
    : [...items, updated];
}

export function AvailabilityView({
  basePath,
  businessName,
  userName,
  userRole,
}: {
  basePath: string;
  businessName: string;
  userName?: string;
  userRole: WorkspaceRole;
}): React.JSX.Element {
  const [mode, setMode] = useState<Mode>("table");
  const [monday, setMonday] = useState(defaultWeek);
  const [staff, setStaff] = useState(initialStaff);
  const [resources, setResources] = useState(initialResources);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const week = getWeek(monday);
  const activeResources = resources.filter(({ archived }) => !archived);
  const sortedBlocks = blocks.toSorted(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      Number(b.allDay) - Number(a.allDay) ||
      a.startTime.localeCompare(b.startTime),
  );
  const upcoming = sortedBlocks.filter(
    (block) => isBusinessClosure(block) && block.endDate >= monday,
  );
  const nextClosure = upcoming.at(0);
  const staffOnSchedule = staff.filter(
    ({ shifts }) => Object.keys(shifts).length > 0,
  ).length;

  function closeDialog() {
    const returnTo =
      dialog && "returnTo" in dialog ? dialog.returnTo : undefined;
    setDialog(returnTo ? { type: returnTo } : null);
  }

  function finish(title: string, description: string, returnTo?: ReturnTo) {
    setDialog({ type: "success", title, description, returnTo });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar
        basePath={basePath}
        businessName={businessName}
        userName={userName}
        userRole={userRole}
      />
      <div className="relative min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          <PageHeading
            title="Availability & Resources"
            description="Manage recurring shifts, temporary closures, and the resources services need."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="brand"
                  size="form"
                  onClick={() => setDialog({ type: "resource" })}
                >
                  <span aria-hidden="true">+</span> Add Resource
                </Button>
                <Button
                  variant="secondary"
                  size="form"
                  onClick={() => setDialog({ type: "time-off" })}
                >
                  <span aria-hidden="true">+</span> Add Time Off
                </Button>
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-4">
            <MetricCard
              featured
              icon="users"
              label="Staff on schedule"
              value={staffOnSchedule}
              caption="Staff with recurring shifts"
            />
            <MetricCard
              icon="layers"
              label="Shared resources"
              value={activeResources.length}
              caption="Rooms, chairs, and equipment"
            />
            <MetricCard
              icon="calendar"
              label="Upcoming closures"
              value={upcoming.length}
              caption={
                nextClosure
                  ? `${formatBlockDate(nextClosure.startDate, true)} · ${nextClosure.reason}`
                  : "No upcoming business closures"
              }
            />
            <MetricCard
              icon="clock"
              label="Weekly closing day"
              value={closingDay.label}
              caption="Unavailable for new bookings"
            />
          </div>

          <Surface className={`${surfaceClass} @container`}>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-4 sm:p-6">
              {mode === "table" ? (
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">
                    Recurring staff shifts
                  </h2>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    aria-label="Previous week"
                    className="size-10 p-0!"
                    onClick={() => setMonday((date) => moveWeek(date, -1))}
                  >
                    <Icon name="chevron-left" className="size-4" />
                  </Button>
                  <h2
                    aria-live="polite"
                    className="text-base font-semibold leading-6 text-ink"
                  >
                    {weekLabel(week)}
                  </h2>
                  <Button
                    variant="outline"
                    aria-label="Next week"
                    className="size-10 p-0!"
                    onClick={() => setMonday((date) => moveWeek(date, 1))}
                  >
                    <Icon name="chevron-right" className="size-4" />
                  </Button>
                </div>
              )}
              <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                {mode === "table" ? (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <label
                      htmlFor="availability-week"
                      className="text-sm font-semibold text-muted"
                    >
                      Week
                    </label>
                    <SelectField
                      id="availability-week"
                      compact
                      className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                      value={monday}
                      onChange={setMonday}
                      options={[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
                        const value = moveWeek(monday, offset);
                        return {
                          value,
                          label: weekLabel(getWeek(value), true),
                        };
                      })}
                    />
                  </div>
                ) : (
                  <Button
                    variant="brand-outline"
                    onClick={() => setDialog({ type: "shift" })}
                  >
                    Edit weekly shifts
                  </Button>
                )}
                <div
                  className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-hairline bg-mist p-1"
                  role="group"
                  aria-label="Schedule view"
                >
                  {modes.map(({ value, label, icon }) => (
                    <Button
                      key={value}
                      variant={mode === value ? "brand" : "ghost"}
                      aria-pressed={mode === value}
                      className="gap-1.5 rounded-lg px-2.5! text-xs sm:px-3! sm:text-sm"
                      onClick={() => setMode(value)}
                    >
                      <Icon name={icon} className="size-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {mode === "table" ? (
              <ScheduleTable
                week={week}
                staff={staff}
                blocks={blocks}
                onEditShift={(staffId) => setDialog({ type: "shift", staffId })}
                onAddTimeOff={(staffId) =>
                  setDialog({ type: "time-off", staffId })
                }
              />
            ) : (
              <WeeklyCalendar
                week={week}
                staff={staff}
                blocks={blocks}
                resources={activeResources}
              />
            )}

            <p className="border-t border-hairline px-4 py-3 text-xs leading-5 text-muted sm:px-6">
              {MANILA_TIMEZONE} (UTC+8) · Lunch: {lunch.start}–{lunch.end} ·
              Dated leave and closures override recurring shifts.
            </p>
          </Surface>

          <AvailabilityManagement
            resources={activeResources}
            upcoming={upcoming}
            onManageResources={() => setDialog({ type: "resources" })}
            onManageClosures={() => setDialog({ type: "closures" })}
          />
        </PageContent>
      </div>

      {dialog?.type === "shift" && (
        <ShiftEditor
          staff={staff}
          initialStaffId={dialog.staffId}
          onClose={closeDialog}
          onSave={(member: StaffSchedule) => {
            setStaff((current) => replaceById(current, member));
            finish(
              "Weekly shift saved",
              "Recurring working hours and breaks are updated.",
            );
          }}
        />
      )}
      {dialog?.type === "resources" && (
        <ResourceList
          resources={resources}
          onClose={closeDialog}
          onAdd={() => setDialog({ type: "resource", returnTo: "resources" })}
          onEdit={(resource) =>
            setDialog({ type: "resource", resource, returnTo: "resources" })
          }
        />
      )}
      {dialog?.type === "resource" && (
        <ResourceEditor
          resource={dialog.resource}
          resources={resources}
          onClose={closeDialog}
          onSave={(resource) => {
            setResources((current) => replaceById(current, resource));
            finish(
              "Resource saved",
              "Capacity and linked services are updated.",
              dialog.returnTo,
            );
          }}
          onArchive={(resource) => {
            setResources((current) =>
              replaceById(current, { ...resource, archived: true }),
            );
            finish(
              "Resource archived",
              "This pool is no longer available for new bookings.",
              dialog.returnTo,
            );
          }}
        />
      )}
      {dialog?.type === "closures" && (
        <ClosureList
          blocks={sortedBlocks}
          staff={staff}
          resources={resources}
          onClose={closeDialog}
          onAdd={() => setDialog({ type: "time-off", returnTo: "closures" })}
          onEdit={(block) =>
            setDialog({ type: "time-off", block, returnTo: "closures" })
          }
        />
      )}
      {dialog?.type === "time-off" && (
        <TimeOffEditor
          block={dialog.block}
          initialStaffId={dialog.staffId}
          staff={staff}
          resources={resources}
          onClose={closeDialog}
          onSave={(block) => {
            setBlocks((current) => replaceById(current, block));
            finish(
              "Unavailable time saved",
              "The block is reflected in the schedule.",
              dialog.returnTo,
            );
          }}
          onRemove={(block) => {
            setBlocks((current) => current.filter(({ id }) => id !== block.id));
            finish(
              "Block removed",
              "The time is available according to the remaining booking rules.",
              dialog.returnTo,
            );
          }}
        />
      )}
      {dialog?.type === "success" && (
        <SuccessFeedbackModal
          isOpen
          title={dialog.title}
          description={dialog.description}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
