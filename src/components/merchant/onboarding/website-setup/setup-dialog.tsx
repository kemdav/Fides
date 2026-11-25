"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";

export function SetupDialog({ title, onClose, wide = false, children, actions }: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-hairline bg-white p-5 text-ink shadow-2xl backdrop:bg-black/40 sm:p-6 ${wide ? "max-w-4xl" : "max-w-md"}`}
    >
      <h2 id={titleId} className="mb-3 font-display text-2xl">{title}</h2>
      <div className="space-y-3 text-sm text-body">{children}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {actions ?? <AdminButton size="xs" onClick={onClose}>Close</AdminButton>}
      </div>
    </dialog>
  );
}
