"use client";

import * as React from "react";
import { Icon } from "@/components/admin/icon";

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemType?: "service" | "package" | "add-on";
  isLoading?: boolean;
}

export function ArchiveModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType = "service",
  isLoading = false,
}: ArchiveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-dialog-title"
      >
        {/* Amber / Yellow Warning Circle Icon */}
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
          <Icon name="alert" weight="fill" className="size-6 text-amber-500" />
        </div>

        <h3 id="archive-dialog-title" className="text-base font-semibold text-neutral-900">
          Archive {itemType}?
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
          <span className="font-medium text-neutral-800">“{title}”</span> will be hidden from your public booking menu. Existing appointments will remain untouched. You can restore it anytime from the Archived tab.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 shadow-2xs transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className="rounded-xl bg-[#C35000] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#A94400] disabled:opacity-50"
          >
            {isLoading ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Red Alert Circle Icon */}
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50">
          <Icon name="trash" className="size-6 text-red-600" />
        </div>

        <h3 id="delete-dialog-title" className="text-base font-semibold text-neutral-900">
          Delete {itemType}?
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
          Are you sure you want to permanently delete{" "}
          <span className="font-medium text-neutral-800">“{title}”</span>? This action is permanent and cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 shadow-2xs transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blocked-delete-title"
      >
        {/* Red / Alert Circle Icon */}
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50">
          <Icon name="alert" weight="fill" className="size-6 text-red-600" />
        </div>

        <h3 id="blocked-delete-title" className="text-base font-semibold text-neutral-900">
          Cannot delete service
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
          {errorMessage ||
            `“${title}” is linked to existing customer appointments. To protect your appointment records, booked services cannot be hard-deleted. You can archive it instead to hide it from your public booking menu.`}
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 shadow-2xs transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onArchiveInstead()}
            className="rounded-xl bg-[#C35000] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#A94400] disabled:opacity-50"
          >
            {isLoading ? "Archiving..." : "Archive instead"}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-feedback-title"
      >
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <Icon name="check" weight="fill" className="size-6 text-emerald-600" />
        </div>

        <h3 id="success-feedback-title" className="text-base font-semibold text-neutral-900">
          {title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{description}</p>

        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#C35000] px-6 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#A94400]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
