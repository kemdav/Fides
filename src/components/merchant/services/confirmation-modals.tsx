"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import * as React from "react";
import { Icon, type IconName } from "@/components/admin/icon";

const itemTitles = { service: "Service", package: "Package", "add-on": "Add-on" };
const iconColors = {
  success: "text-success",
  warning: "text-burnt",
  danger: "text-danger",
};
const dialogButtonClass = "h-10! py-0!";

function CatalogFeedbackDialog({ title, description, icon, tone, onClose, children }: {
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  icon: IconName;
  tone: keyof typeof iconColors;
  children: React.ReactNode;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <Modal
      open
      onClose={onClose}
      unstyled
      labelledBy={titleId}
      className="max-h-[calc(100dvh-2rem)] w-full max-w-[400px] overflow-y-auto rounded-2xl bg-white px-7 py-8 text-center shadow-2xl"
    >
        <div className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] border-current ${iconColors[tone]}`}>
          <Icon name={icon} weight="bold" className="size-7" />
        </div>
        <h3 id={titleId} className="text-xl font-semibold text-ink">{title}</h3>
        <p id={descriptionId} className="mt-2.5 break-words text-sm leading-relaxed text-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
    </Modal>
  );
}

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemType?: "service" | "package" | "add-on";
  actionType?: "archive" | "hide";
  isLoading?: boolean;
}

export function ArchiveModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType = "service",
  actionType = "archive",
  isLoading = false,
}: ArchiveModalProps) {
  if (!isOpen) return null;

  const isHide = actionType === "hide";

  return (
    <CatalogFeedbackDialog onClose={onClose}
      title={`${isHide ? "Hide" : "Archive"} ${itemTitles[itemType]}?`}
      icon="layers"
      tone="warning"
      description={<><strong className="font-semibold text-ink">“{title}”</strong> will be hidden from your public booking menu. Existing appointments will remain untouched. You can restore it anytime from the Hidden Services tab.</>}
    >
      <Button variant="secondary" size="form" className={dialogButtonClass} disabled={isLoading} onClick={onClose}>Cancel</Button>
      <Button variant="brand" size="form" className={dialogButtonClass} disabled={isLoading} onClick={() => void onConfirm()}>
        {isLoading
          ? isHide
            ? "Hiding..."
            : "Archiving..."
          : isHide
          ? `Hide ${itemType}`
          : "Archive"}
      </Button>
    </CatalogFeedbackDialog>
  );
}

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemType?: "service" | "package" | "add-on";
  isLoading?: boolean;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType = "service",
  isLoading = false,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <CatalogFeedbackDialog onClose={onClose}
      title={`Delete ${itemTitles[itemType]}?`}
      icon="trash"
      tone="danger"
      description={<>Are you sure you want to permanently delete <strong className="font-semibold text-ink">“{title}”</strong>? This action is permanent and cannot be undone.</>}
    >
      <Button variant="secondary" size="form" className={dialogButtonClass} disabled={isLoading} onClick={onClose}>Cancel</Button>
      <Button variant="danger" size="form" className={dialogButtonClass} disabled={isLoading} onClick={() => void onConfirm()}>
        {isLoading ? "Deleting..." : "Delete permanently"}
      </Button>
    </CatalogFeedbackDialog>
  );
}

interface BlockedDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onArchiveInstead: () => Promise<void> | void;
  title: string;
  errorMessage?: string;
  isLoading?: boolean;
}

export function BlockedDeleteModal({
  isOpen,
  onClose,
  onArchiveInstead,
  title,
  errorMessage,
  isLoading = false,
}: BlockedDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <CatalogFeedbackDialog onClose={onClose}
      title="Cannot Delete Service"
      icon="lock"
      tone="danger"
      description={errorMessage || `“${title}” is linked to existing customer appointments. To protect your appointment records, booked services cannot be hard-deleted. You can archive it instead to hide it from your public booking menu.`}
    >
      <Button variant="secondary" size="form" className={dialogButtonClass} disabled={isLoading} onClick={onClose}>Cancel</Button>
      <Button variant="brand" size="form" className={dialogButtonClass} disabled={isLoading} onClick={() => void onArchiveInstead()}>
        {isLoading ? "Archiving..." : "Archive instead"}
      </Button>
    </CatalogFeedbackDialog>
  );
}

interface SuccessFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function SuccessFeedbackModal({
  isOpen,
  onClose,
  title,
  description,
}: SuccessFeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <CatalogFeedbackDialog onClose={onClose} title={title} description={description} icon="check" tone="success">
      <Button variant="brand" size="form" className={`${dialogButtonClass} min-w-[140px]`} onClick={onClose}>
        Done
      </Button>
    </CatalogFeedbackDialog>
  );
}
