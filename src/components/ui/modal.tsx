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
  style?: React.CSSProperties;
  unstyled?: boolean;
  labelledBy?: string;
  /** Close when the dimmed backdrop is clicked. Leave off for dialogs that hold unsaved input. */
  closeOnBackdrop?: boolean;
};

/**
 * Modal built on the native `<dialog>` element, which provides focus trapping,
 * backdrop rendering and Esc handling. Use this for every dialog instead of
 * hand-rolling a fixed overlay. `unstyled` drops the default surface so the
 * caller can style the panel through `className` (it is centred automatically).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  style,
  unstyled = false,
  labelledBy,
  closeOnBackdrop = false,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const openRef = React.useRef(open);

  React.useEffect(() => {
    openRef.current = open;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      style={style}
      onClose={() => {
        // the dialog also fires "close" after we close it ourselves; only report real dismissals
        if (openRef.current) onClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto",
        !unstyled && "w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-hairline bg-white p-6 text-ink shadow-lg",
        "backdrop:bg-black/40 backdrop:backdrop-blur-xs",
        className
      )}
    >
      {(title || description) && (
        <header className="mb-4 flex flex-col gap-1.5">
          {title ? <h2 className="text-lg font-semibold tracking-tight">{title}</h2> : null}
          {description ? <p className="text-sm text-subtle">{description}</p> : null}
        </header>
      )}

      {children}
    </dialog>
  );
}
