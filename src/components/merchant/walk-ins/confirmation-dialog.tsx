"use client";

import * as React from "react";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  buttonText?: string;
  onDone: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  buttonText = "Done",
  onDone,
}: ConfirmationDialogProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onDone();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDone]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 backdrop-blur-xs sm:p-5"
      onClick={onDone}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        className="flex w-full max-w-[420px] flex-col items-center rounded-[12px] bg-white px-7 py-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex size-14 items-center justify-center rounded-full border-2 border-[#16A34A] text-[#16A34A]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h3
          id="confirmation-dialog-title"
          className="mt-4 font-display text-[22px] font-bold leading-7 text-ink"
        >
          {title}
        </h3>

        <p className="mt-1.5 max-w-[320px] text-xs leading-5 text-muted sm:text-sm">
          {description}
        </p>

        <button
          type="button"
          onClick={onDone}
          className="mt-6 flex h-10 w-full max-w-[140px] items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-white transition-colors hover:bg-burnt/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
