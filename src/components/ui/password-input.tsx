"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id: string;
  /** Tailwind classes for the <input> itself (border, height, colours). */
  inputClassName: string;
  /** Visible name of the field, used for the accessible toggle label, e.g. "password". */
  fieldLabel?: string;
};

/**
 * Password field with the approved eye / eye-off visibility toggle.
 * The toggle is a real <button> with an accessible name and aria-pressed state.
 */
export function PasswordInput({ id, inputClassName, fieldLabel = "password", className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <input id={id} type={visible ? "text" : "password"} className={cn(inputClassName, "pr-12")} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-controls={id}
        aria-label={visible ? `Hide ${fieldLabel}` : `Show ${fieldLabel}`}
        title={visible ? `Hide ${fieldLabel}` : `Show ${fieldLabel}`}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-glyph transition-colors hover:bg-burnt/10 hover:text-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  );
}
