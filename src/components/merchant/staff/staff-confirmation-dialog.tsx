"use client";

import { useId, type ReactNode } from "react";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";

export function StaffConfirmationDialog({
  title, description, warning = false, busy = false, error, onClose, children,
}: {
  title: string;
  description: ReactNode;
  warning?: boolean;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <Modal open unstyled onClose={() => { if (!busy) onClose(); }} labelledBy={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[14px] border border-line bg-white px-5 py-6 text-center text-ink shadow-2xl sm:p-7">
      {warning && (
        <span className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-danger-bg text-danger">
          <Icon name="alert" weight="bold" className="size-9" />
        </span>
      )}
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-body">{description}</p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
    </Modal>
  );
}
