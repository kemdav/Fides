"use client";

import * as React from "react";
import { Icon } from "@/components/admin/icon";
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
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Subscription dialog"}
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-2xl",
          maxWidthClass,
        )}
      >
        {!hideHeader && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
            <div className="min-w-0">
              {title && (
                <h2 className="font-display text-[26px] leading-[32px] tracking-tight text-[#243242] sm:text-[30px] sm:leading-[36px]">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm leading-[20px] text-[#6B7280]">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#243242]"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto px-6 py-5 sm:px-7">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#F1F3F5] bg-white px-6 py-4 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>
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
        <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-[#15803D] text-[#15803D]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-[22px] font-semibold leading-[28px] text-[#243242]">
          {title}
        </h3>
        <p className="mt-2 max-w-[360px] text-sm leading-[21px] text-[#4B5563]">
          {description}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-11 min-w-[132px] items-center justify-center rounded-lg bg-[#C35000] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#A64400]"
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
        <div className="flex size-12 items-center justify-center rounded-full border-[3px] border-[#DC2626] text-[#DC2626]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
          >
            <path d="M12 8v5" />
            <circle cx="12" cy="16.5" r="0.8" fill="currentColor" />
          </svg>
        </div>
        <h3 className="mt-4 text-[22px] font-semibold leading-[28px] text-[#243242]">
          Cancel subscription?
        </h3>
        <p className="mt-2 max-w-[380px] text-sm leading-[21px] text-[#4B5563]">
          Your {planName} plan remains available until {periodEndLabel}. After
          that, the workspace becomes read-only. Records and invoices are
          preserved.
        </p>

        <div className="mt-5 w-full rounded-[10px] bg-[#F3F4F6] px-4 py-3.5 text-left">
          <p className="text-sm font-semibold text-[#243242]">
            No automatic reactivation
          </p>
          <p className="mt-1 text-xs leading-[18px] text-[#6B7280]">
            You can reactivate a plan from Subscription Settings. No further
            renewal invoices will be generated after cancellation.
          </p>
        </div>

        <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 min-w-[156px] items-center justify-center rounded-lg border border-[#9CA3AF] bg-white px-5 text-sm font-semibold text-[#1F2937] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            Keep subscription
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex h-11 min-w-[172px] items-center justify-center rounded-lg bg-[#DC2626] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
          >
            {submitting ? "Cancelling..." : "Confirm cancellation"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
