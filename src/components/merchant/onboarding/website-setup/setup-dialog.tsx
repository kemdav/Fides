"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function SetupDialog({ title, onClose, children, actions }: {
  title: string;
  onClose: () => void;
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
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-hairline bg-white p-5 text-ink shadow-2xl backdrop:bg-black/40 sm:p-6"
    >
      <h2 id={titleId} className="mb-3 font-display text-2xl">{title}</h2>
      <div className="space-y-3 text-sm text-body">{children}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {actions ?? <Button variant="brand" size="xs" onClick={onClose}>Close</Button>}
      </div>
    </dialog>
  );
}
