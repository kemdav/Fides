"use client";

import * as React from "react";
import { AlertCircleIcon } from "./icons";
import { subdomainSchema } from "@/lib/validations/website-settings";
import { updateTenantSubdomainAction } from "@/app/actions/website-settings";

interface ChangeAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubdomain: string;
  tenantId?: string;
  onConfirm: (newSubdomain: string) => void;
}

export function ChangeAddressModal({
  isOpen,
  onClose,
  currentSubdomain,
  tenantId,
  onConfirm,
}: ChangeAddressModalProps) {
  if (!isOpen) return null;

  return (
    <ChangeAddressDialogContent
      currentSubdomain={currentSubdomain}
      tenantId={tenantId}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function ChangeAddressDialogContent({
  currentSubdomain,
  tenantId,
  onClose,
  onConfirm,
}: Omit<ChangeAddressModalProps, "isOpen">) {
  const [subdomain, setSubdomain] = React.useState(currentSubdomain);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    const cleaned = subdomain.trim().toLowerCase();

    // 1. Local validation against format rules and reserved subdomains (QA #11)
    const parsed = subdomainSchema.safeParse(cleaned);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid website address.");
      return;
    }

    // 2. Invoke and await the server action
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await updateTenantSubdomainAction(cleaned, tenantId);
      if (!res.success) {
        setError(res.error || "Failed to update website address.");
        return;
      }

      // 3. Only transition to address-updated state after server action succeeds
      onConfirm(cleaned);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-address-title"
      >
        {/* Centered Yellow Warning Icon */}
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircleIcon className="w-6 h-6" />
        </div>

        <div className="text-center mb-5">
          <h3
            id="change-address-title"
            className="text-base font-semibold text-neutral-900"
          >
            Change your website address
          </h3>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            Change only your website name. The .fides.app suffix stays fixed.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              New Fides address
            </label>
            <div className="flex items-center rounded-xl border border-neutral-300 overflow-hidden focus-within:ring-1 focus-within:ring-[#C35000] focus-within:border-[#C35000] bg-neutral-50">
              <input
                type="text"
                value={subdomain}
                onChange={(e) => {
                  setSubdomain(e.target.value.toLowerCase());
                  if (error) setError(null);
                }}
                placeholder="bellavita-studio"
                className="w-full px-3 py-2 bg-white text-xs text-neutral-900 focus:outline-none"
              />
              <span className="px-3 py-2 text-xs text-neutral-500 font-medium bg-neutral-100 border-l border-neutral-200 select-none">
                .fides.app
              </span>
            </div>
            {error && (
              <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>
            )}
          </div>

          <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3.5 space-y-1">
            <span className="block text-xs font-semibold text-amber-950">
              Update your shared links
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              The old address may stop working. Your saved bookmarks, QR codes, and social links need to use the new URL.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition shadow-2xs"
          >
            Close
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#C35000] hover:bg-[#A94400] disabled:opacity-60 rounded-xl shadow-xs transition"
          >
            {isSubmitting ? "Updating..." : "Confirm address"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddressUpdatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
}

export function AddressUpdatedModal({
  isOpen,
  onClose,
  subdomain,
}: AddressUpdatedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-updated-title"
      >
        <div className="mb-4">
          <h3
            id="address-updated-title"
            className="text-base font-semibold text-neutral-900"
          >
            Website address updated
          </h3>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            Your new website address is ready. Remember to update your shared links and QR codes.
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-neutral-50/80 border border-neutral-200 p-3.5 space-y-1.5">
          <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            Address confirmed
          </span>
          <div className="font-mono text-xs font-semibold text-neutral-900">
            {subdomain}.fides.app
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
