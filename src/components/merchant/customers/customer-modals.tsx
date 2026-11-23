"use client";

import * as React from "react";
import type {
  CreateCustomerInput,
  CustomerAccountType,
  UpdateCustomerInput,
} from "@/types/customers";
import { Icon } from "@/components/admin/icon";
import { inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ Shared */

function ModalShell({
  isOpen,
  onClose,
  maxWidthClass = "max-w-[420px]",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={`w-full ${maxWidthClass} rounded-2xl bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Status Modal */

interface StatusFeedbackModalProps {
  isOpen: boolean;
  tone?: "success" | "danger";
  title: string;
  description: string;
  inviteUrl?: string | null;
  deliveryWarning?: string | null;
  onClose: () => void;
}

export function StatusFeedbackModal({
  isOpen,
  tone = "success",
  title,
  description,
  inviteUrl,
  deliveryWarning,
  onClose,
}: StatusFeedbackModalProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-[420px]"
      ariaLabelledBy="customer-status-modal-title"
    >
      <div className="px-7 py-8 text-center">
        <div
          className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] ${
            tone === "success"
              ? "border-success text-success"
              : "border-danger text-danger"
          }`}
        >
          {tone === "success" ? (
            <Icon name="check" weight="bold" className="size-7" />
          ) : (
            <Icon name="alert" className="size-7" />
          )}
        </div>

        <h2
          id="customer-status-modal-title"
          className="text-xl font-semibold text-ink"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-subtle">
          {description}
        </p>

        {inviteUrl && (
          <div className="mt-4 rounded-xl border border-hairline bg-mist p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Account Setup Link
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-semibold text-burnt hover:text-burnt-dark"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-body">
              {inviteUrl}
            </p>
            {deliveryWarning && (
              <p className="mt-2 text-xs leading-relaxed text-burnt-dark">
                {deliveryWarning}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[140px] rounded-lg bg-burnt px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-burnt-dark"
          >
            Done
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------- Confirm Modal */

interface ConfirmActionModalProps {
  isOpen: boolean;
  tone: "warning" | "danger";
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmTone?: "brand" | "danger" | "outline";
  cancelTone?: "outline" | "brand";
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionModal({
  isOpen,
  tone,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmTone = "brand",
  cancelTone = "outline",
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  const iconColor =
    tone === "danger"
      ? "border-danger text-danger"
      : "border-warn-fg text-warn-fg";

  const confirmButtonClass =
    confirmTone === "danger"
      ? "bg-danger text-white hover:bg-danger-dark"
      : confirmTone === "outline"
        ? "border border-line bg-white text-body hover:bg-mist"
        : "bg-burnt text-white hover:bg-burnt-dark";

  const cancelButtonClass =
    cancelTone === "brand"
      ? "bg-burnt text-white hover:bg-burnt-dark"
      : "border border-line bg-white text-body hover:bg-mist";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onCancel}
      maxWidthClass="max-w-[420px]"
      ariaLabelledBy="customer-confirm-modal-title"
    >
      <div className="px-7 py-8 text-center">
        <div
          className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] ${iconColor}`}
        >
          <Icon name="alert" className="size-7" />
        </div>

        <h2
          id="customer-confirm-modal-title"
          className="text-xl font-semibold text-ink"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-subtle">
          {description}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className={`min-w-[120px] rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${cancelButtonClass}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`min-w-[130px] rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------ Add Customer Modal */

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onSubmit,
}: AddCustomerModalProps) {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [birthday, setBirthday] = React.useState("");
  const [sendInvite, setSendInvite] = React.useState(false);
  const [marketingOptIn, setMarketingOptIn] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;
    setFullName("");
    setEmail("");
    setPhone("");
    setBirthday("");
    setSendInvite(false);
    setMarketingOptIn(false);
    setError(null);
    setFieldErrors({});
  }, [isOpen]);

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await onSubmit({
        fullName,
        email,
        phone,
        birthday,
        marketingOptIn,
        sendInvite: hasValidEmail ? sendInvite : false,
      });
      if (!res.ok) {
        setError(res.error ?? "Unable to add customer.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      maxWidthClass="max-w-[540px]"
      ariaLabelledBy="add-customer-modal-title"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-customer-modal-title"
              className="font-display text-2xl text-ink"
            >
              Add Customer
            </h2>
            <p className="mt-0.5 text-xs text-subtle">
              Create a walk-in record without requiring an account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-subtle hover:bg-mist hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-xs font-medium text-danger-dark">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="add-customer-name"
              className="block text-xs font-semibold text-ink"
            >
              Full Name<span className="text-danger">*</span>
            </label>
            <input
              id="add-customer-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ari Mendoza"
              className={cn(inputClasses(false, false), "mt-1.5")}
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-danger">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="add-customer-email"
              className="block text-xs font-semibold text-ink"
            >
              Email Address
            </label>
            <input
              id="add-customer-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (!e.target.value.trim()) setSendInvite(false);
              }}
              placeholder="ari.mendoza@gmail.com"
              className={cn(inputClasses(false, false), "mt-1.5")}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-danger">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="add-customer-phone"
              className="block text-xs font-semibold text-ink"
            >
              Phone Number<span className="text-danger">*</span>
            </label>
            <input
              id="add-customer-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 917 555 0142"
              className={cn(inputClasses(false, false), "mt-1.5")}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-danger">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="add-customer-birthday"
              className="block text-xs font-semibold text-ink"
            >
              Birthday
            </label>
            <input
              id="add-customer-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className={cn(inputClasses(false, false), "mt-1.5")}
            />
          </div>
        </div>

        <div className="mt-5 border-t border-hairline pt-4">
          <p className="text-xs font-semibold text-ink">Account</p>
          <p className="mt-1 text-xs font-medium text-body">
            Walk-in record
          </p>
          <p className="mt-0.5 text-xs text-glyph">
            Account status is based on registration and cannot be changed here.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label
                className={`flex items-center gap-2.5 text-xs font-medium ${
                  hasValidEmail
                    ? "cursor-pointer text-ink"
                    : "cursor-not-allowed text-glyph"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!hasValidEmail}
                  checked={hasValidEmail && sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="size-4 rounded border-line accent-burnt"
                />
                <span>Send account invite</span>
              </label>
              <p className="mt-1 pl-6 text-xs text-glyph">
                {hasValidEmail
                  ? "Sends a setup link so the customer can create a password later."
                  : "Add an email address to send an invite."}
              </p>
            </div>

            <div>
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="size-4 rounded border-line accent-burnt"
                />
                <span>Send occasional offers (marketing consent)</span>
              </label>
              <p className="mt-1 pl-6 text-xs text-glyph">
                Optional. Unchecked by default. Record the customer&apos;s
                permission before enabling.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-hairline pt-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="h-9 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-body hover:bg-mist"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-lg bg-burnt px-4 text-xs font-semibold text-white hover:bg-burnt-dark disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add customer"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ----------------------------------------------------- Edit Customer Modal */

interface EditCustomerModalProps {
  isOpen: boolean;
  initialValues: {
    fullName: string;
    email: string;
    phone: string;
    birthday: string;
    marketingOptIn: boolean;
    accountType: CustomerAccountType;
  };
  onClose: () => void;
  onSubmit: (input: UpdateCustomerInput) => Promise<{
    ok: boolean;
    error?: string;
    fieldErrors?: Record<string, string>;
  }>;
}

export function EditCustomerModal({
  isOpen,
  initialValues,
  onClose,
  onSubmit,
}: EditCustomerModalProps) {
  const [fullName, setFullName] = React.useState(initialValues.fullName);
  const [email, setEmail] = React.useState(initialValues.email);
  const [phone, setPhone] = React.useState(initialValues.phone);
  const [birthday, setBirthday] = React.useState(initialValues.birthday);
  const [marketingOptIn, setMarketingOptIn] = React.useState(
    initialValues.marketingOptIn,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);

  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!justOpened) return;
    setFullName(initialValues.fullName);
    setEmail(initialValues.email);
    setPhone(initialValues.phone);
    setBirthday(initialValues.birthday);
    setMarketingOptIn(initialValues.marketingOptIn);
    setError(null);
    setFieldErrors({});
    setShowDiscardConfirm(false);
  }, [isOpen, initialValues]);

  const isDirty =
    fullName !== initialValues.fullName ||
    email !== initialValues.email ||
    phone !== initialValues.phone ||
    birthday !== initialValues.birthday ||
    marketingOptIn !== initialValues.marketingOptIn;

  const requestClose = () => {
    if (submitting) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !isDirty) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await onSubmit({
        fullName,
        email,
        phone,
        birthday,
        marketingOptIn,
      });
      if (!res.ok) {
        setError(res.error ?? "Unable to save changes.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen && !showDiscardConfirm}
        onClose={requestClose}
        maxWidthClass="max-w-[540px]"
        ariaLabelledBy="edit-customer-modal-title"
      >
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="edit-customer-modal-title"
                className="font-display text-2xl text-ink"
              >
                Edit Customer
              </h2>
              <p className="mt-0.5 text-xs text-subtle">
                Update contact details and account preferences.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close modal"
              className="rounded-lg p-1 text-subtle hover:bg-mist hover:text-ink"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-xs font-medium text-danger-dark">
              {error}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-customer-name"
                className="block text-xs font-semibold text-ink"
              >
                Full Name<span className="text-danger">*</span>
              </label>
              <input
                id="edit-customer-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={cn(inputClasses(false, false), "mt-1.5")}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-danger">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-customer-email"
                className="block text-xs font-semibold text-ink"
              >
                Email Address
              </label>
              <input
                id="edit-customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(inputClasses(false, false), "mt-1.5")}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-danger">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-customer-phone"
                className="block text-xs font-semibold text-ink"
              >
                Phone Number<span className="text-danger">*</span>
              </label>
              <input
                id="edit-customer-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={cn(inputClasses(false, false), "mt-1.5")}
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-danger">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-customer-birthday"
                className="block text-xs font-semibold text-ink"
              >
                Birthday
              </label>
              <input
                id="edit-customer-birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={cn(inputClasses(false, false), "mt-1.5")}
              />
            </div>
          </div>

          <div className="mt-5 border-t border-hairline pt-4">
            <p className="text-xs font-semibold text-ink">Account</p>
            <p className="mt-1 text-xs font-medium text-body">
              {initialValues.accountType === "registered"
                ? "Registered account"
                : "Walk-in record"}
            </p>
            <p className="mt-0.5 text-xs text-glyph">
              Account status is based on registration and cannot be changed
              here.
            </p>

            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-ink">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="size-4 rounded border-line accent-burnt"
                />
                <span>Send occasional offers (marketing consent)</span>
              </label>
              <p className="mt-1 pl-6 text-xs text-glyph">
                Optional. Unchecked by default. Record the customer&apos;s
                permission before enabling.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-hairline pt-4">
            <span className="text-xs text-subtle">
              {isDirty ? "Unsaved changes" : "No unsaved changes"}
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={requestClose}
                className="h-9 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-body hover:bg-mist"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !isDirty}
                className="h-9 rounded-lg bg-burnt px-4 text-xs font-semibold text-white hover:bg-burnt-dark disabled:opacity-45"
              >
                {submitting ? "Saving..." : "Save customer"}
              </button>
            </div>
          </div>
        </form>
      </ModalShell>

      <ConfirmActionModal
        isOpen={showDiscardConfirm}
        tone="danger"
        title="Discard unsaved changes?"
        description="Your unsaved customer edits will be lost. This cannot be undone. The last saved details will remain in effect."
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        confirmTone="danger"
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
      />
    </>
  );
}
