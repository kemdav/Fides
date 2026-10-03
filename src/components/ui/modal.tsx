"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ModalProps = {
  /** Controls visibility. The parent owns this state. */
  open: boolean;
  /** Called when the dialog requests to close (Esc key, backdrop, close button). */
  onClose: () => void;
  /** Optional heading rendered at the top of the dialog. */
  title?: React.ReactNode;
  /** Optional supporting text rendered below the title. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Headless modal built on the native `<dialog>` element, which provides focus
 * trapping, backdrop rendering, and Esc handling for free.
 *
 * This is a structural shell only; the Figma design system supplies the final
 * overlay, surface, and motion treatments.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={cn(
        "w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-neutral-200 bg-white p-6 text-neutral-900 shadow-lg",
        "backdrop:bg-black/40",
        className
      )}
    >
      {(title || description) && (
        <header className="mb-4 flex flex-col gap-1.5">
          {title ? (
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          ) : null}
          {description ? (
            <p className="text-sm text-neutral-500">{description}</p>
          ) : null}
        </header>
      )}

      {children}
    </dialog>
  );
}
