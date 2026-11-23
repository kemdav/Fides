"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/admin/icon";

interface ShareWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export function ShareWebsiteModal({
  isOpen,
  onClose,
  url,
}: ShareWebsiteModalProps) {
  if (!isOpen) return null;

  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <Modal open onClose={onClose} labelledBy="share-website-title" unstyled className="w-[calc(100%-1rem)] max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-hairline overflow-visible text-ink">
        <div className="mb-4">
          <h3
            id="share-website-title"
            className="text-base font-semibold text-ink"
          >
            Share your website
          </h3>
          <p className="mt-1 text-xs text-subtle leading-relaxed">
            Use this website address in your social media bio, messages, and promotional materials.
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-mist/80 border border-hairline p-3.5 space-y-1.5">
          <span className="inline-block text-xs font-semibold text-success-deep bg-success/80 px-2 py-0.5 rounded-full">
            Website link
          </span>
          <div className="font-mono text-xs font-semibold text-ink">
            {displayUrl}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-body bg-white border border-line hover:bg-mist rounded-xl shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </Modal>
  );
}

interface PublishReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: () => void | Promise<void>;
  siteAddress: string;
  isPublishing?: boolean;
  errorMessage?: string | null;
}

export function PublishReviewModal({
  isOpen,
  onClose,
  onPublish,
  siteAddress,
  isPublishing,
  errorMessage,
}: PublishReviewModalProps) {
  if (!isOpen) return null;

  const cleanAddress = siteAddress.replace(/^https?:\/\//, "");

  return (
    <Modal open onClose={onClose} labelledBy="publish-review-title" unstyled className="w-[calc(100%-1rem)] max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-hairline overflow-visible text-ink">
        {/* Centered Blue Icon */}
        <div className="w-10 h-10 rounded-full bg-info-bg text-info flex items-center justify-center mx-auto mb-3">
          <Icon name="alert" className="w-6 h-6" />
        </div>

        <div className="text-center mb-4">
          <h3
            id="publish-review-title"
            className="text-base font-semibold text-ink"
          >
            Ready to go live?
          </h3>
          <p className="mt-1 text-xs text-subtle leading-relaxed">
            Publish your saved website settings to{" "}
            <span className="font-medium text-ink">{cleanAddress}</span>.
            Review your details before making them visible to customers.
          </p>
        </div>

        <div className="rounded-xl border border-hairline bg-mist/70 p-3.5 space-y-2.5">
          <h4 className="text-xs font-bold text-glyph uppercase tracking-wider">
            YOUR WEBSITE UPDATES
          </h4>
          <ul className="space-y-1.5 text-xs text-ink font-medium">
            <li className="flex items-center gap-2">
              <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success shrink-0 stroke-3" />
              <span>Branding and homepage content</span>
            </li>
            <li className="flex items-center gap-2">
              <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success shrink-0 stroke-3" />
              <span>Public business and contact information</span>
            </li>
            <li className="flex items-center gap-2">
              <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success shrink-0 stroke-3" />
              <span>Search listing and social sharing previews</span>
            </li>
          </ul>
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-danger-bg border border-danger/30 text-danger-dark text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <p className="mt-3 text-xs text-glyph text-center">
          Appointments, services, and customer accounts are unaffected.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-body bg-white border border-line hover:bg-mist rounded-xl transition shadow-2xs"
          >
            Keep editing
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={() => onPublish()}
            className="px-4 py-2 text-xs font-semibold text-white bg-burnt hover:bg-burnt-dark disabled:opacity-60 rounded-xl shadow-xs transition"
          >
            {isPublishing ? "Publishing..." : "Publish website"}
          </button>
        </div>
      </Modal>
  );
}

interface PublishedModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteAddress: string;
}

export function PublishedModal({
  isOpen,
  onClose,
  siteAddress,
}: PublishedModalProps) {
  if (!isOpen) return null;

  const cleanAddress = siteAddress.replace(/^https?:\/\//, "");

  return (
    <Modal open onClose={onClose} labelledBy="published-modal-title" unstyled className="w-[calc(100%-1rem)] max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-hairline text-center overflow-visible text-ink">
        {/* Centered Green Checkmark Icon */}
        <div className="w-10 h-10 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-3">
          <Icon name="check" weight="bold" className="w-6 h-6 stroke-3" />
        </div>

        <h3
          id="published-modal-title"
          className="text-base font-semibold text-ink"
        >
          Your website is up to date
        </h3>
        <p className="mt-1 text-xs text-subtle leading-relaxed">
          Your latest website settings have been published. Customers can now see your updates.
        </p>

        <div className="mt-4 rounded-xl bg-mist/80 border border-hairline p-3.5 space-y-1.5">
          <span className="inline-block text-xs font-semibold text-success-deep bg-success/80 px-2 py-0.5 rounded-full">
            Website published
          </span>
          <div className="font-mono text-xs font-semibold text-ink">
            {cleanAddress}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-semibold text-white bg-burnt hover:bg-burnt-dark rounded-xl shadow-xs transition"
          >
            Close
          </button>
        </div>
      </Modal>
  );
}

interface DraftSavedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DraftSavedModal({ isOpen, onClose }: DraftSavedModalProps) {
  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} labelledBy="draft-saved-title" unstyled className="w-[calc(100%-1rem)] max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-hairline text-center overflow-visible text-ink">
        {/* Centered Green Checkmark Icon */}
        <div className="w-10 h-10 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-3">
          <Icon name="check" weight="bold" className="w-6 h-6 stroke-3" />
        </div>

        <h3
          id="draft-saved-title"
          className="text-base font-semibold text-ink"
        >
          Draft saved
        </h3>
        <p className="mt-1 text-xs text-subtle leading-relaxed">
          Your settings have been saved as a draft. Your published website remains unchanged.
        </p>

        <div className="mt-4 rounded-xl bg-mist/80 border border-hairline p-3.5 space-y-1 text-left">
          <span className="block text-xs font-semibold text-ink">
            Ready when you are
          </span>
          <p className="text-xs text-subtle leading-relaxed">
            Return to any settings tab to review your updates before publishing.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-xs font-semibold text-white bg-burnt hover:bg-burnt-dark rounded-xl shadow-xs transition"
          >
            Close
          </button>
        </div>
      </Modal>
  );
}

interface DiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
}

export function DiscardModal({
  isOpen,
  onClose,
  onDiscard,
}: DiscardModalProps) {
  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} labelledBy="discard-modal-title" unstyled className="w-[calc(100%-1rem)] max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-hairline text-center overflow-visible text-ink">
        {/* Centered Red Icon */}
        <div className="w-10 h-10 rounded-full bg-danger-bg text-danger flex items-center justify-center mx-auto mb-3">
          <Icon name="alert" className="w-6 h-6" />
        </div>

        <h3
          id="discard-modal-title"
          className="text-base font-semibold text-ink"
        >
          Discard unpublished changes?
        </h3>
        <p className="mt-1 text-xs text-subtle leading-relaxed">
          This returns you to the saved settings. Your currently published website is unaffected.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-body bg-white border border-line hover:bg-mist rounded-xl transition shadow-2xs"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onDiscard();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-danger hover:bg-danger-dark rounded-xl shadow-xs transition"
          >
            Discard changes
          </button>
        </div>
      </Modal>
  );
}
