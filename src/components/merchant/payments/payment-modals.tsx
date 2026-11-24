"use client";

import * as React from "react";
import { Icon } from "@/components/admin/icon";
import { formatPeso, resolvePaymentMethodLabel } from "@/lib/payments";
import type {
  PaymentMethod,
  PaymentRecordDTO,
  PaymentRecordStatus,
  RecordPaymentInput,
  RecordPaymentSuccessData,
  UnsettledAppointmentDTO,
} from "@/types/payments";

/* ---------------------------------------------------------------- Modal Shell */

export function ModalShell({
  isOpen,
  onClose,
  maxWidthClass = "max-w-[480px]",
  ariaLabelledBy,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  ariaLabelledBy: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={`w-full ${maxWidthClass} max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Status Badges */

export function StatusBadge({ status }: { status: PaymentRecordStatus | "unpaid" }) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
          Paid
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309]">
          Partial
        </span>
      );
    case "unpaid":
      return (
        <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#DC2626]">
          Unpaid
        </span>
      );
    case "voided":
      return (
        <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
          Voided
        </span>
      );
    case "refunded":
      return (
        <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
          Refunded
        </span>
      );
    default:
      return null;
  }
}

/* ----------------------- 1. Select Unsettled Appointment Modal --------------- */

interface SelectAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  unsettledAppointments: UnsettledAppointmentDTO[];
  onSelectAppointment: (appointment: UnsettledAppointmentDTO) => void;
}

export function SelectAppointmentModal({
  isOpen,
  onClose,
  unsettledAppointments,
  onSelectAppointment,
}: SelectAppointmentModalProps) {
  const [search, setSearch] = React.useState("");

  const filtered = unsettledAppointments.filter((apt) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      apt.customerName.toLowerCase().includes(q) ||
      apt.serviceSummary.toLowerCase().includes(q) ||
      apt.staffName.toLowerCase().includes(q)
    );
  });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[560px]"
      ariaLabelledBy="select-appointment-title"
    >
      <div className="flex items-center justify-between border-b border-[#EDECE8] px-6 py-4">
        <div>
          <h2 id="select-appointment-title" className="text-base font-semibold text-[#1E293B]">
            Select Appointment to Settle
          </h2>
          <p className="text-xs text-[#64748B]">Choose an unsettled appointment to record payment.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          aria-label="Close dialog"
        >
          <Icon name="close" className="size-5" />
        </button>
      </div>

      <div className="p-6">
        {/* Search Input */}
        <div className="relative mb-4">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, service, or staff..."
            className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-xs text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#C35000] focus:ring-1 focus:ring-[#C35000] focus:outline-none"
          />
        </div>

        {/* List of appointments */}
        <div className="flex max-h-[360px] flex-col gap-2.5 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Icon name="check" className="mx-auto size-8 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-[#1E293B]">All caught up!</p>
              <p className="text-xs text-[#64748B] mt-1">
                No unsettled appointments match your search criteria.
              </p>
            </div>
          ) : (
            filtered.map((apt) => (
              <div
                key={apt.appointmentId}
                className="flex items-center justify-between rounded-xl border border-[#EDECE8] bg-[#FCFBF7] p-3.5 transition-colors hover:border-[#C35000]/40 hover:bg-white"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1E293B] truncate">
                      {apt.customerName}
                    </span>
                    <StatusBadge status={apt.paymentStatus} />
                  </div>
                  <p className="text-xs text-[#475569] truncate mt-0.5">{apt.serviceSummary}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748B]">
                    <span>
                      {apt.formattedDate} • {apt.formattedTime}
                    </span>
                    <span>•</span>
                    <span>Staff: {apt.staffName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="block text-xs text-[#64748B]">Balance</span>
                    <span className="block font-bold text-sm text-[#C35000]">
                      {formatPeso(apt.balanceCents)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectAppointment(apt);
                      onClose();
                    }}
                    className="rounded-lg bg-[#C35000] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-[#EDECE8] px-6 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
        >
          Cancel
        </button>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 2. Record Payment Modal ---------------------------- */

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: UnsettledAppointmentDTO | null;
  onProceedToConfirmPartial: (input: RecordPaymentInput, appointment: UnsettledAppointmentDTO) => void;
  onSubmitFullPayment: (input: RecordPaymentInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  appointment,
  onProceedToConfirmPartial,
  onSubmitFullPayment,
  isSubmitting = false,
}: RecordPaymentModalProps) {
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [amountStr, setAmountStr] = React.useState("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Pre-fill amount with remaining balance when opened
  React.useEffect(() => {
    if (appointment && isOpen) {
      setAmountStr((appointment.balanceCents / 100).toFixed(2));
      setMethod("cash");
      setReferenceNumber("");
      setNotes("");
      setValidationError(null);
    }
  }, [appointment, isOpen]);

  if (!appointment) return null;

  const enteredCents = Math.round(Number(amountStr || 0) * 100);
  const remainingBalanceCents = appointment.balanceCents;

  const isFullPayment = enteredCents >= remainingBalanceCents;
  const isPartialPayment = enteredCents > 0 && enteredCents < remainingBalanceCents;
  const cashChangeCents =
    method === "cash" && enteredCents > remainingBalanceCents
      ? enteredCents - remainingBalanceCents
      : 0;
  const remainingAfterPayment = Math.max(0, remainingBalanceCents - enteredCents);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (enteredCents <= 0) {
      setValidationError("Please enter an amount greater than ₱0.00.");
      return;
    }

    if (method !== "cash" && enteredCents > remainingBalanceCents) {
      setValidationError(
        `Amount cannot exceed remaining balance of ${formatPeso(
          remainingBalanceCents
        )} for digital/card payments.`
      );
      return;
    }

    if (method !== "cash" && !referenceNumber.trim()) {
      setValidationError("Reference number is required for E-wallet and Card payments.");
      return;
    }

    const payload: RecordPaymentInput = {
      tenantId: "", // Will be assigned by caller or context
      slug: "",
      appointmentId: appointment.appointmentId,
      method,
      amountCents: enteredCents,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (isPartialPayment) {
      onProceedToConfirmPartial(payload, appointment);
    } else {
      onSubmitFullPayment(payload);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[500px]"
      ariaLabelledBy="record-payment-title"
    >
      <div className="flex items-center justify-between border-b border-[#EDECE8] px-6 py-4">
        <div>
          <h2 id="record-payment-title" className="text-base font-semibold text-[#1E293B]">
            Record Payment
          </h2>
          <p className="text-xs text-[#64748B]">Settle appointment balance</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          aria-label="Close dialog"
        >
          <Icon name="close" className="size-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Summary Strip */}
        <div className="rounded-xl border border-[#EDECE8] bg-[#FDFBF7] p-4 text-xs">
          <div className="flex justify-between items-start mb-2 pb-2 border-b border-[#EDECE8]/60">
            <div>
              <p className="font-bold text-sm text-[#1E293B]">{appointment.customerName}</p>
              <p className="text-[#64748B] mt-0.5">{appointment.serviceSummary}</p>
            </div>
            <span className="text-[11px] font-medium text-[#64748B]">
              {appointment.formattedDate} • {appointment.formattedTime}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-lg bg-white p-2 border border-[#EDECE8]">
              <span className="text-[#64748B] block text-[10px]">Total Due</span>
              <span className="font-semibold text-xs text-[#1E293B]">
                {formatPeso(appointment.totalCents)}
              </span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-[#EDECE8]">
              <span className="text-[#64748B] block text-[10px]">Previously Paid</span>
              <span className="font-semibold text-xs text-[#15803D]">
                {formatPeso(appointment.paidCents)}
              </span>
            </div>
            <div className="rounded-lg bg-white p-2 border border-[#C35000]/30">
              <span className="text-[#C35000] font-medium block text-[10px]">Remaining</span>
              <span className="font-bold text-xs text-[#C35000]">
                {formatPeso(appointment.balanceCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "cash", label: "Cash" },
                { id: "ewallet", label: "E-wallet" },
                { id: "card", label: "Card" },
              ] as const
            ).map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "border-[#C35000] bg-[#FFF7ED] text-[#C35000] shadow-xs"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Received Input */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#1E293B]">
              Amount Received (₱ PHP)
            </label>
            <button
              type="button"
              onClick={() => setAmountStr((remainingBalanceCents / 100).toFixed(2))}
              className="rounded-full bg-[#FFF7ED] border border-[#C35000]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#C35000] hover:bg-[#FFEED9]"
            >
              Pay Full Balance
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#64748B]">
              ₱
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-8 pr-3 text-sm font-semibold text-[#1E293B] focus:border-[#C35000] focus:ring-1 focus:ring-[#C35000] focus:outline-none"
            />
          </div>

          {/* Live Dynamic Preview */}
          <div className="mt-2 rounded-lg bg-[#F8FAFC] p-2.5 text-xs">
            {cashChangeCents > 0 ? (
              <div className="flex items-center justify-between text-emerald-700 font-semibold">
                <span>Change due to customer:</span>
                <span>{formatPeso(cashChangeCents)}</span>
              </div>
            ) : isPartialPayment ? (
              <div className="flex items-center justify-between text-amber-700 font-medium">
                <span>Remaining balance after payment:</span>
                <span className="font-bold">{formatPeso(remainingAfterPayment)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-emerald-700 font-medium">
                <span>Outcome:</span>
                <span className="font-semibold">Settled in full</span>
              </div>
            )}
          </div>
        </div>

        {/* Reference Number */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
            Reference Number{" "}
            {method !== "cash" ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-[#94A3B8] font-normal">(Optional)</span>
            )}
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={
              method === "cash"
                ? "Receipt reference (optional)"
                : "Transaction ID / Ref # (GCash, Maya, Card)"
            }
            className="w-full rounded-lg border border-[#E2E8F0] py-2 px-3 text-xs text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#C35000] focus:ring-1 focus:ring-[#C35000] focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
            Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add internal settlement notes or cashier remarks..."
            className="w-full rounded-lg border border-[#E2E8F0] py-2 px-3 text-xs text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#C35000] focus:ring-1 focus:ring-[#C35000] focus:outline-none resize-none"
          />
        </div>

        {/* Validation Error banner */}
        {validationError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-600 font-medium">
            {validationError}
          </div>
        )}

        {/* Footer buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[#EDECE8] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#C35000] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ----------------------- 3. Confirm Partial Payment Modal -------------------- */

interface ConfirmPartialModalProps {
  isOpen: boolean;
  onClose: () => void;
  input: RecordPaymentInput | null;
  appointment: UnsettledAppointmentDTO | null;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function ConfirmPartialPaymentModal({
  isOpen,
  onClose,
  input,
  appointment,
  onConfirm,
  isSubmitting = false,
}: ConfirmPartialModalProps) {
  if (!input || !appointment) return null;

  const payingNow = input.amountCents;
  const totalDue = appointment.balanceCents;
  const remaining = Math.max(0, totalDue - payingNow);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[420px]"
      ariaLabelledBy="confirm-partial-title"
    >
      <div className="p-7 text-center">
        {/* Amber Circular Badge */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-amber-500 bg-amber-50 text-amber-600">
          <Icon name="alert" className="size-7" />
        </div>

        <h3 id="confirm-partial-title" className="text-lg font-bold text-[#1E293B]">
          Record Partial Payment?
        </h3>
        <p className="mt-1 text-xs text-[#64748B]">
          The customer is settling a portion of the total due.
        </p>

        {/* Summary Box */}
        <div className="my-5 rounded-xl border border-[#EDECE8] bg-[#FDFBF7] p-4 text-xs text-left">
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Customer</span>
            <span className="font-semibold text-[#1E293B]">{appointment.customerName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Current Balance</span>
            <span className="font-semibold text-[#1E293B]">{formatPeso(totalDue)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Paying Now ({resolvePaymentMethodLabel(input.method)})</span>
            <span className="font-bold text-emerald-600">{formatPeso(payingNow)}</span>
          </div>
          <div className="flex justify-between py-1 pt-1.5 font-bold">
            <span className="text-[#C35000]">Remaining Balance</span>
            <span className="text-[#C35000]">{formatPeso(remaining)}</span>
          </div>
        </div>

        <p className="text-[11px] text-[#64748B] leading-relaxed">
          This appointment will remain marked as <span className="font-semibold text-amber-700">Partial</span> until the remaining balance of{" "}
          <span className="font-semibold text-[#1E293B]">{formatPeso(remaining)}</span> is settled.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/2 rounded-lg border border-[#E2E8F0] py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-1/2 rounded-lg bg-[#C35000] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Recording..." : "Confirm Partial"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 4. Payment Recorded Success Modal ------------------ */

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RecordPaymentSuccessData | null;
  onViewReceipt: (payment: PaymentRecordDTO) => void;
}

export function PaymentRecordedSuccessModal({
  isOpen,
  onClose,
  result,
  onViewReceipt,
}: PaymentSuccessModalProps) {
  if (!result) return null;
  const payment = result.payment;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[420px]"
      ariaLabelledBy="payment-success-title"
    >
      <div className="p-7 text-center">
        {/* Green Circular Badge */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-emerald-600 bg-emerald-50 text-emerald-600">
          <Icon name="check" className="size-7" />
        </div>

        <h3 id="payment-success-title" className="text-lg font-bold text-[#1E293B]">
          {payment.status === "paid" ? "Payment Recorded" : "Partial Payment Recorded"}
        </h3>
        <p className="mt-1 text-xs text-[#64748B]">
          {payment.status === "paid"
            ? "Appointment balance has been settled in full."
            : "Partial payment recorded. Remaining balance updated."}
        </p>

        {/* Compact Receipt Summary */}
        <div className="my-5 rounded-xl border border-[#EDECE8] bg-[#FDFBF7] p-4 text-xs text-left">
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Customer</span>
            <span className="font-semibold text-[#1E293B]">{payment.customerName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Method</span>
            <span className="font-semibold text-[#1E293B]">{payment.methodLabel}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Amount Paid</span>
            <span className="font-bold text-emerald-600">{formatPeso(payment.amountCents)}</span>
          </div>
          {result.changeCents > 0 && (
            <div className="flex justify-between py-1 border-b border-[#EDECE8]">
              <span className="text-[#64748B]">Cash Change Tendered</span>
              <span className="font-bold text-[#1E293B]">{formatPeso(result.changeCents)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 pt-1.5 items-center">
            <span className="text-[#64748B]">New Status</span>
            <StatusBadge status={payment.status} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewReceipt(payment);
            }}
            className="w-1/2 rounded-lg border border-[#C35000] py-2.5 text-xs font-semibold text-[#C35000] hover:bg-[#FFF7ED]"
          >
            View Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 rounded-lg bg-[#C35000] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 5. Payment Receipt / Details Modal ----------------- */

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PaymentRecordDTO | null;
  userRole?: string;
  onTriggerVoid: (record: PaymentRecordDTO) => void;
  onTriggerRefund: (record: PaymentRecordDTO) => void;
  onTriggerSettleBalance: (record: PaymentRecordDTO) => void;
}

export function PaymentReceiptModal({
  isOpen,
  onClose,
  record,
  userRole = "staff",
  onTriggerVoid,
  onTriggerRefund,
  onTriggerSettleBalance,
}: PaymentReceiptModalProps) {
  if (!record) return null;

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const receiptNumber = record.referenceNumber || `REC-${record.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[560px]"
      ariaLabelledBy="payment-receipt-title"
    >
      <div className="flex items-center justify-between border-b border-[#EDECE8] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <h2 id="payment-receipt-title" className="text-base font-semibold text-[#1E293B]">
            Payment Receipt
          </h2>
          <StatusBadge status={record.status} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
          aria-label="Close dialog"
        >
          <Icon name="close" className="size-5" />
        </button>
      </div>

      <div className="p-6 text-xs printable-receipt">
        {/* Receipt Header Strip */}
        <div className="flex justify-between items-center rounded-xl border border-[#EDECE8] bg-[#FDFBF7] p-4 mb-4">
          <div>
            <span className="text-[#64748B] block text-[11px]">Receipt Reference</span>
            <span className="font-mono font-bold text-sm text-[#1E293B]">{receiptNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-[#64748B] block text-[11px]">Payment Date</span>
            <span className="font-medium text-[#1E293B]">
              {record.formattedDate} • {record.formattedTime}
            </span>
          </div>
        </div>

        {/* Key-Value Details Grid */}
        <div className="rounded-xl border border-[#EDECE8] p-4 space-y-2 mb-4 bg-white">
          <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Customer</span>
            <span className="font-semibold text-[#1E293B]">{record.customerName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Service(s)</span>
            <span className="font-medium text-[#1E293B] text-right max-w-[240px] truncate">
              {record.serviceSummary}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Assigned Staff</span>
            <span className="font-medium text-[#1E293B]">{record.staffName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
            <span className="text-[#64748B]">Payment Method</span>
            <span className="font-medium text-[#1E293B]">{record.methodLabel}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748B]">Recorded By</span>
            <span className="font-medium text-[#1E293B]">{record.recordedByName}</span>
          </div>
        </div>

        {/* BIR Financial Breakdown Box */}
        <div className="rounded-xl border border-[#EDECE8] bg-[#FCFBF7] p-4 space-y-2">
          <div className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1">
            Philippine BIR Sales Summary (12% VAT)
          </div>
          <div className="flex justify-between text-[#64748B]">
            <span>Net of VAT (Vatable Sales)</span>
            <span className="font-medium text-[#1E293B]">{formatPeso(record.netCents)}</span>
          </div>
          <div className="flex justify-between text-[#64748B]">
            <span>Value Added Tax (12%)</span>
            <span className="font-medium text-[#1E293B]">{formatPeso(record.vatCents)}</span>
          </div>
          <div className="flex justify-between border-t border-[#EDECE8] pt-2 text-sm font-bold text-[#1E293B]">
            <span>Total Amount Paid</span>
            <span className="text-emerald-700">{formatPeso(record.amountCents)}</span>
          </div>
          {record.appointmentBalanceCents > 0 && (
            <div className="flex justify-between pt-1 font-semibold text-[#C35000]">
              <span>Remaining Balance</span>
              <span>{formatPeso(record.appointmentBalanceCents)}</span>
            </div>
          )}
        </div>

        {/* Void / Refund Notice Callout if applicable */}
        {record.status === "voided" && record.voidReason && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <p className="font-semibold flex items-center gap-1.5">
              <Icon name="alert" className="size-4" /> Void Reason Recorded
            </p>
            <p className="mt-1">{record.voidReason}</p>
          </div>
        )}

        {record.status === "refunded" && record.refundReason && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
            <p className="font-semibold flex items-center gap-1.5">
              <Icon name="alert" className="size-4" /> Refund Reason Recorded
            </p>
            <p className="mt-1">{record.refundReason}</p>
          </div>
        )}
      </div>

      {/* State & Role-Aware Footer */}
      <div className="flex items-center justify-between border-t border-[#EDECE8] px-6 py-4">
        {/* Left Actions: Owner/Admin can void or refund if eligible */}
        <div>
          {isOwnerOrAdmin && record.status === "paid" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerVoid(record);
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
              >
                Void Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerRefund(record);
                }}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Refund
              </button>
            </div>
          )}

          {isOwnerOrAdmin && record.status === "partial" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerVoid(record);
              }}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700"
            >
              Void Payment
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC]"
          >
            Close
          </button>

          {record.status === "partial" ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onTriggerSettleBalance(record);
              }}
              className="rounded-lg bg-[#C35000] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors"
            >
              Settle Balance
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-[#C35000] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors flex items-center gap-1.5"
            >
              <Icon name="document" className="size-4" /> Print Receipt
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 6. Void Payment Confirmation Modal ----------------- */

interface VoidPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PaymentRecordDTO | null;
  onConfirmVoid: (paymentId: string, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function VoidPaymentConfirmationModal({
  isOpen,
  onClose,
  record,
  onConfirmVoid,
  isSubmitting = false,
}: VoidPaymentModalProps) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!record) return null;

  const isFormValid = reason.trim().length >= 3;

  const handleConfirm = () => {
    if (!isFormValid) return;
    onConfirmVoid(record.id, reason.trim());
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[440px]"
      ariaLabelledBy="void-payment-title"
    >
      <div className="p-7 text-center">
        {/* Red Warning Circular Badge */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-red-600 bg-red-50 text-red-600">
          <Icon name="alert" className="size-7" />
        </div>

        <h3 id="void-payment-title" className="text-lg font-bold text-[#1E293B]">
          Void This Payment?
        </h3>
        <p className="mt-1 text-xs text-[#64748B]">
          This action will void the financial record and reopen the balance.
        </p>

        {/* Summary Box */}
        <div className="my-4 rounded-xl border border-[#EDECE8] bg-[#FDFBF7] p-3.5 text-xs text-left">
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Customer</span>
            <span className="font-semibold text-[#1E293B]">{record.customerName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Amount to Void</span>
            <span className="font-bold text-red-600">{formatPeso(record.amountCents)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748B]">Reference</span>
            <span className="font-mono text-[#1E293B]">
              {record.referenceNumber || record.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Required Reason Input */}
        <div className="text-left mb-4">
          <label className="block text-xs font-semibold text-[#1E293B] mb-1">
            Reason for voiding <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Incorrect cashier entry, customer card declined after swipe"
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#1E293B] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800 text-left mb-6">
          This record will remain in the audit log as Voided and the appointment balance will be reopened.
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/2 rounded-lg border border-[#E2E8F0] py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormValid || isSubmitting}
            className="w-1/2 rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Voiding..." : "Void Payment"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 7. Refund Payment Confirmation Modal ---------------- */

interface RefundPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PaymentRecordDTO | null;
  onConfirmRefund: (paymentId: string, amountCents: number, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RefundPaymentConfirmationModal({
  isOpen,
  onClose,
  record,
  onConfirmRefund,
  isSubmitting = false,
}: RefundPaymentModalProps) {
  const [refundAmountStr, setRefundAmountStr] = React.useState("");
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (record && isOpen) {
      setRefundAmountStr((record.amountCents / 100).toFixed(2));
      setReason("");
    }
  }, [record, isOpen]);

  if (!record) return null;

  const refundCents = Math.round(Number(refundAmountStr || 0) * 100);
  const isValidAmount = refundCents > 0 && refundCents <= record.amountCents;
  const isFormValid = isValidAmount && reason.trim().length >= 3;

  const handleConfirm = () => {
    if (!isFormValid) return;
    onConfirmRefund(record.id, refundCents, reason.trim());
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[440px]"
      ariaLabelledBy="refund-payment-title"
    >
      <div className="p-7 text-center">
        {/* Amber Circular Badge */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-amber-600 bg-amber-50 text-amber-600">
          <Icon name="alert" className="size-7" />
        </div>

        <h3 id="refund-payment-title" className="text-lg font-bold text-[#1E293B]">
          Issue Refund
        </h3>
        <p className="mt-1 text-xs text-[#64748B]">Process a refund for settled payment</p>

        {/* Summary Box */}
        <div className="my-4 rounded-xl border border-[#EDECE8] bg-[#FDFBF7] p-3.5 text-xs text-left">
          <div className="flex justify-between py-1 border-b border-[#EDECE8]">
            <span className="text-[#64748B]">Customer</span>
            <span className="font-semibold text-[#1E293B]">{record.customerName}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748B]">Original Payment</span>
            <span className="font-bold text-[#1E293B]">{formatPeso(record.amountCents)}</span>
          </div>
        </div>

        {/* Refund Amount Input */}
        <div className="text-left mb-3">
          <label className="block text-xs font-semibold text-[#1E293B] mb-1">
            Refund Amount (₱ PHP) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#64748B]">
              ₱
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={record.amountCents / 100}
              value={refundAmountStr}
              onChange={(e) => setRefundAmountStr(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-7 pr-3 text-xs font-semibold text-[#1E293B] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Reason Input */}
        <div className="text-left mb-6">
          <label className="block text-xs font-semibold text-[#1E293B] mb-1">
            Reason for refund <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Service dissatisfaction, customer requested cancellation"
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#1E293B] focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/2 rounded-lg border border-[#E2E8F0] py-2.5 text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormValid || isSubmitting}
            className="w-1/2 rounded-lg bg-red-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Refunding..." : "Confirm Refund"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 8. Action Completed Success Modal ------------------ */

interface ActionCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function ActionCompletedModal({
  isOpen,
  onClose,
  title,
  description,
}: ActionCompletedModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[400px]"
      ariaLabelledBy="action-completed-title"
    >
      <div className="p-7 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-emerald-600 bg-emerald-50 text-emerald-600">
          <Icon name="check" className="size-7" />
        </div>
        <h3 id="action-completed-title" className="text-lg font-bold text-[#1E293B]">
          {title}
        </h3>
        <p className="mt-1.5 text-xs text-[#64748B] leading-relaxed">{description}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[#C35000] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors"
        >
          Done
        </button>
      </div>
    </ModalShell>
  );
}

/* ----------------------- 9. Payment Action Error Modal ---------------------- */

interface PaymentErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  errorMessage: string;
}

export function PaymentActionErrorModal({
  isOpen,
  onClose,
  title = "Unable to Complete Action",
  errorMessage,
}: PaymentErrorModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[400px]"
      ariaLabelledBy="payment-error-title"
    >
      <div className="p-7 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-red-600 bg-red-50 text-red-600">
          <Icon name="alert" className="size-7" />
        </div>
        <h3 id="payment-error-title" className="text-lg font-bold text-[#1E293B]">
          {title}
        </h3>
        <p className="mt-2 text-xs text-[#475569] leading-relaxed bg-red-50 border border-red-200 rounded-lg p-3">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[#C35000] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors"
        >
          Got it
        </button>
      </div>
    </ModalShell>
  );
}
