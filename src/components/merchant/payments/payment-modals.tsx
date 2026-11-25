"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { Icon } from "@/components/admin/icon";
import { StatusPill, type PillTone } from "@/components/admin/primitives";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { formatPeso, resolvePaymentMethodLabel } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type {
  PaymentMethod,
  PaymentRecordDTO,
  PaymentRecordStatus,
  RecordPaymentInput,
  RecordPaymentSuccessData,
  UnsettledAppointmentDTO,
} from "@/types/payments";

const feedbackColors = { success: "text-success", warning: "text-burnt", danger: "text-danger" };

function PaymentDialog({
  open,
  onClose,
  title,
  description,
  status,
  busy = false,
  feedback,
  printable = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  status?: PaymentRecordStatus | "unpaid";
  busy?: boolean;
  feedback?: keyof typeof feedbackColors;
  printable?: boolean;
  children: React.ReactNode;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  if (!open) return null;

  return (
    <Modal
      open
      unstyled
      dismissOnBackdrop
      onClose={() => { if (!busy) onClose(); }}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100%-1rem)] overflow-hidden bg-white text-ink shadow-2xl sm:w-[calc(100%-2rem)]",
        feedback ? "max-w-[400px] rounded-2xl" : "max-w-3xl rounded-[14px] border border-line",
        printable && "print:my-0 print:max-h-none print:w-full print:max-w-none print:overflow-visible print:border-0 print:shadow-none print:backdrop:bg-transparent",
      )}
    >
      <div className="flex max-h-[92dvh] flex-col print:max-h-none" aria-busy={busy}>
        {feedback ? (
          <header className="shrink-0 px-6 pt-6 text-center sm:px-7 sm:pt-8">
            <div className={cn("mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] border-current", feedbackColors[feedback])}>
              <Icon name={feedback === "success" ? "check" : "alert"} weight="bold" className="size-7" />
            </div>
            <h2 id={titleId} className="text-xl font-semibold text-ink">{title}</h2>
            {description && <p id={descriptionId} className="mt-2.5 break-words text-sm leading-relaxed text-muted">{description}</p>}
          </header>
        ) : (
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id={titleId} className="font-display text-[26px] leading-[34px] text-ink">{title}</h2>
                {status && <StatusBadge status={status} />}
              </div>
              {description && <p id={descriptionId} className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close dialog"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-glyph transition-colors hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:opacity-50"
            >
              <Icon name="close" className="size-5" />
            </button>
          </header>
        )}
        {children}
      </div>
    </Modal>
  );
}

function PaymentDialogFooter({ children, centered = false }: { children: React.ReactNode; centered?: boolean }) {
  return (
    <footer className={cn(
      "flex shrink-0 flex-wrap items-center print:hidden",
      centered ? "justify-center gap-3 px-6 pb-6 pt-5 sm:px-7 sm:pb-8 [&_button]:h-10! [&_button]:py-0!" : "justify-end gap-2 border-t border-hairline px-4 py-4 sm:px-6",
    )}>
      {children}
    </footer>
  );
}

const paymentStatuses: Record<PaymentRecordStatus | "unpaid", { label: string; tone: PillTone }> = {
  paid: { label: "Paid", tone: "success" },
  partial: { label: "Partial", tone: "warning" },
  unpaid: { label: "Unpaid", tone: "danger" },
  voided: { label: "Voided", tone: "neutral" },
  refunded: { label: "Refunded", tone: "danger" },
};

export function StatusBadge({ status }: { status: PaymentRecordStatus | "unpaid" }) {
  const { label, tone } = paymentStatuses[status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
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
    <PaymentDialog
      open={isOpen}
      onClose={onClose}
      title="Select appointment to settle"
      description="Choose an unsettled appointment to record payment."
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
        {/* Search Input */}
        <div className="relative mb-4">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-glyph"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search unsettled appointments"
            placeholder="Search customer, service, or staff"
            className={cn(fieldOutlineClasses, "h-11 w-full pl-10 pr-3 text-sm text-ink placeholder:text-glyph")}
          />
        </div>

        {/* List of appointments */}
        <div className="flex flex-col gap-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              compact
              title={search.trim() ? "No appointments match your search." : "No unsettled appointments."}
              description={search.trim() ? "Try a different customer, service, or staff member." : "Appointments with an outstanding balance will appear here."}
            />
          ) : (
            filtered.map((apt) => (
              <div
                key={apt.appointmentId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-hairline bg-mist p-4"
              >
                <div className="min-w-0 flex-1 basis-40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-ink truncate">
                      {apt.customerName}
                    </span>
                    <StatusBadge status={apt.paymentStatus} />
                  </div>
                  <p className="text-xs text-body truncate mt-0.5">{apt.serviceSummary}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>
                      {apt.formattedDate} • {apt.formattedTime}
                    </span>
                    <span>•</span>
                    <span>Staff: {apt.staffName}</span>
                  </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <span className="block text-xs text-muted">Balance</span>
                    <span className="block font-bold text-sm text-burnt-dark">
                      {formatPeso(apt.balanceCents)}
                    </span>
                  </div>
                  <AdminButton
                    size="sm"
                    onClick={() => {
                      onSelectAppointment(apt);
                      onClose();
                    }}
                  >
                    Select
                  </AdminButton>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <PaymentDialogFooter>
        <AdminButton
          size="sm" variant="outline"
          onClick={onClose}
        >
          Cancel
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
  );
}

/* ----------------------- 2. Record Payment Modal ---------------------------- */

interface RecordPaymentModalProps {
  isOpen: boolean;
  isActive?: boolean;
  onClose: () => void;
  appointment: UnsettledAppointmentDTO | null;
  onProceedToConfirmPartial: (input: RecordPaymentInput, appointment: UnsettledAppointmentDTO) => void;
  onSubmitFullPayment: (input: RecordPaymentInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function RecordPaymentModal({ isOpen, appointment, ...props }: RecordPaymentModalProps) {
  if (!isOpen || !appointment) return null;
  return <RecordPaymentForm key={appointment.appointmentId} appointment={appointment} {...props} />;
}

function RecordPaymentForm({
  isActive = true,
  onClose,
  appointment,
  onProceedToConfirmPartial,
  onSubmitFullPayment,
  isSubmitting = false,
}: Omit<RecordPaymentModalProps, "isOpen" | "appointment"> & { appointment: UnsettledAppointmentDTO }) {
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [amountStr, setAmountStr] = React.useState(() => (appointment.balanceCents / 100).toFixed(2));
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const enteredCents = Math.round(Number(amountStr || 0) * 100);
  const remainingBalanceCents = appointment.balanceCents;

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
    <PaymentDialog
      open={isActive}
      onClose={onClose}
      title="Record payment"
      description="Settle appointment balance"
      busy={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          {/* Summary Strip */}
          <div className="rounded-xl bg-mist p-4 text-sm">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-2">
              <div>
                <p className="font-bold text-sm text-ink">{appointment.customerName}</p>
                <p className="text-muted mt-0.5">{appointment.serviceSummary}</p>
              </div>
              <span className="text-[11px] font-medium text-muted">
                {appointment.formattedDate} • {appointment.formattedTime}
              </span>
            </div>

            <div className="grid gap-2 pt-1 text-center min-[420px]:grid-cols-3">
              <div className="rounded-lg bg-white p-2 border border-hairline">
                <span className="text-muted block text-[10px]">Total Due</span>
                <span className="font-semibold text-xs text-ink">
                  {formatPeso(appointment.totalCents)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-hairline">
                <span className="text-muted block text-[10px]">Previously Paid</span>
                <span className="font-semibold text-xs text-success">
                  {formatPeso(appointment.paidCents)}
                </span>
              </div>
              <div className="rounded-lg bg-white p-2 border border-burnt/30">
                <span className="text-burnt-dark font-medium block text-[10px]">Remaining</span>
                <span className="font-bold text-xs text-burnt-dark">
                  {formatPeso(appointment.balanceCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <fieldset className="mt-5">
            <legend className="mb-1.5 text-sm font-semibold text-ink">Payment method</legend>
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
                    aria-pressed={active}
                    className={`h-11 rounded-lg border px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${
                      active
                        ? "border-burnt bg-burnt/10 text-burnt-dark shadow-xs"
                        : "border-hairline bg-white text-body hover:bg-mist"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Amount Received Input */}
          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="payment-amount" className="text-sm font-semibold text-ink">
                Amount Received (₱ PHP)
              </label>
              <button
                type="button"
                onClick={() => setAmountStr((remainingBalanceCents / 100).toFixed(2))}
                className="rounded-full bg-burnt/10 border border-burnt/30 px-2.5 py-0.5 text-[11px] font-semibold text-burnt-dark hover:bg-burnt/15"
              >
                Pay Full Balance
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                id="payment-amount"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className={cn(fieldOutlineClasses, "h-11 w-full pl-8 pr-3 text-sm text-ink placeholder:text-glyph")}
              />
            </div>

            {/* Live Dynamic Preview */}
            <div className="mt-2 rounded-lg bg-mist p-2.5 text-xs">
              {cashChangeCents > 0 ? (
                <div className="flex items-center justify-between text-success-deep font-semibold">
                  <span>Change due to customer:</span>
                  <span>{formatPeso(cashChangeCents)}</span>
                </div>
              ) : isPartialPayment ? (
                <div className="flex items-center justify-between text-warn-fg font-medium">
                  <span>Remaining balance after payment:</span>
                  <span className="font-bold">{formatPeso(remainingAfterPayment)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-success-deep font-medium">
                  <span>Outcome:</span>
                  <span className="font-semibold">Settled in full</span>
                </div>
              )}
            </div>
          </div>

          {/* Reference Number */}
          <div className="mt-4">
            <label htmlFor="payment-reference" className="mb-1.5 block text-sm font-semibold text-ink">
              Reference Number{" "}
              {method !== "cash" ? (
                <span className="text-danger">*</span>
              ) : (
                <span className="text-glyph font-normal">(Optional)</span>
              )}
            </label>
            <input
              type="text"
              id="payment-reference"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={
                method === "cash"
                  ? "Receipt reference (optional)"
                  : "Transaction ID / Ref # (GCash, Maya, Card)"
              }
              className={cn(fieldOutlineClasses, "h-11 w-full px-3 text-sm text-ink placeholder:text-glyph")}
            />
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label htmlFor="payment-notes" className="mb-1.5 block text-sm font-semibold text-ink">
              Notes <span className="text-glyph font-normal">(Optional)</span>
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add internal settlement notes or cashier remarks..."
              className={cn(fieldOutlineClasses, "min-h-20 py-2 w-full px-3 text-sm text-ink placeholder:text-glyph")}
            />
          </div>

          {/* Validation Error banner */}
          {validationError && (
            <div role="alert" className="mt-4 rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">
              {validationError}
            </div>
          )}
        </div>
        <PaymentDialogFooter>
          <AdminButton
            size="sm" variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </AdminButton>
          <AdminButton
            size="sm"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Recording..." : "Record Payment"}
          </AdminButton>
        </PaymentDialogFooter>
      </form>
    </PaymentDialog>
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
    <PaymentDialog
      open={isOpen}
      onClose={onClose}
      title="Record partial payment?"
      description="The customer is settling a portion of the total due."
      busy={isSubmitting}
      feedback="warning"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-4 sm:px-7">
        {/* Summary Box */}
        <div className="mb-4 space-y-1 rounded-xl bg-mist p-4 text-sm">
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Customer</span>
            <span className="font-semibold text-ink">{appointment.customerName}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Current Balance</span>
            <span className="font-semibold text-ink">{formatPeso(totalDue)}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Paying Now ({resolvePaymentMethodLabel(input.method)})</span>
            <span className="font-bold text-success">{formatPeso(payingNow)}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 pt-1.5 font-bold">
            <span className="text-burnt-dark">Remaining Balance</span>
            <span className="text-burnt-dark">{formatPeso(remaining)}</span>
          </div>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          This appointment will remain marked as <span className="font-semibold text-warn-fg">Partial</span> until the remaining balance of{" "}
          <span className="font-semibold text-ink">{formatPeso(remaining)}</span> is settled.
        </p>
      </div>

      <PaymentDialogFooter centered>
        <AdminButton
          size="sm" variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </AdminButton>
        <AdminButton
          size="sm"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Recording..." : "Confirm Partial"}
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
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
    <PaymentDialog
      open={isOpen}
      onClose={onClose}
      title={payment.status === "paid" ? "Payment recorded" : "Partial payment recorded"}
      description={payment.status === "paid"
        ? "Appointment balance has been settled in full."
        : "Partial payment recorded. Remaining balance updated."}
      feedback="success"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-4 sm:px-7">
        {/* Compact Receipt Summary */}
        <div className="mb-4 space-y-1 rounded-xl bg-mist p-4 text-sm">
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Customer</span>
            <span className="font-semibold text-ink">{payment.customerName}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Method</span>
            <span className="font-semibold text-ink">{payment.methodLabel}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Amount Paid</span>
            <span className="font-bold text-success">{formatPeso(payment.amountCents)}</span>
          </div>
          {result.changeCents > 0 && (
            <div className="flex justify-between gap-3 py-1 border-b border-hairline">
              <span className="text-muted">Cash Change Tendered</span>
              <span className="font-bold text-ink">{formatPeso(result.changeCents)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 py-1 pt-1.5 items-center">
            <span className="text-muted">New Status</span>
            <StatusBadge status={payment.status} />
          </div>
        </div>
      </div>

      <PaymentDialogFooter centered>
        <AdminButton
          size="sm" variant="outline"
          onClick={() => {
            onClose();
            onViewReceipt(payment);
          }}
        >
          View Receipt
        </AdminButton>
        <AdminButton
          size="sm"
          onClick={onClose}
        >
          Done
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
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
    <PaymentDialog
      open={isOpen}
      onClose={onClose}
      title="Payment receipt"
      status={record.status}
      printable
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6 printable-receipt text-sm print:overflow-visible">
        {/* Receipt Header Strip */}
        <div className="mb-4 flex flex-wrap justify-between gap-3 rounded-xl bg-mist p-4">
          <div>
            <span className="text-muted block text-[11px]">Receipt Reference</span>
            <span className="break-all font-mono text-sm font-semibold text-ink">{receiptNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-muted block text-[11px]">Payment Date</span>
            <span className="font-medium text-ink">
              {record.formattedDate} • {record.formattedTime}
            </span>
          </div>
        </div>

        {/* Key-Value Details Grid */}
        <div className="rounded-xl border border-hairline p-4 space-y-2 mb-4 bg-white">
          <div className="flex justify-between gap-3 py-1 border-b border-mist">
            <span className="text-muted">Customer</span>
            <span className="font-semibold text-ink">{record.customerName}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-mist">
            <span className="text-muted">Service(s)</span>
            <span className="max-w-[240px] break-words text-right font-medium text-ink">
              {record.serviceSummary}
            </span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-mist">
            <span className="text-muted">Assigned Staff</span>
            <span className="font-medium text-ink">{record.staffName}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-mist">
            <span className="text-muted">Payment Method</span>
            <span className="font-medium text-ink">{record.methodLabel}</span>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <span className="text-muted">Recorded By</span>
            <span className="font-medium text-ink">{record.recordedByName}</span>
          </div>
        </div>

        {/* BIR Financial Breakdown Box */}
        <div className="rounded-xl border border-hairline bg-mist p-4 space-y-2">
          <div className="text-[11px] font-semibold text-body uppercase tracking-wider mb-1">
            Philippine BIR Sales Summary (12% VAT)
          </div>
          <div className="flex justify-between gap-3 text-muted">
            <span>Net of VAT (Vatable Sales)</span>
            <span className="font-medium text-ink">{formatPeso(record.netCents)}</span>
          </div>
          <div className="flex justify-between gap-3 text-muted">
            <span>Value Added Tax (12%)</span>
            <span className="font-medium text-ink">{formatPeso(record.vatCents)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-hairline pt-2 text-sm font-bold text-ink">
            <span>Total Amount Paid</span>
            <span className="text-success-deep">{formatPeso(record.amountCents)}</span>
          </div>
          {record.appointmentBalanceCents > 0 && (
            <div className="flex justify-between gap-3 pt-1 font-semibold text-burnt-dark">
              <span>Remaining Balance</span>
              <span>{formatPeso(record.appointmentBalanceCents)}</span>
            </div>
          )}
        </div>

        {/* Void / Refund Notice Callout if applicable */}
        {record.status === "voided" && record.voidReason && (
          <div className="mt-4 rounded-xl border border-danger/20 bg-danger-bg p-3.5 text-xs text-danger-dark">
            <p className="font-semibold flex items-center gap-1.5">
              <Icon name="alert" className="size-4" /> Void Reason Recorded
            </p>
            <p className="mt-1">{record.voidReason}</p>
          </div>
        )}

        {record.status === "refunded" && record.refundReason && (
          <div className="mt-4 rounded-xl border border-hairline bg-warn-bg p-3.5 text-xs text-warn-fg">
            <p className="font-semibold flex items-center gap-1.5">
              <Icon name="alert" className="size-4" /> Refund Reason Recorded
            </p>
            <p className="mt-1">{record.refundReason}</p>
          </div>
        )}
      </div>

      <PaymentDialogFooter>
        {/* Left Actions: Owner/Admin can void or refund if eligible */}
        <div className="mr-auto empty:hidden">
          {isOwnerOrAdmin && record.status === "paid" && (
            <div className="flex items-center gap-2">
              <AdminButton
                size="sm" variant="danger"
                onClick={() => {
                  onClose();
                  onTriggerVoid(record);
                }}
              >
                Void Payment
              </AdminButton>
              <AdminButton
                size="sm" variant="outline" className="text-danger-dark"
                onClick={() => {
                  onClose();
                  onTriggerRefund(record);
                }}
              >
                Refund
              </AdminButton>
            </div>
          )}

          {isOwnerOrAdmin && record.status === "partial" && (
            <AdminButton
              size="sm" variant="danger"
              onClick={() => {
                onClose();
                onTriggerVoid(record);
              }}
            >
              Void Payment
            </AdminButton>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AdminButton
            size="sm" variant="outline"
            onClick={onClose}
          >
            Close
          </AdminButton>

          {record.status === "partial" ? (
            <AdminButton
              size="sm"
              onClick={() => {
                onClose();
                onTriggerSettleBalance(record);
              }}
            >
              Settle Balance
            </AdminButton>
          ) : (
            <AdminButton
              size="sm" className="gap-1.5"
              onClick={handlePrint}
            >
              <Icon name="document" className="size-4" /> Print Receipt
            </AdminButton>
          )}
        </div>
      </PaymentDialogFooter>
    </PaymentDialog>
  );
}

/* ----------------------- 6. Void Payment Confirmation Modal ----------------- */

interface VoidPaymentModalProps {
  isOpen: boolean;
  isActive?: boolean;
  onClose: () => void;
  record: PaymentRecordDTO | null;
  onConfirmVoid: (paymentId: string, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function VoidPaymentConfirmationModal({ isOpen, record, ...props }: VoidPaymentModalProps) {
  if (!isOpen || !record) return null;
  return <VoidPaymentForm key={record.id} record={record} {...props} />;
}

function VoidPaymentForm({
  isActive = true,
  onClose,
  record,
  onConfirmVoid,
  isSubmitting = false,
}: Omit<VoidPaymentModalProps, "isOpen" | "record"> & { record: PaymentRecordDTO }) {
  const [reason, setReason] = React.useState("");

  const isFormValid = reason.trim().length >= 3;

  const handleConfirm = () => {
    if (!isFormValid) return;
    onConfirmVoid(record.id, reason.trim());
  };

  return (
    <PaymentDialog
      open={isActive}
      onClose={onClose}
      title="Void payment?"
      description="This action will void the financial record and reopen the balance."
      busy={isSubmitting}
      feedback="danger"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-4 sm:px-7">
        {/* Summary Box */}
        <div className="mb-4 space-y-1 rounded-xl bg-mist p-4 text-sm">
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Customer</span>
            <span className="font-semibold text-ink">{record.customerName}</span>
          </div>
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Amount to Void</span>
            <span className="font-bold text-danger">{formatPeso(record.amountCents)}</span>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <span className="text-muted">Reference</span>
            <span className="font-mono text-ink">
              {record.referenceNumber || record.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Required Reason Input */}
        <div className="text-left mb-4">
          <label htmlFor="payment-void-reason" className="mb-1.5 block text-sm font-semibold text-ink">
            Reason for voiding <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="payment-void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Incorrect cashier entry, customer card declined after swipe"
            className={cn(fieldOutlineClasses, "h-11 w-full px-3 text-sm text-ink placeholder:text-glyph")}
          />
        </div>

        <div className="rounded-lg bg-warn-bg border border-hairline p-2.5 text-[11px] text-warn-fg text-left mb-6">
          This record will remain in the audit log as Voided and the appointment balance will be reopened.
        </div>
      </div>

      <PaymentDialogFooter centered>
        <AdminButton
          size="sm" variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </AdminButton>
        <AdminButton
          size="sm" variant="danger"
          onClick={handleConfirm}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? "Voiding..." : "Void Payment"}
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
  );
}

/* ----------------------- 7. Refund Payment Confirmation Modal ---------------- */

interface RefundPaymentModalProps {
  isOpen: boolean;
  isActive?: boolean;
  onClose: () => void;
  record: PaymentRecordDTO | null;
  onConfirmRefund: (paymentId: string, amountCents: number, reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function RefundPaymentConfirmationModal({ isOpen, record, ...props }: RefundPaymentModalProps) {
  if (!isOpen || !record) return null;
  return <RefundPaymentForm key={record.id} record={record} {...props} />;
}

function RefundPaymentForm({
  isActive = true,
  onClose,
  record,
  onConfirmRefund,
  isSubmitting = false,
}: Omit<RefundPaymentModalProps, "isOpen" | "record"> & { record: PaymentRecordDTO }) {
  const [refundAmountStr, setRefundAmountStr] = React.useState(() => (record.amountCents / 100).toFixed(2));
  const [reason, setReason] = React.useState("");

  const refundCents = Math.round(Number(refundAmountStr || 0) * 100);
  const isValidAmount = refundCents > 0 && refundCents <= record.amountCents;
  const isFormValid = isValidAmount && reason.trim().length >= 3;

  const handleConfirm = () => {
    if (!isFormValid) return;
    onConfirmRefund(record.id, refundCents, reason.trim());
  };

  return (
    <PaymentDialog
      open={isActive}
      onClose={onClose}
      title="Issue refund"
      description="Process a refund for this settled payment."
      busy={isSubmitting}
      feedback="danger"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-4 sm:px-7">
        {/* Summary Box */}
        <div className="mb-4 space-y-1 rounded-xl bg-mist p-4 text-sm">
          <div className="flex justify-between gap-3 py-1 border-b border-hairline">
            <span className="text-muted">Customer</span>
            <span className="font-semibold text-ink">{record.customerName}</span>
          </div>
          <div className="flex justify-between gap-3 py-1">
            <span className="text-muted">Original Payment</span>
            <span className="font-bold text-ink">{formatPeso(record.amountCents)}</span>
          </div>
        </div>

        {/* Refund Amount Input */}
        <div className="text-left mb-3">
          <label htmlFor="payment-refund-amount" className="mb-1.5 block text-sm font-semibold text-ink">
            Refund Amount (₱ PHP) <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
              ₱
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={record.amountCents / 100}
              id="payment-refund-amount"
              value={refundAmountStr}
              onChange={(e) => setRefundAmountStr(e.target.value)}
              className={cn(fieldOutlineClasses, "h-11 w-full pl-8 pr-3 text-sm text-ink placeholder:text-glyph")}
            />
          </div>
        </div>

        {/* Reason Input */}
        <div className="text-left mb-6">
          <label htmlFor="payment-refund-reason" className="mb-1.5 block text-sm font-semibold text-ink">
            Reason for refund <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            id="payment-refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Service dissatisfaction, customer requested cancellation"
            className={cn(fieldOutlineClasses, "h-11 w-full px-3 text-sm text-ink placeholder:text-glyph")}
          />
        </div>
      </div>

      <PaymentDialogFooter centered>
        <AdminButton
          size="sm" variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </AdminButton>
        <AdminButton
          size="sm" variant="danger"
          onClick={handleConfirm}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? "Refunding..." : "Confirm Refund"}
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
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
    <PaymentDialog
      open={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      feedback="success"
    >
      <PaymentDialogFooter centered>
        <AdminButton
          size="sm"
          onClick={onClose}
        >
          Done
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
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
    <PaymentDialog
      open={isOpen}
      onClose={onClose}
      title={title}
      feedback="danger"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-4 sm:px-7">
        <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{errorMessage}</p>
      </div>
      <PaymentDialogFooter centered>
        <AdminButton
          size="sm"
          onClick={onClose}
        >
          Got it
        </AdminButton>
      </PaymentDialogFooter>
    </PaymentDialog>
  );
}
