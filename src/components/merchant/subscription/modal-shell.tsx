"use client";

import * as React from "react";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidthClass?: string;
  hideHeader?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-[560px]",
  hideHeader = false,
  children,
  footer,
}: ModalShellProps) {
  const titleId = React.useId();

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      unstyled
      closeOnBackdrop
      labelledBy={titleId}
      className={cn(
        "relative flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-2xl",
        maxWidthClass,
      )}
    >
      {hideHeader && <h2 id={titleId} className="sr-only">{title ?? "Subscription dialog"}</h2>}
        {!hideHeader && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="font-display text-[26px] leading-[32px] tracking-tight text-ink sm:text-[30px] sm:leading-[36px]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm leading-[20px] text-muted">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-mist hover:text-ink"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto px-6 py-5 sm:px-7">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-mist bg-white px-6 py-4 sm:px-7">
            {footer}
          </div>
        )}
    </Modal>
  );
}

interface OutcomeModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  buttonLabel?: string;
}

export function OutcomeModal({
  open,
  onClose,
  title,
  description,
  buttonLabel = "Done",
}: OutcomeModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      hideHeader
      maxWidthClass="max-w-[440px]"
    >
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-success text-success">
          <Icon name="check" weight="bold" className="size-6" />
        </div>
        <h3 className="mt-4 text-[22px] font-semibold leading-[28px] text-ink">
          {title}
        </h3>
        <p className="mt-2 max-w-[360px] text-sm leading-[21px] text-body">
          {description}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-11 min-w-[132px] items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark"
        >
          {buttonLabel}
        </button>
      </div>
    </ModalShell>
  );
}

interface CancelFinalConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  periodEndLabel: string;
  submitting: boolean;
}

export function CancelFinalConfirmModal({
  open,
  onClose,
  onConfirm,
  planName,
  periodEndLabel,
  submitting,
}: CancelFinalConfirmModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      hideHeader
      maxWidthClass="max-w-[460px]"
    >
      <div className="flex flex-col items-center py-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-danger text-danger">
          <Icon name="alert" weight="bold" className="size-6" />
        </div>
        <h3 className="mt-4 text-[22px] font-semibold leading-[28px] text-ink">
          Cancel subscription?
        </h3>
        <p className="mt-2 max-w-[380px] text-sm leading-[21px] text-body">
          Your {planName} plan remains available until {periodEndLabel}. After
          that, the workspace becomes read-only. Records and invoices are
          preserved.
        </p>

        <div className="mt-5 w-full rounded-[10px] bg-mist px-4 py-3.5 text-left">
          <p className="text-sm font-semibold text-ink">
            No automatic reactivation
          </p>
          <p className="mt-1 text-xs leading-[18px] text-muted">
            You can reactivate a plan from Subscription Settings. No further
            renewal invoices will be generated after cancellation.
          </p>
        </div>

        <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 min-w-[156px] items-center justify-center rounded-lg border border-glyph bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist disabled:opacity-50"
          >
            Keep subscription
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex h-11 min-w-[172px] items-center justify-center rounded-lg bg-danger px-5 text-sm font-semibold text-white transition-colors hover:bg-danger-dark disabled:opacity-50"
          >
            {submitting ? "Cancelling..." : "Confirm cancellation"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
