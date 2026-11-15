"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui";
import { DIALOG_TITLE_ID } from "./verification-dialogs";

export function AdminModal({
  open,
  onClose,
  wide,
  xwide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  /** Large viewer-size dialog, used for document previews. */
  xwide?: boolean;
  children: ReactNode;
}) {
  return (
    <Modal
      unstyled
      open={open}
      onClose={onClose}
      labelledBy={DIALOG_TITLE_ID}
      className={`m-auto max-h-[calc(100dvh-2rem)] overflow-visible bg-transparent p-0 text-ink ${
        xwide ? "w-[min(960px,calc(100vw-2rem))]" : wide ? "w-[min(600px,calc(100vw-2rem))]" : "w-[min(540px,calc(100vw-2rem))]"
      }`}
    >
      {children}
    </Modal>
  );
}
