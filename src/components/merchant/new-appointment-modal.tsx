"use client";

import * as React from "react";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icon";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { Listbox } from "@/components/ui/listbox";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createAppointmentBookingAction } from "@/app/actions/appointments";
import { getEligibleBookingStaff } from "@/lib/merchant/booking-staff-eligibility";
import { getManilaDateKey } from "@/lib/date-utils";
import type {
  AppointmentServiceOption,
  AppointmentStaffOption,
} from "@/types/appointments";

export type { AppointmentServiceOption, AppointmentStaffOption };
export { Listbox } from "@/components/ui/listbox";

// ─── static option lists ─────────────────────────────────────────────────────

const RESOURCE_OPTIONS: Record<string, string[]> = {
  "Signature haircut":        ["Chair A", "Chair B", "Chair C"],
  "Balayage & gloss":         ["Chair A", "Chair B"],
  "Botanical spa manicure":   ["Nail Station 1", "Nail Station 2"],
  "Facial treatment":         ["Treatment room 1", "Treatment room 2", "Treatment room 3"],
  "Wellness massage":         ["Treatment room 1", "Treatment room 2"],
};

const ADDON_OPTIONS = ["None selected", "Deep conditioning", "Scalp massage", "Hot towel", "Aromatherapy"];

const TIME_SLOTS = [
  "09:00 AM","09:30 AM","10:00 AM","10:30 AM","10:45 AM",
  "11:00 AM","11:30 AM","12:00 PM","12:15 PM","12:30 PM",
  "01:00 PM","01:30 PM","02:00 PM","02:30 PM","03:00 PM",
  "03:30 PM","04:00 PM","04:30 PM","05:00 PM",
];


// ─── helpers ─────────────────────────────────────────────────────────────────

function addMinutes(timeStr: string, mins: number): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  const totalMins = h * 60 + m + mins;
  const nh = Math.floor(totalMins / 60) % 24;
  const nm = totalMins % 60;
  const ap = nh >= 12 ? "PM" : "AM";
  const displayH = nh === 0 ? 12 : nh > 12 ? nh - 12 : nh;
  return `${String(displayH).padStart(2, "0")}:${String(nm).padStart(2, "0")} ${ap}`;
}


// ─── Shared input class ───────────────────────────────────────────────────────

const fieldCls =
  `${fieldOutlineClasses} h-11 w-full px-3 text-sm text-ink placeholder:text-glyph`;

// ─── Time listbox ─────────────────────────────────────────────────────────────

const timeOptions = TIME_SLOTS.map((time) => ({ value: time, label: time }));

export function TimeListbox({ id, label, required, value, onChange }: { id: string; label: string; required?: boolean; value: string; onChange: (v: string) => void }): React.JSX.Element {
  return (
    <Listbox id={id} label={label} required={required} value={value} placement="above"
      options={timeOptions} onChange={onChange} placeholder="Select a time" />
  );
}

// ─── Stepper indicator ────────────────────────────────────────────────────────

function StepperIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-start gap-0">
      {/* Step 1 */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 transition-colors ${
          step === 1
            ? "bg-burnt text-on-burnt ring-burnt"
            : "bg-burnt text-on-burnt ring-burnt"
        }`}>
          {step === 2 ? (
            <Icon name="check" weight="bold" className="size-3.5" />
          ) : "1"}
        </span>
        <span className={`text-center text-[11px] font-semibold transition-colors ${step === 1 ? "text-ink" : "text-muted"}`}>
          Customer details
        </span>
      </div>

      {/* Connector */}
      <div className="mt-3 h-px flex-1 bg-hairline" />

      {/* Step 2 */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 transition-colors ${
          step === 2
            ? "bg-burnt text-on-burnt ring-burnt"
            : "bg-white text-muted ring-line"
        }`}>
          2
        </span>
        <span className={`text-center text-[11px] font-semibold transition-colors ${step === 2 ? "text-ink" : "text-muted"}`}>
          Service &amp; schedule
        </span>
      </div>
    </div>
  );
}

// ─── Error / warning banners ──────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
      <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function WarningBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warn-fg/30 bg-warn-bg px-4 py-3 text-sm text-warn-fg">
      <Icon name="warning" className="mt-0.5 size-4 shrink-0" />
      <span>{message} Choose an available slot to continue.</span>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewAppointmentResult {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Online" | "Walk-In";
  status: "Confirmed";
  startsAt: string;
}

interface Props {
  isOpen: boolean;
  tenantId?: string;
  services?: AppointmentServiceOption[];
  staff?: AppointmentStaffOption[];
  onClose: () => void;
  onCreated: (result: NewAppointmentResult) => void;
  showToast: (msg: string) => void;
  bookingMode?: "appointment" | "walk-in";
}

interface SelectedCustomer {
  name: string;
  email: string;
  phone: string;
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function NewAppointmentModal({
  isOpen,
  tenantId,
  services = [],
  staff = [],
  onClose,
  onCreated,
  showToast,
  bookingMode = "appointment",
}: Props) {
  const router = useRouter();

  const [step, setStep] = React.useState<1 | 2>(1);

  // step 1
  const [customerType, setCustomerType]   = React.useState<"existing" | "new">("existing");
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<SelectedCustomer | null>(null);
  const [customerName, setCustomerName]   = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [bookingSource, setBookingSource] = React.useState<"Phone" | "Walk-in">("Phone");
  const [notes, setNotes]                 = React.useState("");
  const [step1Error, setStep1Error]       = React.useState<string | null>(null);

  // step 2
  const [serviceId, setServiceId]           = React.useState("");
  const [requestedStaffId, setRequestedStaffId] = React.useState("");
  const [resource, setResource]             = React.useState("");
  const [addon, setAddon]                   = React.useState("None selected");
  const [date, setDate]                     = React.useState(new Date().toISOString().slice(0, 10));
  const [time, setTime]                     = React.useState("");
  const [step2Error, setStep2Error]         = React.useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = React.useState(false);

  const selectedService = services.find((service) => service.id === serviceId);
  const servicePrice    = selectedService ? Math.round(selectedService.priceCents / 100) : 0;
  const serviceDuration = selectedService?.durationMinutes ?? 60;
  const resourceOptions = selectedService
    ? (RESOURCE_OPTIONS[selectedService.name] ?? ["Chair A", "Chair B"])
    : [];
  const displayCustomer = customerType === "existing" ? customerSearch.trim() : customerName.trim();
  const sourceLabel     = bookingSource === "Walk-in" ? "Walk-In" : "Online";
  const endTime         = time ? addMinutes(time, serviceDuration)      : null;
  const bufferEnd       = time ? addMinutes(time, serviceDuration + 10) : null;

  const eligibleStaff = getEligibleBookingStaff(selectedService, staff);
  const selectedStaff = eligibleStaff.find((member) => member.id === requestedStaffId);
  const staffId = eligibleStaff.length > 0 && requestedStaffId
    ? (selectedStaff?.id ?? "any")
    : "";
  const noEligibleStaff = Boolean(selectedService) && eligibleStaff.length === 0;
  const staffDropdownOptions = [
    { value: "any", label: "Any available" },
    ...eligibleStaff.map((member) => ({ value: member.id, label: member.fullName })),
  ];
  const serviceDropdownOptions = services.map((service) => {
    const price = Math.round(service.priceCents / 100).toLocaleString("en-PH");
    return {
      value: service.id,
      label: `${service.name} – ${service.durationMinutes} min · ₱${price}`,
    };
  });

  const handleServiceChange = (id: string) => {
    const nextService = services.find((service) => service.id === id);
    if (requestedStaffId && requestedStaffId !== "any"
      && !getEligibleBookingStaff(nextService, staff).some((member) => member.id === requestedStaffId)) {
      setRequestedStaffId("any");
    }
    setServiceId(id);
    setStep2Error(null);
    setConflictWarning(null);
  };

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResource(resourceOptions[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  React.useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setCustomerType("existing");
      setCustomerSearch(""); setCustomerName("");
      setSelectedCustomer(null);
      setCustomerEmail(""); setCustomerPhone("");
      setBookingSource(bookingMode === "walk-in" ? "Walk-in" : "Phone"); setNotes("");
      setStep1Error(null);
      setServiceId(""); setRequestedStaffId("");
      setResource(""); setAddon("None selected");
      setDate(new Date().toISOString().slice(0, 10));
      setTime("");
      setStep2Error(null); setConflictWarning(null);
      setIsSubmitting(false);
    }
  }, [bookingMode, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    setStep1Error(null);
    const name = customerType === "existing" ? customerSearch.trim() : customerName.trim();
    if (!name) { setStep1Error("Please enter or search for a customer name before continuing."); return; }
    if (customerType === "existing" && !selectedCustomer) {
      setStep1Error("Select the customer from the search result before continuing.");
      return;
    }
    if (customerType === "new" && !customerPhone.trim()) { setStep1Error("Contact number is required for new customers."); return; }
    setStep(2);
  };

  const handleSelectCustomer = () => {
    const customer = {
      name: customerSearch.trim(),
      email: "ana.reyes@email.com",
      phone: "+63 995 122 3548",
    };
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setCustomerEmail(customer.email);
    setCustomerPhone(customer.phone);
    setStep1Error(null);
    showToast(`${customer.name} selected`);
  };

  const handleSubmit = async () => {
    setStep2Error(null); setConflictWarning(null);
    if (!selectedService) { setStep2Error("Please select a service or package."); return; }
    if (!staffId)     { setStep2Error("Please select a staff member."); return; }
    if (!resource)    { setStep2Error("Please select a required resource."); return; }
    if (!date)        { setStep2Error("Please select an appointment date."); return; }
    if (!time)        { setStep2Error("Please select an available start time."); return; }

    const resolvedName  = customerType === "existing" ? customerSearch.trim() : customerName.trim();
    const sourceValue   = bookingSource === "Walk-in" ? "walk_in" as const : "online" as const;

    setIsSubmitting(true);
    try {
      const res = await createAppointmentBookingAction({
        customerName:  resolvedName,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        serviceName:   selectedService.name,
        serviceId:     selectedService.id,
        staffName:     selectedStaff?.fullName,
        staffId:       selectedStaff?.id,
        date, time, source: sourceValue,
        notes: notes.trim() || undefined,
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        const msg = res.error ?? "Failed to create appointment.";
        if (msg.toLowerCase().includes("conflict") || msg.toLowerCase().includes("booking")) {
          setConflictWarning(msg);
        } else {
          setStep2Error(msg);
        }
        return;
      }
      if (!res.data) { setStep2Error("Booking was processed but no confirmation was returned. Please refresh."); return; }

      const created = res.data;
      onCreated({ id: created.id, time, customer: created.customerName, service: created.serviceName, staff: created.staffName, source: sourceLabel, status: "Confirmed", startsAt: created.starts_at });
      showToast(`Appointment booked for ${created.customerName}`);
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setStep2Error(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      unstyled
      labelledBy="appt-modal-title"
      className="relative flex w-full max-w-lg flex-col rounded-[14px] border border-line bg-white shadow-2xl"
      style={{ maxHeight: "92dvh" }}
    >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-5 border-b border-hairline shrink-0 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="appt-modal-title" className="font-display text-[26px] leading-[34px] text-ink">
                {bookingMode === "walk-in" ? "Add walk-in" : "New appointment"}
              </h2>
              <p className="text-xs text-muted mt-1">
                Step {step} of 2: {step === 1 ? "Customer Details" : "Service & Schedule"}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              className="flex size-8 items-center justify-center rounded-lg text-glyph hover:bg-mist hover:text-ink transition-colors -mr-1 mt-0.5"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          {/* Stepper */}
          <StepperIndicator step={step} />
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">

          {/* ═══════════════════════════════════════════════════════════
              STEP 1: CUSTOMER DETAILS
             ═══════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              {/* Customer type toggle */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Customer</p>
                <div className="grid grid-cols-2 rounded-lg border border-hairline overflow-hidden">
                  {(["existing", "new"] as const).map((type) => (
                    <button key={type} type="button"
                      onClick={() => { setCustomerType(type); setStep1Error(null); }}
                      className={`py-2.5 text-sm font-semibold transition-colors ${customerType === type ? "bg-burnt text-on-burnt" : "bg-white text-body hover:bg-mist"}`}
                    >
                      {type === "existing" ? "Existing Customer" : "New Customer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing: search */}
              {customerType === "existing" && (
                <div className="space-y-1.5">
                  <label htmlFor="customer-search" className="block text-sm font-semibold text-ink">
                    Search name, phone or email
                  </label>
                  <div className="relative">
                    <Icon name="search" className="pointer-events-none absolute left-3 top-3 size-4 text-glyph" />
                    <input id="customer-search" type="text" value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedCustomer(null);
                        setStep1Error(null);
                      }}
                      placeholder="Enter search name, phone or email"
                      className={`${fieldCls} pl-10`}
                    />
                  </div>
                  {customerSearch.trim() && (
                    <div className={`flex items-center justify-between gap-4 rounded-lg px-3 py-3 ${
                      selectedCustomer ? "border border-success/30 bg-success/10" : "bg-mist"
                    }`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {customerSearch.trim()} · Registered · 8 visits
                        </p>
                        <p className="mt-1 truncate text-xs text-muted">
                          ana.reyes@email.com · +63 995 122 3548
                        </p>
                        <p className="mt-2 text-[11px] text-muted">No match? Create a new customer instead.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSelectCustomer}
                        aria-pressed={Boolean(selectedCustomer)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${
                          selectedCustomer
                            ? "bg-success text-white"
                            : "bg-burnt text-on-burnt hover:bg-burnt/90"
                        }`}
                      >
                        {selectedCustomer && <Icon name="verified" className="size-3.5" />}
                        {selectedCustomer ? "Customer selected" : "Use this customer"}
                      </button>
                    </div>
                  )}
                  {selectedCustomer && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-success-deep" role="status">
                      <Icon name="verified" className="size-3.5" />
                      Customer selected. Continue to the next step to schedule the appointment.
                    </p>
                  )}
                </div>
              )}

              {/* New: fields */}
              {customerType === "new" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="new-customer-name" className="block text-sm font-semibold text-ink">
                      Full name <span className="text-burnt">*</span>
                    </label>
                    <input id="new-customer-name" type="text" value={customerName}
                      onChange={(e) => { setCustomerName(e.target.value); setStep1Error(null); }}
                      placeholder="e.g. Ana Reyes"
                      className={fieldCls}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="new-customer-phone" className="block text-sm font-semibold text-ink">
                        Contact number <span className="text-burnt">*</span>
                      </label>
                      <input id="new-customer-phone" type="tel" value={customerPhone}
                        onChange={(e) => { setCustomerPhone(e.target.value); setStep1Error(null); }}
                        placeholder="09xxxxxxxxx"
                        className={fieldCls}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="new-customer-email" className="block text-sm font-semibold text-ink">
                        Email <span className="text-muted font-normal">(optional)</span>
                      </label>
                      <input id="new-customer-email" type="email" value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="email@example.com"
                        className={fieldCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Booking source toggle */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Booking source</p>
                <div className="grid grid-cols-2 rounded-lg border border-hairline overflow-hidden">
                  {(["Phone", "Walk-in"] as const).map((src) => (
                    <button key={src} type="button" onClick={() => setBookingSource(src)}
                      className={`py-2.5 text-sm font-semibold transition-colors ${bookingSource === src ? "bg-burnt text-on-burnt" : "bg-white text-body hover:bg-mist"}`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label htmlFor="appt-notes" className="block text-sm font-semibold text-ink">
                  Notes <span className="text-muted font-normal">(optional)</span>
                </label>
                <textarea id="appt-notes" rows={3} value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)..."
                  className={`${fieldOutlineClasses} w-full resize-none px-3 py-2.5 text-sm text-ink placeholder:text-glyph`}
                />
              </div>

              {step1Error && <ErrorBanner message={step1Error} />}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════
              STEP 2: SERVICE & SCHEDULE
             ═══════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              {/* Customer summary banner */}
              <div className="flex items-center justify-between rounded-lg bg-mist border border-hairline px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{displayCustomer || "—"}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {customerType === "existing" ? "Existing customer" : "New customer"}
                    {" · Source: "}{bookingSource}
                  </p>
                </div>
                <button type="button"
                  onClick={() => { setStep(1); setStep2Error(null); setConflictWarning(null); }}
                  className="text-xs font-semibold text-burnt hover:text-burnt-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 rounded"
                >
                  Edit
                </button>
              </div>

              {/* ── Section: Service & eligible staff ──────────────── */}
              <div className="space-y-4">
                {/* Section header — visually distinct from field labels */}
                <div className="border-b border-hairline pb-2">
                  <h3 className="text-base font-bold text-ink">Service &amp; eligible staff</h3>
                  <p className="text-xs text-muted mt-0.5">Select the service, assign a staff member, and pick a resource.</p>
                </div>

                {/* Service + Staff row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Listbox
                    id="service-select"
                    label="Service or package"
                    required
                    value={serviceId}
                    onChange={handleServiceChange}
                    options={serviceDropdownOptions}
                    placeholder="Select an option"
                  />
                  <Listbox
                    id="staff-select"
                    label="Staff"
                    required
                    value={staffId}
                    onChange={(v) => { setRequestedStaffId(v); setStep2Error(null); setConflictWarning(null); }}
                    options={staffDropdownOptions}
                    disabled={!selectedService || noEligibleStaff}
                    placeholder={noEligibleStaff ? "No eligible staff" : "Select an option"}
                  />
                </div>

                {/* Eligibility hint */}
                {selectedService && selectedStaff && (
                  <p className="text-xs text-muted">
                    Only staff qualified for {selectedService.name.toLowerCase()} are shown.{" "}
                    <span className="font-medium text-body">{selectedStaff.fullName}</span> is available for the full slot.
                  </p>
                )}

                {/* Resource + Add-ons row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Listbox
                    id="resource-select"
                    label="Required resource"
                    required
                    value={resource}
                    onChange={(v) => { setResource(v); setStep2Error(null); }}
                    options={
                      resourceOptions.length > 0
                        ? resourceOptions.map((r) => ({ value: r, label: r }))
                        : [{ value: "Chair A", label: "Chair A" }]
                    }
                    placeholder={resourceOptions.length === 0 ? "Select a service first" : undefined}
                  />
                  <Listbox
                    id="addon-select"
                    label="Optional add-ons"
                    value={addon}
                    onChange={setAddon}
                    options={ADDON_OPTIONS.map((a) => ({ value: a, label: a }))}
                  />
                </div>
              </div>

              {/* ── Section: Date & Time ───────────────────────────── */}
              <div className="space-y-4">
                <div className="border-b border-hairline pb-2">
                  <h3 className="text-base font-bold text-ink">Date &amp; time</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CalendarPicker
                    id="appt-date"
                    label="Date"
                    required
                    min={getManilaDateKey()}
                    value={date}
                    onChange={(v) => { setDate(v); setStep2Error(null); setConflictWarning(null); }}
                  />
                  <TimeListbox
                    id="time-select"
                    label="Available start time"
                    required
                    value={time}
                    onChange={(v) => { setTime(v); setStep2Error(null); setConflictWarning(null); }}
                  />
                </div>

                {/* End time / buffer */}
                {endTime && bufferEnd && (
                  <p className="text-xs text-burnt">
                    End {endTime} · {serviceDuration} min service · 10 min cleanup buffer until {bufferEnd}
                  </p>
                )}
                <p className="text-xs text-muted -mt-2">Asia/Manila (UTC+8)</p>
              </div>

              {/* Error / conflict banners */}
              {conflictWarning && <WarningBanner message={conflictWarning} />}
              {step2Error      && <ErrorBanner   message={step2Error} />}

              {/* Booking summary strip */}
              <div className="rounded-lg border border-hairline bg-mist px-4 py-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-medium text-body">
                  <span>
                    Service / package{" "}
                    <strong className="text-ink">₱{servicePrice > 0 ? servicePrice.toLocaleString() : "—"}</strong>
                  </span>
                  <span>Add-ons <strong className="text-ink">₱0</strong></span>
                  <span className="ml-auto font-bold text-ink">
                    Total ₱{servicePrice > 0 ? servicePrice.toLocaleString() : "—"}
                  </span>
                </div>
                <p className="text-muted">Deposit ₱0 · Pay at visit ₱{servicePrice > 0 ? servicePrice.toLocaleString() : "—"}</p>
                <p className="text-muted">
                  Status after creation: <strong className="text-ink">Confirmed</strong> · Automatic confirmation is enabled.
                </p>
              </div>

              {/* Slot verification note */}
              {!conflictWarning && selectedService && staffId && date && time && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <Icon name="check" weight="bold" className="size-3.5 shrink-0 text-success" />
                  Slot checked against staff shifts, breaks, leave, closures, resource allocation, and cleanup buffer.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-hairline flex items-center justify-between gap-3">
          {step === 2 ? (
            <Button variant="outline" size="sm" type="button"
              onClick={() => { setStep(1); setStep2Error(null); setConflictWarning(null); }}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>

            {step === 1 ? (
              <Button variant="brand" size="form" type="button" onClick={handleNext}
                className={`transition-opacity ${(customerType === "existing" ? customerSearch.trim() : customerName.trim()) ? "" : "opacity-60"}`}
              >
                Next: Select Service
              </Button>
            ) : (
              <Button variant="brand" size="form" type="button"
                disabled={isSubmitting || !selectedService || !staffId || !date || !time}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Creating..." : "Create Appointment"}
              </Button>
            )}
          </div>
        </div>
    </Modal>
  );
}
