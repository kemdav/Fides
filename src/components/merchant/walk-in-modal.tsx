"use client";

import * as React from "react";
import { createAppointmentBookingAction } from "@/app/actions/appointments";
import {
  CalendarPicker,
  Listbox,
  TimeListbox,
} from "./new-appointment-modal";

const SERVICES = [
  "Signature haircut · ₱450",
  "Balayage & gloss · ₱1,500",
  "Botanical spa manicure · ₱950",
  "Facial treatment · ₱900",
  "Wellness massage · ₱1,200",
];

const STAFF = ["Sofia Cruz", "Miguel Tan", "Lia Ramos", "Elena Cruz", "Marco Reyes"];

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
  onClose: () => void;
  onCreated: (result: WalkInResult) => void;
  showToast: (message: string) => void;
}

function fieldClassName() {
  return "h-11 w-full rounded-lg border border-[#aeb6c0] bg-white px-3 text-sm text-ink outline-none transition focus:border-burnt focus:ring-2 focus:ring-burnt/20";
}

export function WalkInModal({
  isOpen,
  tenantId,
  onClose,
  onCreated,
  showToast,
}: WalkInModalProps) {
  const [customer, setCustomer] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [service, setService] = React.useState(SERVICES[0]);
  const [staff, setStaff] = React.useState(STAFF[0]);
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = React.useState("10:45 AM");
  const [notes, setNotes] = React.useState("");
  const [sendInvitation, setSendInvitation] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomer("");
    setEmail("");
    setPhone("");
    setService(SERVICES[0]);
    setStaff(STAFF[0]);
    setDate(new Date().toISOString().slice(0, 10));
    setTime("10:45 AM");
    setNotes("");
    setSendInvitation(false);
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer.trim() || !phone.trim() || !date || !time) {
      setError("Customer name, contact number, date, and time are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createAppointmentBookingAction({
        customerName: customer.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim(),
        serviceName: service.split(" · ")[0],
        staffName: staff,
        date,
        time,
        source: "walk_in",
        notes: notes.trim() || undefined,
        tenantIdParam: tenantId,
      });

      if (!result.success || !result.data) {
        setError(("error" in result && result.error) || "Failed to create walk-in appointment.");
        return;
      }

      onCreated({
        id: result.data.id,
        time,
        customer: result.data.customerName,
        service: result.data.serviceName,
        staff: result.data.staffName,
        source: "Walk-In",
        status: "Confirmed",
        startsAt: result.data.starts_at,
      });
      showToast(`Walk-in appointment created for ${result.data.customerName}`);
      onClose();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to create walk-in appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-2 backdrop-blur-xs sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="walk-in-title"
        className="max-h-[96dvh] w-full max-w-[642px] overflow-y-auto rounded-[10px] bg-white px-5 py-5 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 sm:px-6 sm:py-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="walk-in-title" className="font-display text-[28px] leading-9 text-body">
              Add Walk-in
            </h2>
            <p className="mt-1 text-xs tracking-wide text-muted">
              Create an immediate appointment or add the customer to the waiting list.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close walk-in form" className="text-2xl leading-none text-glyph hover:text-ink">
            ×
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <fieldset className="space-y-2.5">
            <legend className="text-[11px] font-semibold text-muted">Customer Information</legend>
            <label className="block text-sm font-medium text-body">
              Customer Name<span className="text-burnt">*</span>
              <input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="Juan Dela Cruz" className={`${fieldClassName()} mt-1.5`} />
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-body">
                Email <span className="font-normal">(optional)</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="juan.delacruz@gmail.com" className={`${fieldClassName()} mt-1.5`} />
              </label>
              <label className="block text-sm font-medium text-body">
                Contact Number<span className="text-burnt">*</span>
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="09956663254" className={`${fieldClassName()} mt-1.5`} />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="text-[11px] font-semibold text-muted">Service &amp; staff</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="block text-sm font-medium text-body">
                Requested Service<span className="text-burnt">*</span>
                <Listbox
                  id="walk-in-service"
                  label=""
                  value={service}
                  onChange={setService}
                  options={SERVICES.map((option) => ({ value: option, label: option }))}
                />
              </div>
              <div className="block text-sm font-medium text-body">
                Service Staff<span className="text-burnt">*</span>
                <Listbox
                  id="walk-in-staff"
                  label=""
                  value={staff}
                  onChange={setStaff}
                  options={STAFF.map((option) => ({ value: option, label: option }))}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2.5">
            <legend className="text-[11px] font-semibold text-muted">Schedule</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="block text-sm font-medium text-body">
                Appointment Date<span className="text-burnt">*</span>
                <CalendarPicker id="walk-in-date" label="" value={date} onChange={setDate} />
              </div>
              <div className="block text-sm font-medium text-body">
                Appointment Time<span className="text-burnt">*</span>
                <TimeListbox id="walk-in-time" label="" value={time} onChange={setTime} />
              </div>
            </div>
          </fieldset>

          <label className="block text-sm font-medium text-body">
            Notes <span className="font-normal">(optional)</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add customer requests or service notes..." className="mt-1.5 min-h-10 w-full resize-y rounded-lg border border-[#aeb6c0] px-3 py-2 text-sm text-ink outline-none focus:border-burnt focus:ring-2 focus:ring-burnt/20" />
          </label>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={sendInvitation} onChange={(event) => setSendInvitation(event.target.checked)} className="size-3.5 accent-burnt" />
            Send account invitation after this visit
          </label>
          <p className="text-xs tracking-wide text-muted">Existing scheduled bookings are protected. If a slot becomes unavailable, use the waiting list.</p>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center">
            <button type="button" onClick={() => showToast("Waiting-list action is available after selecting an open slot.")} className="h-10 rounded-md border-2 border-burnt px-3 text-sm font-semibold text-burnt hover:bg-mist">
              Add to waiting list
            </button>
            <button type="submit" disabled={isSubmitting} className="h-10 rounded-md bg-burnt px-6 text-sm font-semibold text-white hover:bg-burnt/90 disabled:opacity-60">
              {isSubmitting ? "Creating..." : "Create walk-in appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
