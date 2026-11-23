"use client";

import * as React from "react";
import { Checkbox } from "@/components/admin/primitives";
import {
  SUPPLIER_BILLING_INFO,
  type BusinessContactDefaults,
  type SubscriptionInvoice,
  type TenantBillingProfile,
} from "@/types/subscription";
import { cn } from "@/lib/utils";
import { ModalShell } from "./modal-shell";
import {
  formatLongDate,
  formatPeriodRange,
  formatPhp,
  formatPhpInputValue,
} from "./formatters";

interface BillingDetailsModalProps {
  open: boolean;
  onClose: () => void;
  profile: TenantBillingProfile;
  businessDefaults: BusinessContactDefaults;
  submitting: boolean;
  error: string | null;
  onSave: (values: {
    billingName: string;
    billingEmail: string;
    sameAsBusinessEmail: boolean;
    streetBarangay: string;
    city: string;
    province: string;
    postalCode: string;
    tin: string;
    branchCode: string;
  }) => void;
}

export function BillingDetailsModal({
  open,
  onClose,
  profile,
  businessDefaults,
  submitting,
  error,
  onSave,
}: BillingDetailsModalProps) {
  const [billingName, setBillingName] = React.useState(profile.billingName);
  const [billingEmail, setBillingEmail] = React.useState(profile.billingEmail);
  const [sameAsBusinessEmail, setSameAsBusinessEmail] = React.useState(
    profile.sameAsBusinessEmail,
  );
  const [streetBarangay, setStreetBarangay] = React.useState(
    profile.streetBarangay,
  );
  const [city, setCity] = React.useState(profile.city);
  const [province, setProvince] = React.useState(profile.province);
  const [postalCode, setPostalCode] = React.useState(profile.postalCode);
  const [tin, setTin] = React.useState(profile.tin);
  const [branchCode, setBranchCode] = React.useState(profile.branchCode);

  const isDirty =
    billingName !== profile.billingName ||
    billingEmail !== profile.billingEmail ||
    sameAsBusinessEmail !== profile.sameAsBusinessEmail ||
    streetBarangay !== profile.streetBarangay ||
    city !== profile.city ||
    province !== profile.province ||
    postalCode !== profile.postalCode ||
    tin !== profile.tin ||
    branchCode !== profile.branchCode;

  const isValid =
    billingName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail.trim()) &&
    streetBarangay.trim().length >= 2 &&
    city.trim().length >= 2 &&
    province.trim().length >= 2 &&
    postalCode.trim().length >= 3;

  const handleToggleSync = (checked: boolean) => {
    setSameAsBusinessEmail(checked);
    if (checked) {
      if (businessDefaults.businessEmail) {
        setBillingEmail(businessDefaults.businessEmail);
      }
      if (businessDefaults.streetBarangay) {
        setStreetBarangay(businessDefaults.streetBarangay);
      }
      if (businessDefaults.city) setCity(businessDefaults.city);
      if (businessDefaults.province) setProvince(businessDefaults.province);
      if (businessDefaults.postalCode)
        setPostalCode(businessDefaults.postalCode);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Billing details"
      subtitle="Invoice contact can differ from the owner's login account."
      maxWidthClass="max-w-[600px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 min-w-[110px] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#243242] transition-colors hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !isDirty || !isValid}
            onClick={() =>
              onSave({
                billingName,
                billingEmail,
                sameAsBusinessEmail,
                streetBarangay,
                city,
                province,
                postalCode,
                tin,
                branchCode,
              })
            }
            className="inline-flex h-11 min-w-[148px] items-center justify-center rounded-lg bg-[#C35000] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#A64400] disabled:bg-[#E5B896] disabled:text-white"
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#243242]">
            Billing name *
          </label>
          <input
            type="text"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#243242]">
            Billing email *
          </label>
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="pl-2">
            <Checkbox
              checked={sameAsBusinessEmail}
              onChange={handleToggleSync}
              tone="brand"
              label={
                <span className="font-medium text-[#243242]">
                  Same as Business Email
                </span>
              }
            />
          </div>
          <p className="text-xs leading-[18px] text-[#6B7280]">
            Synced with your business address. Turn this off to edit a separate
            billing address.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#243242]">
            Street / barangay *
          </label>
          <input
            type="text"
            value={streetBarangay}
            disabled={sameAsBusinessEmail && Boolean(streetBarangay)}
            onChange={(e) => setStreetBarangay(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#243242]">
            City *
          </label>
          <input
            type="text"
            value={city}
            disabled={sameAsBusinessEmail && Boolean(city)}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#243242]">
            Province *
          </label>
          <input
            type="text"
            value={province}
            disabled={sameAsBusinessEmail && Boolean(province)}
            onChange={(e) => setProvince(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#243242]">
            Postal code *
          </label>
          <input
            type="text"
            value={postalCode}
            disabled={sameAsBusinessEmail && Boolean(postalCode)}
            onChange={(e) => setPostalCode(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20 disabled:bg-[#F9FAFB] disabled:text-[#6B7280]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#243242]">
              TIN (optional)
            </label>
            <input
              type="text"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder="123-456-789"
              className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#243242]">
              Branch code (optional)
            </label>
            <input
              type="text"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              placeholder="000"
              className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
            />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

interface InvoiceDeliveryPreferencesModalProps {
  open: boolean;
  onClose: () => void;
  initialCcEmail: string;
  renewalRemindersEnabled: boolean;
  renewalReminderDays: number[];
  submitting: boolean;
  error: string | null;
  onSave: (payload: {
    ccEmail: string;
    renewalRemindersEnabled: boolean;
  }) => void;
}

export function InvoiceDeliveryPreferencesModal({
  open,
  onClose,
  initialCcEmail,
  renewalRemindersEnabled: initialReminders,
  renewalReminderDays,
  submitting,
  error,
  onSave,
}: InvoiceDeliveryPreferencesModalProps) {
  const [ccEmail, setCcEmail] = React.useState(initialCcEmail);
  const [remindersEnabled, setRemindersEnabled] =
    React.useState(initialReminders);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Invoice delivery preferences"
      maxWidthClass="max-w-[580px]"
      footer={
        <button
          type="button"
          onClick={() =>
            onSave({ ccEmail, renewalRemindersEnabled: remindersEnabled })
          }
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#C35000] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#A64400] disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save preferences"}
        </button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="cc-email-input"
            className="block text-sm font-medium text-[#243242]"
          >
            CC email (optional)
          </label>
          <input
            id="cc-email-input"
            type="email"
            value={ccEmail}
            onChange={(e) => setCcEmail(e.target.value)}
            placeholder="accounts@bellavita.example"
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] placeholder:text-[#9CA3AF] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
          <p className="mt-2 text-xs leading-[18px] text-[#6B7280]">
            Invoices go to the billing email. This address receives a copy.
          </p>
        </div>

        <div className="rounded-[10px] bg-[#F4F5F7] px-4 py-3.5">
          <Checkbox
            checked={remindersEnabled}
            onChange={setRemindersEnabled}
            tone="brand"
            label={
              <span className="text-sm font-medium text-[#243242]">
                Automated renewal due-date email reminders
              </span>
            }
          />
          <p className="mt-1.5 pl-6 text-xs leading-[18px] text-[#6B7280]">
            Sent automatically {renewalReminderDays.join(", ")} days before your
            upcoming renewal date to your billing email and CC recipient.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

interface SubscriptionInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice | null;
  timezone: string;
  canEdit: boolean;
  onDownloadPdf: (invoice: SubscriptionInvoice) => void;
  onOpenSubmitPayment: (invoice: SubscriptionInvoice) => void;
}

export function SubscriptionInvoiceModal({
  open,
  onClose,
  invoice,
  timezone,
  canEdit,
  onDownloadPdf,
  onOpenSubmitPayment,
}: SubscriptionInvoiceModalProps) {
  if (!invoice) return null;

  const isPaid = invoice.status === "paid";
  const isUnpaidOrOverdue =
    invoice.status === "unpaid" || invoice.status === "overdue";
  const statusLabel =
    invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Subscription invoice"
      subtitle={`${invoice.invoiceNumber} · ${statusLabel}`}
      maxWidthClass="max-w-[600px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#243242] transition-colors hover:bg-[#F9FAFB]"
          >
            Close
          </button>
          {isUnpaidOrOverdue && canEdit ? (
            <>
              <button
                type="button"
                onClick={() => onDownloadPdf(invoice)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#243242] transition-colors hover:bg-[#F9FAFB]"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => onOpenSubmitPayment(invoice)}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#C35000] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A64400]"
              >
                Submit payment details
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onDownloadPdf(invoice)}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#C35000] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#A64400]"
            >
              Download PDF
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5 text-sm">
        <div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3.5 py-1 text-xs font-semibold",
              isPaid
                ? "bg-[#E9F9EE] text-[#15803D]"
                : "bg-[#F3F4F6] text-[#243242]",
            )}
          >
            {statusLabel}
          </span>
        </div>

        <div className="space-y-0.5">
          <p className="text-[15px] font-semibold text-[#243242]">
            {SUPPLIER_BILLING_INFO.legalName}
          </p>
          <p className="text-xs text-[#6B7280]">
            {SUPPLIER_BILLING_INFO.address}
          </p>
          <p className="text-xs text-[#6B7280]">
            Supplier TIN: {SUPPLIER_BILLING_INFO.tin}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="font-semibold text-[#243242]">
            Billed to: {invoice.billedToName}
          </p>
          {invoice.billedToAddress && (
            <p className="text-xs text-[#4B5563]">{invoice.billedToAddress}</p>
          )}
          {(invoice.billedToTin || invoice.billedToBranch) && (
            <p className="text-xs text-[#4B5563]">
              {[
                invoice.billedToTin ? `TIN: ${invoice.billedToTin}` : null,
                invoice.billedToBranch
                  ? `Branch: ${invoice.billedToBranch}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p className="text-xs text-[#4B5563]">{invoice.billedToEmail}</p>
        </div>

        <dl className="space-y-2.5 pt-1 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Invoice number</dt>
            <dd className="font-medium text-[#243242]">
              {invoice.invoiceNumber}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Billing period</dt>
            <dd className="font-medium text-[#243242]">
              {formatPeriodRange(
                invoice.billingPeriodStart,
                invoice.billingPeriodEnd,
                timezone,
              )}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Issued</dt>
            <dd className="font-medium text-[#243242]">
              {formatLongDate(invoice.issuedAt, timezone)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Due date</dt>
            <dd className="font-medium text-[#243242]">
              {formatLongDate(invoice.dueAt, timezone)}
            </dd>
          </div>
          {invoice.paidAt && (
            <div className="grid grid-cols-2 gap-4">
              <dt className="text-[#6B7280]">Paid date</dt>
              <dd className="font-medium text-[#243242]">
                {formatLongDate(invoice.paidAt, timezone)}
              </dd>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <dt className="text-[#6B7280]">
              {invoice.tierName} subscription · 1 month
            </dt>
            <dd className="font-medium text-[#243242]">
              {formatPhp(invoice.subtotalCents, true)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">VAT · Illustrative 12%</dt>
            <dd className="font-medium text-[#243242]">
              {formatPhp(invoice.vatCents, true)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Total invoice amount</dt>
            <dd className="font-medium text-[#243242]">
              {formatPhp(invoice.totalCents)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Amount paid</dt>
            <dd className="font-medium text-[#243242]">
              {formatPhp(invoice.amountPaidCents)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <dt className="text-[#6B7280]">Balance due</dt>
            <dd className="font-medium text-[#243242]">
              {formatPhp(invoice.balanceDueCents)}
            </dd>
          </div>
        </dl>

        <div className="space-y-1 rounded-[10px] bg-[#F4F5F7] px-4 py-3.5 text-xs leading-[18px] text-[#374151]">
          <p className="font-medium text-[#243242]">
            {SUPPLIER_BILLING_INFO.bankName}
          </p>
          <p>Account: {SUPPLIER_BILLING_INFO.accountMask}</p>
          <p>Transfer reference: {invoice.invoiceNumber}</p>
          {isUnpaidOrOverdue && (
            <p className="pt-0.5 text-[#4B5563]">
              Payment verification: allow up to 2 business days after submitting
              payment details.
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

interface SubmitPaymentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice | null;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: {
    invoiceId: string;
    bankTransferReference: string;
    transferDate: string;
    amountPhp: string;
    receiptFile: File | null;
  }) => void;
}

export function SubmitPaymentDetailsModal({
  open,
  onClose,
  invoice,
  submitting,
  error,
  onSubmit,
}: SubmitPaymentDetailsModalProps) {
  const [reference, setReference] = React.useState("");
  const [transferDate, setTransferDate] = React.useState("");
  const [amountPhp, setAmountPhp] = React.useState(
    invoice
      ? formatPhpInputValue(invoice.balanceDueCents || invoice.totalCents)
      : "",
  );
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!invoice) return null;

  const parsedAmount = Number(amountPhp.replace(/,/g, ""));
  const isValid =
    reference.trim().length >= 3 &&
    /^\d{4}-\d{2}-\d{2}$/.test(transferDate) &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Submit payment details"
      subtitle="Your invoice stays unpaid until the transfer is verified."
      maxWidthClass="max-w-[600px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 min-w-[108px] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-semibold text-[#243242] transition-colors hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !isValid}
            onClick={() =>
              onSubmit({
                invoiceId: invoice.id,
                bankTransferReference: reference.trim(),
                transferDate,
                amountPhp: amountPhp.trim(),
                receiptFile,
              })
            }
            className="inline-flex h-11 min-w-[144px] items-center justify-center rounded-lg bg-[#C35000] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#A64400] disabled:bg-[#E5B896] disabled:text-white"
          >
            {submitting ? "Submitting..." : "Submit details"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            {error}
          </div>
        )}

        <div className="rounded-[10px] bg-[#F4F5F7] px-4 py-3 text-sm font-medium text-[#243242]">
          {invoice.invoiceNumber}
        </div>

        <div>
          <label
            htmlFor="payment-bank-ref"
            className="block text-sm font-medium text-[#243242]"
          >
            Bank transfer reference *
          </label>
          <input
            id="payment-bank-ref"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Enter your transaction reference"
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] placeholder:text-[#6B7280] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
        </div>

        <div>
          <label
            htmlFor="payment-transfer-date"
            className="block text-sm font-medium text-[#243242]"
          >
            Transfer date *
          </label>
          <input
            id="payment-transfer-date"
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
        </div>

        <div>
          <label
            htmlFor="payment-amount-php"
            className="block text-sm font-medium text-[#243242]"
          >
            Amount transferred (PHP) *
          </label>
          <input
            id="payment-amount-php"
            type="text"
            value={amountPhp}
            onChange={(e) => setAmountPhp(e.target.value)}
            placeholder="1,499.00"
            className="mt-1.5 h-11 w-full rounded-[10px] border border-[#E5E7EB] px-3.5 text-sm text-[#243242] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
        </div>

        <div className="rounded-[10px] bg-[#F4F5F7] px-4 py-3 text-xs text-[#4B5563]">
          Attach receipt or transfer confirmation (optional) · PNG, JPG or PDF,
          up to 10 MB.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            className="hidden"
            onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#243242] transition-colors hover:bg-[#F9FAFB]"
          >
            Choose file
          </button>
          {receiptFile && (
            <div className="flex items-center gap-2 text-xs text-[#4B5563]">
              <span className="max-w-[260px] truncate font-medium text-[#243242]">
                {receiptFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReceiptFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-[#C35000] hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
