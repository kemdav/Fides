"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon, type IconName } from "@/components/admin/icon";

const itemTitles = { service: "Service", package: "Package", "add-on": "Add-on" };
const iconColors = {
  success: "text-success",
  warning: "text-burnt",
  danger: "text-danger",
};
const dialogButtonClass = "h-10! py-0!";

function CatalogFeedbackDialog({ title, description, icon, tone, children }: {
  title: string;
  description: React.ReactNode;
  icon: IconName;
  tone: keyof typeof iconColors;
  children: React.ReactNode;
}) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[400px] overflow-y-auto rounded-2xl bg-white px-7 py-8 text-center shadow-2xl"
      >
        <div className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-[3px] border-current ${iconColors[tone]}`}>
          <Icon name={icon} weight="bold" className="size-7" />
        </div>
        <h3 id={titleId} className="text-xl font-semibold text-slate-800">{title}</h3>
        <p id={descriptionId} className="mt-2.5 break-words text-sm leading-relaxed text-slate-500">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
      </div>
    </div>
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
    <CatalogFeedbackDialog
      title={`${isHide ? "Hide" : "Archive"} ${itemTitles[itemType]}?`}
      icon="layers"
      tone="warning"
      description={<><strong className="font-semibold text-ink">“{title}”</strong> will be hidden from your public booking menu. Existing appointments will remain untouched. You can restore it anytime from the Hidden Services tab.</>}
    >
      <AdminButton variant="outline" size="sm" className={dialogButtonClass} disabled={isLoading} onClick={onClose}>Cancel</AdminButton>
      <AdminButton variant="primary" size="sm" className={dialogButtonClass} disabled={isLoading} onClick={() => void onConfirm()}>
        {isLoading
          ? isHide
            ? "Hiding..."
            : "Archiving..."
          : isHide
          ? `Hide ${itemType}`
          : "Archive"}
      </AdminButton>
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
    <CatalogFeedbackDialog
      title={`Delete ${itemTitles[itemType]}?`}
      icon="trash"
      tone="danger"
      description={<>Are you sure you want to permanently delete <strong className="font-semibold text-ink">“{title}”</strong>? This action is permanent and cannot be undone.</>}
    >
      <AdminButton variant="outline" size="sm" className={dialogButtonClass} disabled={isLoading} onClick={onClose}>Cancel</AdminButton>
      <AdminButton variant="danger" size="sm" className={dialogButtonClass} disabled={isLoading} onClick={() => void onConfirm()}>
        {isLoading ? "Deleting..." : "Delete permanently"}
      </AdminButton>
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
    <CatalogFeedbackDialog
      title="Cannot Delete Service"
      icon="lock"
      tone="danger"
      description={errorMessage || `“${title}” is linked to existing customer appointments. To protect your appointment records, booked services cannot be hard-deleted. You can archive it instead to hide it from your public booking menu.`}
    >
      <AdminButton variant="outline" size="sm" className={dialogButtonClass} disabled={isLoading} onClick={onClose}>Cancel</AdminButton>
      <AdminButton variant="primary" size="sm" className={dialogButtonClass} disabled={isLoading} onClick={() => void onArchiveInstead()}>
        {isLoading ? "Archiving..." : "Archive instead"}
      </AdminButton>
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
    <CatalogFeedbackDialog title={title} description={description} icon="check" tone="success">
      <AdminButton variant="primary" size="sm" className={`${dialogButtonClass} min-w-[140px]`} onClick={onClose}>
        Done
      </AdminButton>
    </CatalogFeedbackDialog>
  );
}
