"use client";

import * as React from "react";
import {
  convertWaitlistEntryAction,
  getAssignableSlotsAction,
} from "@/app/actions/walk-ins";
import type {
  AssignableSlotOption,
  WaitlistQueueItem,
  WalkInStaffOption,
} from "@/types/walk-ins";
import { Icon } from "@/components/admin/icon";
import { inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

interface AssignSlotModalProps {
  entry: WaitlistQueueItem | null;
  allWaiting: WaitlistQueueItem[];
  staff: WalkInStaffOption[];
  tenantId: string;
  preselectedStaffId?: string;
  onClose: () => void;
  onConverted: () => void;
  showToast: (message: string) => void;
}

function formatPeso(cents: number): string {
  return `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;
}

function getTodayManila(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function AssignSlotModal({
  entry,
  allWaiting,
  staff,
  tenantId,
  preselectedStaffId,
  onClose,
  onConverted,
  showToast,
}: AssignSlotModalProps) {
  const [selectedStaffId, setSelectedStaffId] = React.useState("");
  const [date, setDate] = React.useState(getTodayManila);
  const [slots, setSlots] = React.useState<AssignableSlotOption[]>([]);
  const [selectedSlotIso, setSelectedSlotIso] = React.useState("");
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [notifyCustomer, setNotifyCustomer] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [assignedSuccess, setAssignedSuccess] = React.useState(false);

  const activeEntryIdRef = React.useRef<string | null>(null);

  // Pick requested staff or first available eligible staff (only when opening a new entry)
  React.useEffect(() => {
    if (!entry) {
      activeEntryIdRef.current = null;
      return;
    }
    if (activeEntryIdRef.current === entry.id) return;
    activeEntryIdRef.current = entry.id;

    const defaultStaff =
      entry.requestedStaffId ??
      preselectedStaffId ??
      staff.find((s) => s.isAvailableNow)?.id ??
      staff[0]?.id ??
      "";
    setSelectedStaffId(defaultStaff);
    setDate(getTodayManila());
    setNotes(entry.notes ?? "");
    setNotifyCustomer(true);
    setError(null);
    setAssignedSuccess(false);
  }, [entry, preselectedStaffId, staff]);

  // Fetch non-conflicting slots whenever staff or date changes
  React.useEffect(() => {
    if (!entry || !selectedStaffId || !date) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the slot request
    setLoadingSlots(true);
    setError(null);

    getAssignableSlotsAction({
      tenantId,
      staffId: selectedStaffId,
      date,
      durationMinutes: entry.serviceDurationMinutes,
    }).then((res) => {
      if (cancelled) return;
      setLoadingSlots(false);
      if (res.success && res.data) {
        setSlots(res.data);
        setSelectedSlotIso(res.data[0]?.startsAt ?? "");
      } else {
        setSlots([]);
        setSelectedSlotIso("");
        if (!res.success) setError(res.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [entry, selectedStaffId, date, tenantId]);

  if (!entry) return null;

  if (assignedSuccess) {
    return (
      <Modal open onClose={onClose} closeOnBackdrop unstyled className="w-[calc(100%-1rem)] max-w-[360px] rounded-[12px] bg-white px-6 py-8 text-center shadow-2xl overflow-visible text-ink backdrop:bg-black/35">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-success text-success">
            <Icon name="check" weight="bold" className="size-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-ink">Slot assigned</h3>
          <p className="mt-2 text-xs text-muted">
            Appointment confirmed. The customer has left the queue.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 h-10 w-32 rounded-md bg-burnt text-sm font-semibold text-white hover:bg-burnt/90"
          >
            Done
          </button>
        </Modal>
    );
  }

  const assignedStaff = staff.find((s) => s.id === selectedStaffId);
  const selectedSlot = slots.find((s) => s.startsAt === selectedSlotIso);
  const remainingQueue = allWaiting.filter((item) => item.id !== entry.id);
  const nextInLine = remainingQueue[0];

  const handleConfirm = async () => {
    if (!selectedStaffId || !selectedSlot) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await convertWaitlistEntryAction({
        tenantId,
        waitlistEntryId: entry.id,
        staffId: selectedStaffId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        notes: notes.trim() || undefined,
        notifyCustomer,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      showToast(`Slot assigned for ${entry.customerName}.`);
      onConverted();
      setAssignedSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="assign-slot-title" closeOnBackdrop unstyled className="max-h-[96dvh] w-[calc(100%-1rem)] max-w-[660px] overflow-y-auto rounded-[12px] bg-white px-6 py-5 shadow-2xl text-ink backdrop:bg-black/35">
        <div className="flex items-start justify-between">
          <h2
            id="assign-slot-title"
            className="font-display text-[26px] leading-8 text-body"
          >
            Assign a slot
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assign slot modal"
            className="rounded-lg p-1 text-glyph hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Original request banner */}
        <div className="mt-4 rounded-lg bg-mist px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Original request · Position {entry.position} of {entry.totalWaiting}
          </p>
          <p className="mt-1 text-sm font-medium text-ink">
            {entry.customerName} · {entry.serviceName} ·{" "}
            {entry.requestedStaffName ?? "Any available"} · joined{" "}
            {entry.joinedTimeLabel}
          </p>
        </div>

        {/* Service + Assigned staff & resource summary */}
        <div className="mt-4 grid grid-cols-1 gap-4 border-b border-hairline pb-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Service</p>
            <p className="mt-0.5 text-sm font-medium text-ink">
              {entry.serviceName} · {entry.serviceDurationMinutes} min ·{" "}
              {formatPeso(entry.servicePriceCents)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Assigned staff &amp; resource</p>
            {entry.requestedStaffId ? (
              <p className="mt-0.5 text-sm font-medium text-ink">
                {assignedStaff
                  ? `${assignedStaff.fullName} · ${assignedStaff.resourceLabel}`
                  : entry.requestedStaffName}
              </p>
            ) : (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className={cn(inputClasses(false, false), "mt-1")}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} · {s.resourceLabel}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <p className="mt-2.5 text-xs text-muted">
          {entry.requestedStaffId
            ? `Requested staff ${entry.requestedStaffName} is retained for this appointment.`
            : assignedStaff
              ? `Any available → ${assignedStaff.fullName} (first available eligible staff).`
              : "Select an eligible staff member."}
        </p>

        {/* Schedule section */}
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink">Schedule</span>
            <span className="text-xs text-muted">Asia/Manila (UTC+8)</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Appointment date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn(inputClasses(false, false), "mt-1")}
              />
            </label>

            <label className="block text-xs text-muted">
              Start time → End time · {entry.serviceDurationMinutes} minutes
              <select
                value={selectedSlotIso}
                onChange={(e) => setSelectedSlotIso(e.target.value)}
                disabled={loadingSlots || slots.length === 0}
                className={cn(inputClasses(false, false), "mt-1")}
              >
                {loadingSlots ? (
                  <option value="">Checking availability...</option>
                ) : slots.length === 0 ? (
                  <option value="">No open slots on this date</option>
                ) : (
                  slots.map((slot) => (
                    <option key={slot.startsAt} value={slot.startsAt}>
                      {slot.label}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <p
            className={`text-xs ${slots.length === 0 && !loadingSlots ? "text-danger" : "text-muted"}`}
          >
            {slots.length === 0 && !loadingSlots
              ? "All slots overlap existing bookings for this staff member. Choose another date or staff member."
              : `Staff and resource are available for the full ${entry.serviceDurationMinutes} minutes. Existing bookings remain protected.`}
          </p>
        </div>

        {/* Queue notes */}
        <label className="mt-4 block text-xs font-semibold text-ink">
          Queue notes <span className="font-normal text-muted">(optional)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="No queue notes recorded."
            className={cn(inputClasses(false, false), "mt-1.5")}
          />
        </label>

        {/* Notify customer checkbox */}
        <div className="mt-4">
          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            <input
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="size-4 accent-burnt"
            />
            Notify the customer: &ldquo;Your slot is ready&rdquo;
          </label>
          <p className="mt-1 pl-6 text-xs text-muted">
            Uses the customer&apos;s recorded contact details. Notification
            status is recorded with the queue entry.
          </p>
        </div>

        {/* After confirmation queue-shift preview */}
        <div className="mt-4 rounded-lg border border-burnt/15 bg-burnt/10 px-4 py-3">
          <p className="text-xs font-semibold text-ink">
            After confirmation · {remainingQueue.length}{" "}
            {remainingQueue.length === 1 ? "customer" : "customers"} waiting
          </p>
          <p className="mt-1 text-xs text-muted">
            {entry.customerName} leaves the queue.{" "}
            {nextInLine
              ? `${nextInLine.customerName} moves to position 1 · estimated wait ${nextInLine.estimatedWaitMinutes} min.`
              : "The waiting list will be clear."}
          </p>
        </div>

        <p className="mt-3 text-xs text-muted">
          If this appointment is cancelled later, it will not automatically
          return to the queue. Add the customer again if needed.
        </p>

        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md px-4 text-sm font-medium text-ink hover:bg-mist"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || loadingSlots || !selectedSlot}
            className="h-10 rounded-md bg-burnt px-5 text-sm font-semibold text-white hover:bg-burnt/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Confirming..." : "Confirm Appointment"}
          </button>
        </div>
      </Modal>
  );
}
