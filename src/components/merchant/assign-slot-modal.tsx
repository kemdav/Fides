"use client";

import * as React from "react";
import {
  assignWaitlistSlotAction,
  getStaffBusySlotsAction,
  type BusySlot,
} from "@/app/actions/waitlist";
import { AdminButton } from "@/components/admin/admin-button";
import { ConfirmationDialog } from "@/components/merchant/walk-ins/confirmation-dialog";
import type { AvailableStaffMember, WaitingListEntry } from "@/components/merchant/walk-ins/walk-ins-view";

const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_PRICE_CENTS = 45000;
const TIMEZONE_LABEL = "Asia/Manila (UTC+8)";

interface AssignSlotModalProps {
  isOpen: boolean;
  entry: WaitingListEntry | null;
  entries: WaitingListEntry[];
  staffPool: AvailableStaffMember[];
  preferredStaffId?: string;
  dateISO: string;
  dateLabel: string;
  tenantId?: string;
  onClose: () => void;
  onAssigned: (result: { entryId: string; staffName: string; startsAt: string; endsAt: string }) => void;
  showToast: (message: string) => void;
}

interface DraftState {
  entryId: string;
  startMinutes: number;
  notes: string;
  notify: boolean;
}

function parseTimeToMinutes(value: string): number {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 10 * 60;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function formatTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function formatPeso(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH")}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Builds an Asia/Manila (UTC+8) ISO timestamp without relying on the host timezone. */
function toManilaISO(dateISO: string, totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${dateISO}T${pad(hours)}:${pad(minutes)}:00+08:00`;
}

interface TimeOption {
  startMinutes: number;
  available: boolean;
}

function buildTimeOptions(
  nextAvailability: string,
  dateISO: string,
  durationMinutes: number,
  busySlots: BusySlot[],
): TimeOption[] {
  const base = parseTimeToMinutes(nextAvailability);
  const options: TimeOption[] = [];

  const startBound = Math.max(480, base - 15);
  const endBound = Math.min(1200, Math.max(base + 240, 720));

  for (let m = startBound; m <= endBound && options.length < 16; m += 15) {
    const slotStartISO = toManilaISO(dateISO, m);
    const slotEndISO = toManilaISO(dateISO, m + durationMinutes);

    const overlapsBusy = busySlots.some(
      (b) => slotStartISO < b.endsAt && slotEndISO > b.startsAt,
    );
    const isAvailable = !overlapsBusy && m >= base;

    options.push({ startMinutes: m, available: isAvailable });
  }

  if (!options.some((o) => o.available)) {
    options.push({ startMinutes: base, available: true });
  }

  return options;
}

function resolveAssignedStaff(
  entry: WaitingListEntry,
  staffPool: AvailableStaffMember[],
  preferredStaffId?: string,
): AvailableStaffMember | null {
  if (preferredStaffId) {
    const preferred = staffPool.find((member) => member.id === preferredStaffId);
    if (preferred) return preferred;
  }

  if (entry.staff !== "Any available") {
    const requested = staffPool.find((member) => member.staff === entry.staff);
    if (requested) return requested;
  }

  const eligible = staffPool.find((member) => {
    const list = member.eligibleServiceList;
    if (list && list.length > 0) return list.some((service) => service === entry.service);
    return member.eligibleServices.toLowerCase().includes(entry.service.toLowerCase());
  });

  return eligible ?? staffPool[0] ?? null;
}

export function AssignSlotModal({
  isOpen,
  entry,
  entries,
  staffPool,
  preferredStaffId,
  dateISO,
  dateLabel,
  tenantId,
  onClose,
  onAssigned,
  showToast,
}: AssignSlotModalProps) {
  const [draft, setDraft] = React.useState<DraftState | null>(null);
  const [isTimeOpen, setIsTimeOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const [busySlots, setBusySlots] = React.useState<BusySlot[]>([]);
  const timeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setIsConfirmed(false);
    }
  }, [isOpen]);

  const durationMinutes = entry?.serviceDurationMinutes ?? DEFAULT_DURATION_MINUTES;
  const priceCents = entry?.servicePriceCents ?? DEFAULT_PRICE_CENTS;
  const assignedStaff = entry ? resolveAssignedStaff(entry, staffPool, preferredStaffId) : null;

  React.useEffect(() => {
    if (!isOpen || !assignedStaff?.id || !tenantId) return;
    let cancelled = false;
    getStaffBusySlotsAction({
      tenantIdParam: tenantId,
      staffId: assignedStaff.id,
      resourceId: assignedStaff.resourceId,
      dateISO,
    }).then((res) => {
      if (!cancelled && res.success && res.data) {
        setBusySlots(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, assignedStaff?.id, assignedStaff?.resourceId, tenantId, dateISO]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isTimeOpen) return;
    const handler = (event: MouseEvent) => {
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
        setIsTimeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isTimeOpen]);

  if (!isOpen || !entry) return null;

  const timeOptions = buildTimeOptions(
    assignedStaff?.nextAvailability ?? "10:45 AM",
    dateISO,
    durationMinutes,
    busySlots,
  );
  const defaultOption = timeOptions.find((option) => option.available) ?? timeOptions[0];

  const activeDraft = draft && draft.entryId === entry.id ? draft : null;
  const startMinutes = activeDraft?.startMinutes ?? defaultOption.startMinutes;
  const notes = activeDraft?.notes ?? "";
  const notify = activeDraft?.notify ?? true;
  const selectedOption = timeOptions.find((option) => option.startMinutes === startMinutes) ?? null;
  const hasConflict = selectedOption ? !selectedOption.available : false;
  const recommendedTime = formatTime(defaultOption.startMinutes);
  const conflictMessage = `This slot overlaps an existing booking or staff/resource availability. Choose ${recommendedTime} to continue.`;

  const position = entries.findIndex((item) => item.id === entry.id);
  const positionLabel = position >= 0 ? position + 1 : 1;
  const remaining = entries.filter((item) => item.id !== entry.id);
  const nextInQueue = remaining[0];

  const updateDraft = (patch: Partial<Omit<DraftState, "entryId">>) => {
    setDraft({
      entryId: entry.id,
      startMinutes,
      notes,
      notify,
      ...patch,
    });
  };

  const handleSelectTime = (option: TimeOption) => {
    updateDraft({ startMinutes: option.startMinutes });
    setIsTimeOpen(false);
    setError(option.available ? null : conflictMessage);
  };

  const handleConfirm = async () => {
    if (!assignedStaff || hasConflict || isSubmitting) return;

    const startsAt = toManilaISO(dateISO, startMinutes);
    const endsAt = toManilaISO(dateISO, startMinutes + durationMinutes);

    setIsSubmitting(true);
    setError(null);

    try {
      if (tenantId) {
        const result = await assignWaitlistSlotAction({
          waitlistEntryId: entry.id,
          tenantIdParam: tenantId,
          staffId: assignedStaff.id,
          staffName: assignedStaff.staff,
          resourceId: assignedStaff.resourceId,
          resourceName: assignedStaff.resource,
          serviceName: entry.service,
          priceCents,
          startsAt,
          durationMinutes,
          notes: notes.trim() || undefined,
          notify,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        // Preview route runs without a tenant/session — simulate the write locally.
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      onAssigned({
        entryId: entry.id,
        staffName: assignedStaff.staff,
        startsAt,
        endsAt,
      });
      setIsConfirmed(true);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Failed to assign this slot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfirmed) {
    return (
      <ConfirmationDialog
        isOpen={isConfirmed}
        title="Slot assigned"
        description="Appointment confirmed. The customer has left the queue."
        onDone={() => {
          setIsConfirmed(false);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-2 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-slot-title"
        className="max-h-[96dvh] w-full max-w-[928px] overflow-y-auto rounded-[10px] bg-white px-5 py-5 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 sm:px-7 sm:py-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="assign-slot-title" className="font-display text-[28px] leading-9 text-body">
            Assign a slot
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assign slot dialog"
            className="text-2xl leading-none text-glyph hover:text-ink"
          >
            ×
          </button>
        </div>

        {/* Original request summary */}
        <div className="mt-4 rounded-lg bg-mist px-4 py-3">
          <p className="text-[11px] font-medium uppercase leading-4 tracking-wide text-muted">
            Original request · Position {positionLabel} of {Math.max(entries.length, 1)}
          </p>
          <p className="mt-1 text-[15px] font-semibold leading-6 text-ink">
            {entry.customer} · {entry.service} · {entry.staff} · joined {entry.time}
          </p>
        </div>

        {/* Service + assigned staff */}
        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <p className="text-sm leading-5 text-muted">Service</p>
            <p className="mt-1 text-base font-semibold leading-6 text-ink">
              {entry.service} · {durationMinutes} min · {formatPeso(priceCents)}
            </p>
          </div>
          <div>
            <p className="text-sm leading-5 text-muted">Assigned staff &amp; resource</p>
            <p className="mt-1 text-base font-semibold leading-6 text-ink">
              {assignedStaff ? `${assignedStaff.staff} · ${assignedStaff.resource}` : "No staff available"}
            </p>
          </div>
        </div>

        {assignedStaff && (
          <p className="mt-3 text-sm leading-5 text-muted">
            {entry.staff === "Any available"
              ? `Any available → ${assignedStaff.staff} (first available eligible staff).`
              : `Requested staff ${entry.staff} is retained for this appointment.`}
          </p>
        )}

        {/* Schedule */}
        <div className="mt-5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="text-base font-semibold leading-6 text-ink">Schedule</h3>
            <span className="text-sm leading-5 text-muted">{TIMEZONE_LABEL}</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <p className="text-sm leading-5 text-muted">Appointment date</p>
              <div className="mt-1.5 flex h-11 items-center rounded-lg bg-mist px-3 text-[15px] text-ink">
                {dateLabel}
              </div>
            </div>

            <div>
              <p className="text-sm leading-5 text-muted">
                Start time → End time · {durationMinutes} minutes
              </p>
              <div ref={timeRef} className="relative mt-1.5">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isTimeOpen}
                  aria-label="Select start time"
                  onClick={() => setIsTimeOpen((open) => !open)}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-hairline bg-white px-3 text-left text-[15px] text-ink outline-none transition-colors focus:border-burnt focus-visible:ring-2 focus-visible:ring-burnt/30"
                >
                  <span>
                    {formatTime(startMinutes)} → {formatTime(startMinutes + durationMinutes)}
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 16 10"
                    className={`size-4 shrink-0 text-glyph transition-transform ${isTimeOpen ? "rotate-180" : ""}`}
                    fill="currentColor"
                  >
                    <path d="M1.2 1.4a1 1 0 0 1 1.4-.2L8 5.7l5.4-4.5a1 1 0 1 1 1.2 1.6l-6 5a1 1 0 0 1-1.2 0l-6-5a1 1 0 0 1-.2-1.4Z" />
                  </svg>
                </button>

                {isTimeOpen && (
                  <ul
                    role="listbox"
                    className="absolute inset-x-0 top-full z-30 mt-1 rounded-lg border border-hairline bg-white py-1 shadow-lg"
                  >
                    {timeOptions.map((option) => (
                      <li key={option.startMinutes}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={option.startMinutes === startMinutes}
                          onClick={() => handleSelectTime(option)}
                          className="w-full px-4 py-2.5 text-left transition-colors hover:bg-mist"
                        >
                          <span
                            className={`block text-sm leading-5 ${
                              option.available ? "text-ink" : "text-glyph"
                            } ${option.startMinutes === startMinutes ? "font-semibold" : ""}`}
                          >
                            {formatTime(option.startMinutes)} →{" "}
                            {formatTime(option.startMinutes + durationMinutes)}
                          </span>
                          <span className="mt-0.5 block text-xs leading-4 text-glyph">
                            {option.available
                              ? `Available · ${durationMinutes} minutes`
                              : "Unavailable · staff or resource conflict"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {hasConflict && (
                  <p className="mt-2 text-sm font-medium leading-5 text-danger">{conflictMessage}</p>
                )}
              </div>
            </div>
          </div>

          {!hasConflict && (
            <p className="mt-3 text-sm leading-5 text-muted">
              Staff and resource are available for the full {durationMinutes} minutes. Existing bookings
              remain protected.
            </p>
          )}
        </div>

        {error && !hasConflict && (
          <p className="mt-4 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {/* Queue notes */}
        <div className="mt-5">
          <label htmlFor="assign-slot-notes" className="text-base font-semibold leading-6 text-ink">
            Queue notes (optional)
          </label>
          <textarea
            id="assign-slot-notes"
            value={notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
            placeholder="No queue notes recorded."
            className="mt-2 min-h-[70px] w-full resize-y rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-glyph focus:border-burnt focus:ring-2 focus:ring-burnt/20"
          />
        </div>

        {/* Notify */}
        <div className="mt-4">
          <label className="flex items-center gap-2.5 text-base leading-6 text-ink">
            <input
              type="checkbox"
              checked={notify}
              onChange={(event) => updateDraft({ notify: event.target.checked })}
              className="size-4 rounded-sm accent-burnt"
            />
            <span>Notify the customer: &ldquo;Your slot is ready&rdquo;</span>
          </label>
          <p className="mt-1 text-xs leading-4 text-muted">
            Uses the customer&apos;s recorded contact details. Notification status is recorded with the
            queue entry.
          </p>
        </div>

        {/* After confirmation */}
        <div className="mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: "#fdf3ec" }}>
          <p className="text-sm font-semibold leading-5 text-ink">
            After confirmation · {remaining.length} customer{remaining.length === 1 ? "" : "s"} waiting
          </p>
          <p className="mt-1 text-sm leading-5 text-body">
            {entry.customer} leaves the queue.
            {nextInQueue
              ? ` ${nextInQueue.customer} moves to position 1 · estimated wait ${nextInQueue.estimatedWait} (unchanged after availability check).`
              : " No customers remain in the queue."}
          </p>
        </div>

        <p className="mt-5 text-xs leading-4 text-muted">
          If this appointment is cancelled later, it will not automatically return to the queue. Add the
          customer again if needed.
        </p>

        <div className="mt-4 flex flex-col-reverse items-stretch justify-end gap-3 sm:flex-row sm:items-center">
          <AdminButton variant="outline" size="sm" onClick={onClose} className="!border !border-hairline font-semibold !text-ink">
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={hasConflict || isSubmitting || !assignedStaff}
          >
            {isSubmitting ? "Assigning..." : "Confirm Appointment"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
