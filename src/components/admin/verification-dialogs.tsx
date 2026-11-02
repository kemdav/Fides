"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  changeRequirements,
  formatSubmittedOn,
  REASON_MAX,
  REASON_MIN,
  type Submission,
  type SubmissionDocument,
} from "@/lib/admin/verification";
import { cn } from "@/lib/utils";
import { AdminButton } from "./admin-button";
import { AssetIcon, AssetImage } from "./asset-icon";
import { Checkbox } from "./primitives";

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
    <div className={cn(dialogSurface, "flex flex-col items-center gap-4 px-6 py-8")}>
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
    <div className={cn(dialogSurface, "flex flex-col gap-4 p-6")}>
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
          <AssetIcon name="icon-close" className="size-5" />
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
}: {
  business: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationCard icon="status-info" title="Approve merchant?">
      <p className="text-center text-sm leading-[21px] text-muted">
        Approving {business} activates their Business account. This decision will be recorded.
      </p>
      <div className="flex items-center justify-center gap-3">
        <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
          Cancel
        </AdminButton>
        <AdminButton onClick={onConfirm} className="min-w-[147px]" autoFocus>
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
}: {
  business: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
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
        <div className="flex items-center justify-center gap-3">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" type="submit" className="min-w-[147px]">
            Confirm Rejection
          </AdminButton>
        </div>
      </ConfirmationCard>
    </form>
  );
}

export function RequestChangesDialog({
  submission,
  onClose,
  onSend,
}: {
  submission: Submission;
  onClose: () => void;
  onSend: (requirementIds: string[]) => void;
}) {
  const errorId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);

  const chosen = changeRequirements.filter((item) => selected.includes(item.id));
  const message = chosen.length
    ? [
        `Hello ${submission.owner},`,
        `We reviewed the verification submission for ${submission.business} and need the following updates:`,
        chosen.map((item) => `• ${item.message}`).join("\n"),
        "Your account remains pending until the updated documents are received.",
      ].join("\n\n")
    : "Select the requirements that need updating.";

  function toggle(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
    setShowError(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected.length) {
      setShowError(true);
      return;
    }
    onSend(selected);
  }

  return (
    <form onSubmit={submit} noValidate>
      <FormCard title="Request updated documents" onClose={onClose}>
        <p className="text-sm leading-[21px] text-muted">
          Tell {submission.business} exactly what they need to update. Their account remains pending.
        </p>
        <fieldset aria-describedby={showError ? errorId : undefined} className="flex flex-col gap-3">
          <legend className="mb-3 text-sm leading-[1.5] text-muted">
            Missing or incomplete requirements · Select all that apply
          </legend>
          {changeRequirements.map((item) => (
            <Checkbox
              key={item.id}
              tone="brand"
              checked={selected.includes(item.id)}
              onChange={(checked) => toggle(item.id, checked)}
              label={<span className="text-muted">{item.label}</span>}
              className="w-full py-1 gap-3"
            />
          ))}
          {showError ? (
            <p id={errorId} role="alert" className="text-xs leading-[18px] text-danger">
              Select at least one requirement before sending the request.
            </p>
          ) : null}
        </fieldset>
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-[1.5] text-muted">Message to tenant</p>
          <div
            aria-live="polite"
            className="max-h-[220px] overflow-y-auto whitespace-pre-line rounded-[10px] border border-hairline bg-mist/50 p-4 text-sm leading-[22px] text-muted [scrollbar-width:thin]"
          >
            {message}
          </div>
        </div>
        <div className="flex items-center justify-end gap-[10px]">
          <AdminButton variant="outline" className="min-w-[100px]" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" className="min-w-[119px]">
            Send request
          </AdminButton>
        </div>
      </FormCard>
    </form>
  );
}

export function DocumentDialog({
  submission,
  document,
  onClose,
}: {
  submission: Submission;
  document: SubmissionDocument;
  onClose: () => void;
}) {
  return (
    <FormCard title={document.label} onClose={onClose}>
      <p className="text-sm leading-[21px] text-muted">
        {submission.business} · {submission.reference} · Submitted {formatSubmittedOn(submission)}
      </p>
      <div className="flex h-[180px] items-center justify-center rounded-[10px] border border-dashed border-line bg-[#fafafa] p-5 text-sm">
        Sample {document.label}
      </div>
      <div className="flex items-center justify-end gap-[10px]">
        <AdminButton variant="outline" className="min-w-[100px]" onClick={onClose}>
          Cancel
        </AdminButton>
        <AdminButton className="min-w-[135px]" onClick={onClose} autoFocus>
          Done Reviewing
        </AdminButton>
      </div>
    </FormCard>
  );
}

export function ResultDialog({
  title,
  message,
  onDone,
}: {
  title: string;
  message: string;
  onDone: () => void;
}) {
  return (
    <ConfirmationCard icon="status-success" title={title}>
      <p className="text-center text-sm leading-[21px]">{message}</p>
      <div className="flex justify-center">
        <AdminButton size="md" className="min-w-[147px]" onClick={onDone} autoFocus>
          Done
        </AdminButton>
      </div>
    </ConfirmationCard>
  );
}
