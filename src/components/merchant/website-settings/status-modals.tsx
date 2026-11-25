"use client";

import * as React from "react";
import { CheckIcon, AlertCircleIcon } from "./icons";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-website-title"
      >
        <div className="mb-4">
          <h3
            id="share-website-title"
            className="text-lg font-semibold text-neutral-900"
          >
            Share your website
          </h3>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            Use this website address in your social media bio, messages, and
            promotional materials.
          </p>
        </div>

        <div className="mt-4 rounded-lg bg-neutral-50/80 border border-neutral-200 p-3.5 space-y-1.5">
          <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
            Website link
          </span>
          <div className="font-mono text-xs font-semibold text-neutral-900">
            {displayUrl}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-neutral-800 bg-white border border-neutral-400/80 hover:bg-neutral-50 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-review-title"
      >
        {/* Centered Blue Icon */}
        <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3.5">
          <AlertCircleIcon className="w-6 h-6" />
        </div>

        <div className="text-center mb-4">
          <h3
            id="publish-review-title"
            className="text-lg font-semibold text-neutral-900"
          >
            Ready to go live?
          </h3>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            Publish your saved website settings to{" "}
            <span className="font-medium text-neutral-800">{cleanAddress}</span>
            . Review your details before making them visible to customers.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-2.5">
          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            YOUR WEBSITE UPDATES
          </h4>
          <ul className="space-y-1.5 text-xs text-neutral-800 font-medium">
            <li className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-3" />
              <span>Branding and homepage content</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-3" />
              <span>Public business and contact information</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-3" />
              <span>Search listing and social sharing previews</span>
            </li>
          </ul>
        </div>

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        <p className="mt-3 text-[11px] text-neutral-400 text-center">
          Appointments, services, and customer accounts are unaffected.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-neutral-800 bg-white border border-neutral-400/80 hover:bg-neutral-50 rounded-lg transition cursor-pointer"
          >
            Keep editing
          </button>
          <button
            type="button"
            disabled={isPublishing}
            onClick={() => onPublish()}
            className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-burnt hover:opacity-90 disabled:opacity-60 rounded-lg transition cursor-pointer"
          >
            {isPublishing ? "Publishing..." : "Publish website"}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="published-modal-title"
      >
        {/* Centered Green Checkmark Ring */}
        <div className="w-12 h-12 rounded-full border-2 border-emerald-600 text-emerald-600 flex items-center justify-center mx-auto mb-3.5">
          <CheckIcon className="w-6 h-6 stroke-3" />
        </div>

        <h3
          id="published-modal-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Your website is up to date
        </h3>
        <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
          Your latest website settings have been published. Customers can now
          see your updates.
        </p>

        <div className="mt-4 rounded-lg bg-neutral-50/80 border border-neutral-200 p-3.5 space-y-1.5">
          <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
            Website published
          </span>
          <div className="font-mono text-xs font-semibold text-neutral-900">
            {cleanAddress}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 min-w-[132px] px-6 text-sm font-semibold text-white bg-burnt hover:opacity-90 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface DraftSavedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DraftSavedModal({ isOpen, onClose }: DraftSavedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-saved-title"
      >
        {/* Centered Green Checkmark Ring */}
        <div className="w-12 h-12 rounded-full border-2 border-emerald-600 text-emerald-600 flex items-center justify-center mx-auto mb-3.5">
          <CheckIcon className="w-6 h-6 stroke-3" />
        </div>

        <h3
          id="draft-saved-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Draft saved
        </h3>
        <p className="mt-1 text-sm text-neutral-500 leading-relaxed">
          Your settings have been saved as a draft. Your published website
          remains unchanged.
        </p>

        <div className="mt-4 rounded-lg bg-neutral-50/80 border border-neutral-200 p-3.5 space-y-1 text-left">
          <span className="block text-xs font-semibold text-neutral-900">
            Ready when you are
          </span>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Return to any settings tab to review your updates before publishing.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 min-w-[132px] px-6 text-sm font-semibold text-white bg-burnt hover:opacity-90 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 text-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discard-modal-title"
      >
        {/* Centered Red Icon */}
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5">
          <AlertCircleIcon className="w-6 h-6" />
        </div>

        <h3
          id="discard-modal-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Discard unpublished changes?
        </h3>
        <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
          This returns you to the saved settings. Your currently published
          website is unaffected.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-neutral-800 bg-white border border-neutral-400/80 hover:bg-neutral-50 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onDiscard();
              onClose();
            }}
            className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition cursor-pointer"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
