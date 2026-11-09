"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { REASON_MAX, REASON_MIN } from "@/lib/admin/verification";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { Icon } from "./icon";
import { AssetImage } from "./asset-icon";

export const DIALOG_TITLE_ID = "admin-dialog-title";

export const dialogSurface =
  "max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[10px] bg-white shadow-[0_3px_14px_rgb(44_58_75/0.04)] [scrollbar-width:thin]";

export function ConfirmationCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(dialogSurface, "flex flex-col items-center gap-4 px-4 py-6 sm:px-6 sm:py-8")}>
      <AssetImage name={icon} width={56} height={56} />
      <div className="flex w-full flex-col gap-4">
        <h2 id={DIALOG_TITLE_ID} className="text-center text-xl font-semibold leading-6">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function FormCard({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn(dialogSurface, "flex flex-col gap-4 p-4 sm:p-6")}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={DIALOG_TITLE_ID} className="text-lg font-semibold leading-[27px]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-5 items-center justify-center rounded text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          <Icon name="close" className="size-5" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ApproveDialog({
  business,
  onCancel,
  onConfirm,
  busy = false,
}: {
  business: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <ConfirmationCard icon="status-info" title="Approve merchant?">
      <p className="text-center text-sm leading-[21px] text-muted">
        Approving {business} activates their Business account and sends an approval email with a login link. This decision will be recorded.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton onClick={onConfirm} disabled={busy} className="min-w-[147px]" autoFocus>
          Confirm approval
        </AdminButton>
      </div>
    </ConfirmationCard>
  );
}

export function RejectDialog({
  business,
  onCancel,
  onConfirm,
  busy = false,
}: {
  business: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  const fieldId = useId();
  const errorId = useId();
  const [reason, setReason] = useState("");
  const [showError, setShowError] = useState(false);
  const trimmed = reason.trim();
  const valid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) {
      setShowError(true);
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConfirmationCard icon="status-danger" title="Reject submission">
        <p className="text-center text-sm leading-[21px] text-muted">
          Record why {business} cannot be approved. This closes the current submission.
        </p>
        <label htmlFor={fieldId} className="text-sm leading-5">
          Rejection Reason<span className="text-danger">*</span>
        </label>
        <textarea
          id={fieldId}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={REASON_MAX}
          rows={3}
          autoFocus
          aria-invalid={showError && !valid}
          aria-describedby={errorId}
          placeholder="Explain why this submission is rejected"
          className={cn(
            "w-full resize-y rounded-lg border bg-white px-4 py-3 text-base font-semibold leading-6 placeholder:font-semibold placeholder:text-ink/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 focus-visible:border-burnt",
            showError && !valid ? "border-danger" : "border-glyph"
          )}
        />
        <p
          id={errorId}
          role={showError && !valid ? "alert" : undefined}
          className={cn("text-center text-xs leading-[18px]", showError && !valid ? "text-danger" : "text-muted")}
        >
          {showError && !valid
            ? `Enter a clear reason between ${REASON_MIN} and ${REASON_MAX} characters before recording the decision.`
            : "Reason required · Stored with the decision"}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" type="submit" disabled={busy} className="min-w-[147px]">
            Confirm Rejection
          </AdminButton>
        </div>
      </ConfirmationCard>
    </form>
  );
}

export function ResultDialog({
  title,
  message,
  onDone,
  failed = false,
}: {
  title: string;
  message: string;
  onDone: () => void;
  failed?: boolean;
}) {
  return (
    <ConfirmationCard icon={failed ? "status-error" : "status-success"} title={title}>
      <p className="text-center text-sm leading-[21px]">{message}</p>
      <div className="flex justify-center">
        <AdminButton size="md" className="min-w-[147px]" onClick={onDone} autoFocus>
          Done
        </AdminButton>
      </div>
    </ConfirmationCard>
  );
}

export function DeleteApplicationDialog({
  business,
  onCancel,
  onConfirm,
  busy = false,
}: {
  business: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <ConfirmationCard icon="status-danger" title="Delete this record?">
      <p className="text-center text-sm leading-[21px] text-muted">
        Permanently delete {business}, including the owner login and all registration records. This cannot be undone.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" className="min-w-[147px]" onClick={onConfirm} disabled={busy} autoFocus>
          Delete permanently
        </AdminButton>
      </div>
    </ConfirmationCard>
  );
}
