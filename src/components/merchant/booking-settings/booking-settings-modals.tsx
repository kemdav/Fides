"use client";

import * as React from "react";

interface BookingSettingsSavedModalProps {
  isOpen: boolean;
  timeZone: string;
  onClose: () => void;
}

export function BookingSettingsSavedModal({
  isOpen,
  timeZone,
  onClose,
}: BookingSettingsSavedModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        aria-labelledby="booking-saved-title"
        className="w-full max-w-[400px] rounded-2xl bg-white px-7 py-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] border-[#15803D] text-[#15803D]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2
          id="booking-saved-title"
          className="text-xl font-semibold text-[#1E293B]"
        >
          Booking settings saved
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[#64748B]">
          Your booking rules are saved. Time-based rules use {timeZone}.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[140px] rounded-lg bg-burnt px-6 py-2.5 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmDiscardModalProps {
  isOpen: boolean;
  variant: "discard" | "leave";
  onKeepEditing: () => void;
  onConfirmDiscard: () => void;
}

export function ConfirmDiscardModal({
  isOpen,
  variant,
  onKeepEditing,
  onConfirmDiscard,
}: ConfirmDiscardModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onKeepEditing();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onKeepEditing]);

  if (!isOpen) return null;

  const isLeave = variant === "leave";
  const title = isLeave ? "Leave without saving?" : "Discard unsaved changes?";
  const description = isLeave
    ? "You have unsaved booking settings. Leave this page and discard them, or stay to keep editing."
    : "Your unsaved booking settings will be lost. This cannot be undone. Your last saved settings will remain in effect.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onKeepEditing}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-discard-title"
        className="w-full max-w-[420px] rounded-2xl bg-white px-7 py-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] border-[#DC2626] text-[#DC2626]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
            aria-hidden="true"
          >
            <line x1="12" y1="7" x2="12" y2="13" />
            <circle cx="12" cy="17" r="0.8" fill="currentColor" />
          </svg>
        </div>

        <h2
          id="booking-discard-title"
          className="text-xl font-semibold text-[#1E293B]"
        >
          {title}
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[#64748B]">
          {description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onKeepEditing}
            className="rounded-lg border border-[#D9DDE3] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirmDiscard}
            className="rounded-lg bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]/40"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
