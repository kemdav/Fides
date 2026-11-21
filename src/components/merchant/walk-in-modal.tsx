"use client";

import * as React from "react";
import {
  addToWaitlistAction,
  createSafeWalkInAppointmentAction,
  getWalkInWorkspaceAction,
} from "@/app/actions/walk-ins";
import type { WalkInServiceOption, WalkInStaffOption } from "@/types/walk-ins";
import { CalendarPicker, Listbox, TimeListbox } from "./new-appointment-modal";

export interface WalkInResult {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Walk-In";
  status: "Confirmed";
  startsAt: string;
}

interface WalkInModalProps {
  isOpen: boolean;
  tenantId?: string;
  services?: WalkInServiceOption[];
  staff?: WalkInStaffOption[];
  defaultStaffId?: string;
  onClose: () => void;
  onCreated?: (result: WalkInResult) => void;
  onWaitlistAdded?: () => void;
  showToast: (message: string) => void;
}

function fieldClassName() {
  return "h-11 w-full rounded-lg border border-[#aeb6c0] bg-white px-3 text-sm text-ink outline-none transition focus:border-burnt focus:ring-2 focus:ring-burnt/20";
}

function formatPeso(cents: number): string {
  return `₱${Math.round(cents / 100).toLocaleString("en-PH")}`;
}

function getTodayManilaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function WalkInModal({
  isOpen,
  tenantId,
  services: propServices,
  staff: propStaff,
  defaultStaffId,
  onClose,
  onCreated,
  onWaitlistAdded,
  showToast,
}: WalkInModalProps) {
  const [services, setServices] = React.useState<WalkInServiceOption[]>(
    propServices ?? [],
  );
  const [staffList, setStaffList] = React.useState<WalkInStaffOption[]>(
    propStaff ?? [],
  );
  const [customer, setCustomer] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [serviceId, setServiceId] = React.useState("");
  const [staffId, setStaffId] = React.useState(defaultStaffId ?? "any");
  const [date, setDate] = React.useState(getTodayManilaDate);
  const [time, setTime] = React.useState("10:45 AM");
  const [notes, setNotes] = React.useState("");
  const [sendInvitation, setSendInvitation] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isAddingWaitlist, setIsAddingWaitlist] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slotFull, setSlotFull] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<
    null | "appointment" | "waitlist"
  >(null);

  React.useEffect(() => {
    if (propServices) setServices(propServices);
  }, [propServices]);

  React.useEffect(() => {
    if (propStaff) setStaffList(propStaff);
  }, [propStaff]);

  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;

    setCustomer("");
    setEmail("");
    setPhone("");
    setDate(getTodayManilaDate());
    setTime("10:45 AM");
    setNotes("");
    setSendInvitation(false);
    setError(null);
    setSlotFull(false);
    setConfirmation(null);
    setStaffId(defaultStaffId ?? "any");

    if (
      !propServices ||
      propServices.length === 0 ||
      !propStaff ||
      propStaff.length === 0
    ) {
      getWalkInWorkspaceAction(tenantId).then((res) => {
        if (res.success && res.data) {
          setServices(res.data.services);
          setStaffList(res.data.staff);
          if (res.data.services[0]) setServiceId(res.data.services[0].id);
        }
      });
    } else if (propServices[0]) {
      setServiceId(propServices[0].id);
    }
  }, [isOpen, tenantId, propServices, propStaff, defaultStaffId]);

  if (!isOpen) return null;

  if (confirmation) {
    const isWaitlist = confirmation === "waitlist";
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-[360px] rounded-[12px] bg-white px-6 py-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-emerald-600 text-emerald-600">
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-ink">
            {isWaitlist
              ? "Added to waiting list"
              : "Walk-in appointment created"}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {isWaitlist
              ? "The customer is waiting for an available staff member and resource."
              : "The available slot is reserved without displacing an existing booking."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 h-10 w-32 rounded-md bg-burnt text-sm font-semibold text-white hover:bg-burnt/90"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const handleAddToWaitlist = async () => {
    if (!customer.trim() || !phone.trim()) {
      setError(
        "Customer name and contact number are required to add to the waiting list.",
      );
      return;
    }

    setIsAddingWaitlist(true);
    setError(null);
    try {
      const result = await addToWaitlistAction({
        tenantId,
        customerName: customer.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim(),
        serviceId: serviceId || null,
        staffId: staffId === "any" ? null : staffId,
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      showToast(`${customer.trim()} added to the waiting list.`);
      onWaitlistAdded?.();
      setConfirmation("waitlist");
    } finally {
      setIsAddingWaitlist(false);
    }
  };

  const handleCreateWalkIn = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!customer.trim() || !phone.trim() || !serviceId || !date || !time) {
      setError(
        "Customer name, contact number, service, date, and time are required.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSlotFull(false);
    try {
      const result = await createSafeWalkInAppointmentAction({
        tenantId,
        customerName: customer.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim(),
        serviceId,
        staffId,
        date,
        time,
        notes: notes.trim() || undefined,
      });

      if (!result.success || !result.data) {
        if (!result.success && result.code === "SLOT_UNAVAILABLE") {
          setSlotFull(true);
        }
        setError(
          !result.success
            ? result.error
            : "Failed to create walk-in appointment.",
        );
        return;
      }

      onCreated?.({
        id: result.data.id,
        time,
        customer: result.data.customerName,
        service: result.data.serviceName,
        staff: result.data.staffName,
        source: "Walk-In",
        status: "Confirmed",
        startsAt: result.data.startsAt,
      });
      showToast(`Walk-in appointment created for ${result.data.customerName}`);
      setConfirmation("appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceOptions = services.map((s) => ({
    value: s.id,
    label: `${s.name} · ${formatPeso(s.priceCents)}`,
  }));

  const staffOptions = [
    { value: "any", label: "Any available" },
    ...staffList.map((s) => ({
      value: s.id,
      label: s.isAvailableNow ? `${s.fullName} (Available)` : s.fullName,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-2 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="walk-in-title"
        className="max-h-[96dvh] w-full max-w-[642px] overflow-y-auto rounded-[10px] bg-white px-5 py-5 shadow-2xl sm:px-6 sm:py-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="walk-in-title"
              className="font-display text-[28px] leading-9 text-body"
            >
              Add Walk-in
            </h2>
            <p className="mt-1 text-xs tracking-wide text-muted">
              Create an immediate appointment or add the customer to the waiting
              list.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close walk-in form"
            className="text-2xl leading-none text-glyph hover:text-ink"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 text-sm text-danger">
            <p>{error}</p>
            {slotFull && (
              <button
                type="button"
                onClick={handleAddToWaitlist}
                disabled={isAddingWaitlist}
                className="mt-2 text-xs font-semibold underline hover:opacity-80"
              >
                Place {customer.trim() || "customer"} on the waiting list
                instead →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleCreateWalkIn} className="mt-5 space-y-4">
          <fieldset className="space-y-2.5">
            <legend className="text-[11px] font-semibold text-muted">
              Customer Information
            </legend>
            <label className="block text-sm font-medium text-body">
              Customer Name<span className="text-burnt">*</span>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Name"
                className={`${fieldClassName()} mt-1.5`}
              />
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-body">
                Email <span className="font-normal">(optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className={`${fieldClassName()} mt-1.5`}
                />
              </label>
              <label className="block text-sm font-medium text-body">
                Contact Number<span className="text-burnt">*</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09956663254"
                  className={`${fieldClassName()} mt-1.5`}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="text-[11px] font-semibold text-muted">
              Service &amp; staff
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="block text-sm font-medium text-body">
                Requested Service<span className="text-burnt">*</span>
                <Listbox
                  id="walk-in-service"
                  label=""
                  value={serviceId}
                  onChange={setServiceId}
                  options={
                    serviceOptions.length > 0
                      ? serviceOptions
                      : [{ value: "", label: "Loading services..." }]
                  }
                />
              </div>
              <div className="block text-sm font-medium text-body">
                Service Staff<span className="text-burnt">*</span>
                <Listbox
                  id="walk-in-staff"
                  label=""
                  value={staffId}
                  onChange={setStaffId}
                  options={staffOptions}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="text-[11px] font-semibold text-muted">
              Schedule
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="block text-sm font-medium text-body">
                Appointment Date<span className="text-burnt">*</span>
                <CalendarPicker
                  id="walk-in-date"
                  label=""
                  value={date}
                  onChange={setDate}
                />
              </div>
              <div className="block text-sm font-medium text-body">
                Appointment Time<span className="text-burnt">*</span>
                <TimeListbox
                  id="walk-in-time"
                  label=""
                  value={time}
                  onChange={setTime}
                />
              </div>
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-body">
            Notes <span className="font-normal">(optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add customer requests or service notes..."
              className="mt-1.5 min-h-14 w-full resize-y rounded-lg border border-[#aeb6c0] px-3 py-2 text-sm text-ink outline-none focus:border-burnt focus:ring-2 focus:ring-burnt/20"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={sendInvitation}
              onChange={(e) => setSendInvitation(e.target.checked)}
              className="size-3.5 accent-burnt"
            />
            Send account invitation after this visit
          </label>
          <p className="text-xs tracking-wide text-muted">
            Existing scheduled bookings are protected. If a slot becomes
            unavailable, use the waiting list.
          </p>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleAddToWaitlist}
              disabled={isAddingWaitlist || isSubmitting}
              className="h-10 rounded-md border-2 border-burnt px-4 text-sm font-semibold text-burnt hover:bg-mist disabled:opacity-60"
            >
              {isAddingWaitlist ? "Adding..." : "Add to waiting list"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAddingWaitlist}
              className="h-10 rounded-md bg-burnt px-6 text-sm font-semibold text-white hover:bg-burnt/90 disabled:opacity-60"
            >
              {isSubmitting ? "Creating..." : "Create walk-in appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
