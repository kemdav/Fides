"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, Surface } from "@/components/admin/primitives";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { AssignSlotModal } from "@/components/merchant/assign-slot-modal";
import { WalkInModal } from "@/components/merchant/walk-in-modal";
import { cancelWaitlistEntryAction } from "@/app/actions/waitlist";

export interface WaitingListEntry {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  estimatedWait: string;
  /** Service length in minutes, used by the assign-slot scheduler. */
  serviceDurationMinutes?: number;
  /** Service price in cents, shown in the assign-slot summary. */
  servicePriceCents?: number;
  /** Recorded staff preference, when the request names someone specific. */
  requestedStaffId?: string;
  /** Full joined_at timestamp, used to order the queue. */
  joinedAtISO?: string;
  notes?: string;
}

export interface AvailableStaffMember {
  id: string;
  staff: string;
  eligibleServices: string;
  resource: string;
  nextAvailability: string;
  /** resources.id for the chair / room this staff member uses. */
  resourceId?: string;
  /** Service names this staff member can perform, used for eligibility checks. */
  eligibleServiceList?: string[];
}

interface WalkInsViewProps {
  businessName?: string;
  userEmail?: string;
  tenantId?: string;
  initialEntries?: WaitingListEntry[];
  availableStaff?: AvailableStaffMember[];
  /** Staff that can take a slot even when not shown in the "Available now" table. */
  staffPool?: AvailableStaffMember[];
  servedTodayCount?: number;
  typicalWait?: string;
  basePath?: string;
  /** Appointment date the assign-slot modal schedules against. */
  dateISO?: string;
  dateLabel?: string;
}

const ALL_STAFF = "All";

/** Today's date in the shop's timezone (Asia/Manila), with a display label. */
function manilaDateDefaults(): { iso: string; label: string } {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return {
    iso: shifted.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(shifted),
  };
}

function WaitingListMenu({
  entry,
  onConvert,
  onRemove,
}: {
  entry: WaitingListEntry;
  onConvert: (entry: WaitingListEntry) => void;
  onRemove: (entry: WaitingListEntry) => void;
}) {
  return (
    <div className="absolute right-4 top-full mt-1 w-56 rounded-[10px] border border-hairline bg-white py-1 z-30 text-left text-sm shadow-lg">
      <button
        type="button"
        onClick={() => onConvert(entry)}
        className="w-full px-4 py-2 text-left text-body hover:bg-mist"
      >
        Convert to appointment
      </button>
      <button
        type="button"
        onClick={() => onRemove(entry)}
        className="w-full px-4 py-2 text-left font-medium text-danger hover:bg-danger-bg"
      >
        Remove from waiting list
      </button>
    </div>
  );
}

const EMPTY_ENTRIES: WaitingListEntry[] = [];
const EMPTY_STAFF: AvailableStaffMember[] = [];

export function WalkInsView({
  businessName = "Bella Vita",
  userEmail = "Maria Santos",
  tenantId,
  initialEntries = EMPTY_ENTRIES,
  availableStaff = EMPTY_STAFF,
  staffPool,
  servedTodayCount = 0,
  typicalWait = "15 min",
  basePath = "",
  dateISO,
  dateLabel,
}: WalkInsViewProps) {
  const [entries, setEntries] = React.useState<WaitingListEntry[]>(initialEntries);
  const [prevInitialEntries, setPrevInitialEntries] = React.useState<WaitingListEntry[]>(initialEntries);
  if (initialEntries !== prevInitialEntries) {
    setPrevInitialEntries(initialEntries);
    setEntries(initialEntries);
  }

  const [servedToday, setServedToday] = React.useState(servedTodayCount);
  const [prevServedTodayCount, setPrevServedTodayCount] = React.useState(servedTodayCount);
  if (servedTodayCount !== prevServedTodayCount) {
    setPrevServedTodayCount(servedTodayCount);
    setServedToday(servedTodayCount);
  }

  const [searchQuery, setSearchQuery] = React.useState("");
  const [staffFilter, setStaffFilter] = React.useState(ALL_STAFF);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [assignEntryId, setAssignEntryId] = React.useState<string | null>(null);
  const [preferredStaffId, setPreferredStaffId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isFilterOpen && !activeMenuId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-menu-container]")) {
        setIsFilterOpen(false);
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFilterOpen(false);
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen, activeMenuId]);

  const [fallbackDate] = React.useState(manilaDateDefaults);
  const modalDateISO = dateISO ?? fallbackDate.iso;
  const modalDateLabel = dateLabel ?? fallbackDate.label;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const staffOptions = React.useMemo(
    () => [ALL_STAFF, ...Array.from(new Set(entries.map((entry) => entry.staff)))],
    [entries],
  );

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      entry.customer.toLowerCase().includes(query) ||
      entry.service.toLowerCase().includes(query) ||
      entry.staff.toLowerCase().includes(query);
    const matchesStaff = staffFilter === ALL_STAFF || entry.staff === staffFilter;
    return matchesSearch && matchesStaff;
  });

  const nextStaff = availableStaff[0];
  const eligibilityPool = staffPool ?? availableStaff;
  const assignEntry = entries.find((entry) => entry.id === assignEntryId) ?? null;

  const handleConvert = (entry: WaitingListEntry) => {
    setActiveMenuId(null);
    if (eligibilityPool.length === 0) {
      showToast("No staff available to convert this walk-in.");
      return;
    }
    setPreferredStaffId(null);
    setAssignEntryId(entry.id);
  };

  const handleRemove = async (entry: WaitingListEntry) => {
    setActiveMenuId(null);
    setEntries((prev) => prev.filter((item) => item.id !== entry.id));
    if (tenantId) {
      const result = await cancelWaitlistEntryAction({
        waitlistEntryId: entry.id,
        tenantIdParam: tenantId,
      });
      if (!result.success) {
        showToast(result.error);
        return;
      }
    }
    showToast(`${entry.customer} removed from the waiting list.`);
  };

  const handleAssignNext = (staff: AvailableStaffMember) => {
    setActiveMenuId(null);
    if (entries.length === 0) {
      showToast("No walk-ins waiting to assign.");
      return;
    }
    const entry = entries[0];
    if (!eligibilityPool.some((member) => member.id === staff.id)) {
      showToast(`No eligible staff matched ${entry.service}.`);
      return;
    }
    setPreferredStaffId(staff.id);
    setAssignEntryId(entry.id);
  };

  const handleAssigned = ({
    entryId,
  }: {
    entryId: string;
    staffName: string;
    startsAt: string;
    endsAt: string;
  }) => {
    setEntries((prev) => prev.filter((item) => item.id !== entryId));
    setServedToday((count) => count + 1);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar businessName={businessName} userEmail={userEmail} basePath={basePath} />

      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            title="Walk-ins & waiting list"
            description="Welcome every walk-in. Fill available slots without displacing existing bookings."
            actions={
              <AdminButton variant="primary" size="xs" onClick={() => setIsWalkInOpen(true)}>
                + Add walk-in
              </AdminButton>
            }
          />

          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard
              featured
              label="Waiting now"
              value={entries.length}
              caption="First come, first served"
              icon="clock"
              progress={100}
            />
            <MetricCard
              label="Available staff"
              value={availableStaff.length}
              caption={
                nextStaff
                  ? `${nextStaff.staff} · next slot ${nextStaff.nextAvailability}`
                  : "No staff available right now"
              }
              icon="users"
              progress={30}
            />
            <MetricCard
              label="Walk-ins served today"
              value={servedToday}
              caption="No scheduled bookings displaced"
              icon="check"
              progress={40}
            />
            <MetricCard
              label="Typical waiting time"
              value={typicalWait}
              caption="Based on the current queue"
              icon="clock"
              progress={65}
            />
          </div>

          {/* Active Waiting Lists */}
          <Surface className="overflow-hidden !p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-6 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">Active Waiting Lists</h2>
                </div>
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-mist text-xs font-semibold leading-none text-ink">
                  {entries.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer or service"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-10 w-56 rounded-lg border border-hairline bg-white pl-9 pr-3 text-sm text-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-burnt/40 sm:w-72"
                  />
                  <Icon name="search" className="pointer-events-none absolute left-3 top-3 size-4 text-glyph" />
                </div>

                <div className="relative" data-menu-container>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen((open) => !open)}
                    className="flex h-10 items-center gap-2 rounded-lg border border-hairline bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 text-glyph" aria-hidden>
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>{staffFilter === ALL_STAFF ? "Filter" : `Filter (${staffFilter})`}</span>
                    <Icon name="chevron-down" className="size-3.5 text-glyph" />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute right-0 z-20 mt-1 w-48 rounded-[10px] border border-hairline bg-white py-1 text-sm shadow-lg">
                      {staffOptions.map((staff) => (
                        <button
                          key={staff}
                          type="button"
                          onClick={() => {
                            setStaffFilter(staff);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-mist ${
                            staffFilter === staff ? "font-semibold text-burnt" : "text-body"
                          }`}
                        >
                          {staff}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-hairline border-t border-hairline md:hidden">
              {filteredEntries.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-subtle">No walk-ins waiting.</p>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted">{entry.time}</p>
                        <p className="mt-1 truncate text-base font-semibold text-ink">{entry.customer}</p>
                        <p className="mt-1 text-sm text-muted">{entry.service}</p>
                      </div>
                      <div className="text-right text-xs text-muted">
                        <p>{entry.staff}</p>
                        <p className="mt-1 font-medium text-ink">{entry.estimatedWait}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
                      <AdminButton size="xs" variant="primary" onClick={() => handleConvert(entry)}>
                        Convert
                      </AdminButton>
                      <AdminButton size="xs" variant="outline" onClick={() => handleRemove(entry)}>
                        Remove
                      </AdminButton>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-hairline text-xs font-medium text-subtle">
                  <tr>
                    {["Time", "Customer", "Service", "Staff", "Est. wait", "Action"].map((header, index) => (
                      <th
                        key={header}
                        className={`px-5 pb-3 pt-5 leading-4 ${index === 5 ? "text-right" : ""}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-xs text-subtle">
                        No walk-ins waiting.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={`transition-colors hover:bg-mist ${
                          index < filteredEntries.length - 1 ? "border-b border-hairline" : ""
                        }`}
                      >
                        <td className="px-5 py-3 font-medium text-body">{entry.time}</td>
                        <td className="px-5 py-3 font-semibold text-ink">{entry.customer}</td>
                        <td className="px-5 py-3 text-muted">{entry.service}</td>
                        <td className="px-5 py-3 text-muted">{entry.staff}</td>
                        <td className="px-5 py-3 text-muted">{entry.estimatedWait}</td>
                        <td className="relative px-5 py-3 text-right" data-menu-container>
                          <button
                            type="button"
                            aria-label={`Actions for ${entry.customer}`}
                            onClick={() =>
                              setActiveMenuId((id) => (id === `entry-${entry.id}` ? null : `entry-${entry.id}`))
                            }
                            className="ml-auto flex size-9 items-center justify-center rounded-lg text-glyph transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                          >
                            <Icon name="more" weight="fill" className="size-5" />
                          </button>
                          {activeMenuId === `entry-${entry.id}` && (
                            <WaitingListMenu entry={entry} onConvert={handleConvert} onRemove={handleRemove} />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="px-4 pb-6 pt-5 text-xs text-muted sm:px-6">
              A customer is converted to an appointment only when the selected staff and resource are available.
            </p>
          </Surface>

          {/* Available now */}
          <Surface className="overflow-hidden !p-0">
            <div className="px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
              <h2 className="text-xl font-semibold leading-7 text-ink">Available now</h2>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-hairline border-t border-hairline md:hidden">
              {availableStaff.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-subtle">No staff available right now.</p>
              ) : (
                availableStaff.map((staff) => (
                  <div key={staff.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-ink">{staff.staff}</p>
                        <p className="mt-1 text-sm text-muted">{staff.eligibleServices}</p>
                        <p className="mt-1 text-xs text-muted">
                          {staff.resource} · Next {staff.nextAvailability}
                        </p>
                      </div>
                      <AdminButton size="xs" variant="outline" onClick={() => handleAssignNext(staff)}>
                        Assign
                      </AdminButton>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto pb-4 md:block sm:pb-6">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-hairline text-xs font-medium text-subtle">
                  <tr>
                    {["Staff", "Eligible services", "Resource", "Next availability", "Action"].map(
                      (header, index) => (
                        <th
                          key={header}
                          className={`px-5 pb-3 pt-5 leading-4 ${index === 4 ? "text-right" : ""}`}
                        >
                          {header}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {availableStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-xs text-subtle">
                        No staff available right now.
                      </td>
                    </tr>
                  ) : (
                    availableStaff.map((staff, index) => (
                      <tr
                        key={staff.id}
                        className={`transition-colors hover:bg-mist ${
                          index < availableStaff.length - 1 ? "border-b border-hairline" : ""
                        }`}
                      >
                        <td className="px-5 py-3 font-semibold text-ink">{staff.staff}</td>
                        <td className="px-5 py-3 text-muted">{staff.eligibleServices}</td>
                        <td className="px-5 py-3 text-muted">{staff.resource}</td>
                        <td className="px-5 py-3 text-muted">{staff.nextAvailability}</td>
                        <td className="relative px-5 py-3 text-right" data-menu-container>
                          <button
                            type="button"
                            aria-label={`Actions for ${staff.staff}`}
                            onClick={() =>
                              setActiveMenuId((id) => (id === `staff-${staff.id}` ? null : `staff-${staff.id}`))
                            }
                            className="ml-auto flex size-9 items-center justify-center rounded-lg text-glyph transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                          >
                            <Icon name="more" weight="fill" className="size-5" />
                          </button>
                          {activeMenuId === `staff-${staff.id}` && (
                            <div className="absolute right-4 top-full mt-1 w-52 rounded-[10px] border border-hairline bg-white py-1 z-30 text-left text-sm shadow-lg">
                              <button
                                type="button"
                                onClick={() => handleAssignNext(staff)}
                                className="w-full px-4 py-2 text-left text-body hover:bg-mist"
                              >
                                Assign next walk-in
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Surface>
        </PageContent>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-[10px] bg-ink px-4 py-2.5 text-xs font-medium text-white shadow-xl">
          {toastMessage}
        </div>
      )}

      <AssignSlotModal
        isOpen={assignEntry !== null}
        entry={assignEntry}
        entries={entries}
        staffPool={eligibilityPool}
        preferredStaffId={preferredStaffId ?? undefined}
        dateISO={modalDateISO}
        dateLabel={modalDateLabel}
        tenantId={tenantId}
        onClose={() => {
          setAssignEntryId(null);
          setPreferredStaffId(null);
        }}
        onAssigned={handleAssigned}
        showToast={showToast}
      />

      <WalkInModal
        isOpen={isWalkInOpen}
        tenantId={tenantId}
        onClose={() => setIsWalkInOpen(false)}
        onCreated={() => {
          setServedToday((count) => count + 1);
        }}
        onAddedToWaitlist={(newEntry) => {
          setEntries((prev) => [
            ...prev,
            {
              id: newEntry.id,
              time: newEntry.time,
              customer: newEntry.customer,
              service: newEntry.service,
              staff: newEntry.staff,
              estimatedWait: `${(prev.length + 1) * 15} min`,
              serviceDurationMinutes: 60,
              servicePriceCents: 45000,
            },
          ]);
        }}
        showToast={showToast}
      />
    </div>
  );
}
