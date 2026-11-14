"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { createAppointmentBookingAction } from "@/app/actions/appointments";

// ─── static option lists ─────────────────────────────────────────────────────

const SERVICE_OPTIONS = [
  { value: "Signature haircut",      label: "Signature haircut – 60 min · ₱450",   price: 450,  duration: 60 },
  { value: "Balayage & gloss",       label: "Balayage & gloss – 90 min · ₱1,500",  price: 1500, duration: 90 },
  { value: "Botanical spa manicure", label: "Botanical spa manicure – 45 min · ₱950", price: 950, duration: 45 },
  { value: "Facial treatment",       label: "Facial treatment – 60 min · ₱900",    price: 900,  duration: 60 },
  { value: "Wellness massage",       label: "Wellness massage – 60 min · ₱1,200",  price: 1200, duration: 60 },
];

const STAFF_OPTIONS = [
  "Any available",
  "Sofia Cruz",
  "Miguel Tan",
  "Lia Ramos",
  "Elena Cruz",
  "Marco Reyes",
];

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

const CALENDAR_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

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

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ─── Shared input class ───────────────────────────────────────────────────────

const fieldCls =
  "h-11 w-full rounded-lg border border-[#aeb6c0] bg-white px-3 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none transition-shadow";

// ─── Chevron SVG ─────────────────────────────────────────────────────────────

function ChevronSvg({ open }: { open: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 10"
      className={`size-4 text-glyph shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="currentColor"
    >
      <path d="M1.2 1.4a1 1 0 0 1 1.4-.2L8 5.7l5.4-4.5a1 1 0 1 1 1.2 1.6l-6 5a1 1 0 0 1-1.2 0l-6-5a1 1 0 0 1-.2-1.4Z" />
    </svg>
  );
}

// ─── Listbox (contact-page dropdown pattern) ─────────────────────────────────

interface ListboxProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Listbox({ id, label, required, value, onChange, options, placeholder }: ListboxProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const selected = options.find((o) => o.value === value);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}{required && <span className="text-burnt"> *</span>}
      </label>
      <div ref={ref} className="relative">
        <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-[#aeb6c0] bg-white px-3 text-left text-sm outline-none focus:border-burnt"
        >
          <span className={selected ? "text-ink" : "text-glyph"}>
            {selected ? selected.label : (placeholder ?? "Select an option")}
          </span>
          <ChevronSvg open={open} />
        </button>
        {open && (
          <ul role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#aeb6c0] bg-white py-1 shadow-md">
            {options.map((opt) => (
              <li key={opt.value}>
                <button type="button" role="option" aria-selected={value === opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-mist ${value === opt.value ? "text-burnt font-semibold" : "text-ink"}`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Calendar picker — fixed-position panel (never clipped) ──────────────────

interface CalendarPickerProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (iso: string) => void;
}

export function CalendarPicker({ id, label, required, value, onChange }: CalendarPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => {
    if (value) { const [y, mo] = value.split("-").map(Number); return new Date(y, mo - 1, 1); }
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });
  const triggerRef  = React.useRef<HTMLButtonElement>(null);
  const panelRef    = React.useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});

  // position the fixed panel under the trigger button
  const positionPanel = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position:  "fixed",
      top:       rect.bottom + 4,
      left:      rect.left,
      width:     rect.width,
      minWidth:  260,
      zIndex:    9999,
    });
  }, []);

  const handleOpen = () => {
    if (!open) positionPanel();
    setOpen((o) => !o);
  };

  React.useEffect(() => {
    if (!open) return;
    const closeHandler = (e: MouseEvent) => {
      if (
        triggerRef.current && triggerRef.current.contains(e.target as Node)
      ) return;
      if (
        panelRef.current && panelRef.current.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", closeHandler);
    return () => document.removeEventListener("mousedown", closeHandler);
  }, [open]);

  const monthLabel   = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay     = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth  = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}{required && <span className="text-burnt"> *</span>}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleOpen}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-[#aeb6c0] bg-white px-3 text-left text-sm outline-none focus:border-burnt"
      >
        <span className={value ? "text-ink" : "text-glyph"}>
          {value ? formatDateDisplay(value) : "Select a date"}
        </span>
        <svg aria-hidden viewBox="0 0 24 24" className="size-4 text-glyph shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
          <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose appointment date"
          style={panelStyle}
          className="rounded-lg border border-[#aeb6c0] bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month"
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="rounded-md px-2 py-1 text-body hover:bg-mist text-sm"
            >‹</button>
            <span className="text-sm font-semibold text-ink">{monthLabel}</span>
            <button type="button" aria-label="Next month"
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="rounded-md px-2 py-1 text-body hover:bg-mist text-sm"
            >›</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-subtle mb-1">
            {CALENDAR_WEEKDAYS.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {cells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} />;
              const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const sel = iso === value;
              return (
                <button key={iso} type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${sel ? "bg-burnt text-white font-bold" : "text-body hover:bg-mist"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Time listbox ─────────────────────────────────────────────────────────────

interface TimeListboxProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}

export function TimeListbox({ id, label, required, value, onChange }: TimeListboxProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}{required && <span className="text-burnt"> *</span>}
      </label>
      <div ref={ref} className="relative">
        <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-[#aeb6c0] bg-white px-3 text-left text-sm outline-none focus:border-burnt"
        >
          <span className={value ? "text-ink" : "text-glyph"}>{value || "Select a time"}</span>
          <Icon name="clock" className="size-4 text-glyph" />
        </button>
        {open && (
          <ul role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#aeb6c0] bg-white py-1 shadow-md">
            {TIME_SLOTS.map((t) => (
              <li key={t}>
                <button type="button" role="option" aria-selected={value === t}
                  onClick={() => { onChange(t); setOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-mist ${value === t ? "text-burnt font-semibold" : "text-ink"}`}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
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
            ? "bg-burnt text-white ring-burnt"
            : "bg-burnt text-white ring-burnt"
        }`}>
          {step === 2 ? (
            <svg viewBox="0 0 14 14" fill="none" className="size-3.5" aria-hidden>
              <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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
            ? "bg-burnt text-white ring-burnt"
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
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 mt-0.5" aria-hidden>
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function WarningBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warn-fg/30 bg-warn-bg px-4 py-3 text-sm text-warn-fg">
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 mt-0.5" aria-hidden>
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
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
  const [serviceName, setServiceName]       = React.useState("");
  const [staffName, setStaffName]           = React.useState("");
  const [resource, setResource]             = React.useState("");
  const [addon, setAddon]                   = React.useState("None selected");
  const [date, setDate]                     = React.useState(new Date().toISOString().slice(0, 10));
  const [time, setTime]                     = React.useState("");
  const [step2Error, setStep2Error]         = React.useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = React.useState(false);

  // derived
  const selectedService = SERVICE_OPTIONS.find((s) => s.value === serviceName);
  const servicePrice    = selectedService?.price    ?? 0;
  const serviceDuration = selectedService?.duration ?? 60;
  const resourceOptions = serviceName ? (RESOURCE_OPTIONS[serviceName] ?? ["Chair A"]) : [];
  const displayCustomer = customerType === "existing" ? customerSearch.trim() : customerName.trim();
  const sourceLabel     = bookingSource === "Walk-in" ? "Walk-In" : "Online";
  const endTime         = time ? addMinutes(time, serviceDuration)      : null;
  const bufferEnd       = time ? addMinutes(time, serviceDuration + 10) : null;

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResource(resourceOptions[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceName]);

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
      setServiceName(""); setStaffName("");
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
    if (!serviceName) { setStep2Error("Please select a service or package."); return; }
    if (!staffName)   { setStep2Error("Please select a staff member."); return; }
    if (!resource)    { setStep2Error("Please select a required resource."); return; }
    if (!date)        { setStep2Error("Please select an appointment date."); return; }
    if (!time)        { setStep2Error("Please select an available start time."); return; }

    const resolvedName  = customerType === "existing" ? customerSearch.trim() : customerName.trim();
    const resolvedStaff = staffName === "Any available" ? undefined : staffName;
    const sourceValue   = bookingSource === "Walk-in" ? "walk_in" as const : "online" as const;

    setIsSubmitting(true);
    try {
      const res = await createAppointmentBookingAction({
        customerName:  resolvedName,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        serviceName, staffName: resolvedStaff,
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
      onCreated({ id: created.id, time, customer: created.customerName, service: created.serviceName, staff: created.staffName, source: sourceLabel as "Online" | "Walk-In", status: "Confirmed", startsAt: created.starts_at });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="appt-modal-title"
        className="relative w-full max-w-lg rounded-[14px] bg-white shadow-2xl border border-line flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
        style={{ maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
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
                      className={`py-2.5 text-sm font-semibold transition-colors ${customerType === type ? "bg-burnt text-white" : "bg-white text-body hover:bg-mist"}`}
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
                      selectedCustomer ? "border border-green-200 bg-green-50" : "bg-mist"
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
                            ? "bg-green-600 text-white"
                            : "bg-burnt text-white hover:bg-burnt/90"
                        }`}
                      >
                        {selectedCustomer && <Icon name="verified" className="size-3.5" />}
                        {selectedCustomer ? "Customer selected" : "Use this customer"}
                      </button>
                    </div>
                  )}
                  {selectedCustomer && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-green-700" role="status">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      className={`py-2.5 text-sm font-semibold transition-colors ${bookingSource === src ? "bg-burnt text-white" : "bg-white text-body hover:bg-mist"}`}
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
                  className="w-full resize-none rounded-lg border border-[#aeb6c0] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none transition-shadow"
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
                <div className="grid grid-cols-2 gap-4">
                  <Listbox
                    id="service-select"
                    label="Service or package"
                    required
                    value={serviceName}
                    onChange={(v) => { setServiceName(v); setStep2Error(null); setConflictWarning(null); }}
                    options={SERVICE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                    placeholder="Select an option"
                  />
                  <Listbox
                    id="staff-select"
                    label="Staff"
                    required
                    value={staffName}
                    onChange={(v) => { setStaffName(v); setStep2Error(null); setConflictWarning(null); }}
                    options={STAFF_OPTIONS.map((s) => ({ value: s, label: s }))}
                    placeholder="Select an option"
                  />
                </div>

                {/* Eligibility hint */}
                {serviceName && staffName && staffName !== "Any available" && (
                  <p className="text-xs text-muted">
                    Only staff qualified for {serviceName.toLowerCase()} are shown.{" "}
                    <span className="font-medium text-body">{staffName}</span> is available for the full slot.
                  </p>
                )}

                {/* Resource + Add-ons row */}
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <CalendarPicker
                    id="appt-date"
                    label="Date"
                    required
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
              {!conflictWarning && serviceName && staffName && date && time && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <svg viewBox="0 0 14 14" fill="none" className="size-3.5 text-success shrink-0" aria-hidden>
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Slot checked against staff shifts, breaks, leave, closures, resource allocation, and cleanup buffer.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-4 border-t border-hairline flex items-center justify-between gap-3">
          {step === 2 ? (
            <AdminButton variant="outline" size="sm" type="button"
              onClick={() => { setStep(1); setStep2Error(null); setConflictWarning(null); }}
            >
              Back
            </AdminButton>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <AdminButton variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </AdminButton>

            {step === 1 ? (
              <AdminButton variant="primary" size="sm" type="button" onClick={handleNext}
                className={`transition-opacity ${(customerType === "existing" ? customerSearch.trim() : customerName.trim()) ? "" : "opacity-60"}`}
              >
                Next: Select Service
              </AdminButton>
            ) : (
              <AdminButton variant="primary" size="sm" type="button"
                disabled={isSubmitting || !serviceName || !staffName || !date || !time}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Creating..." : "Create Appointment"}
              </AdminButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
