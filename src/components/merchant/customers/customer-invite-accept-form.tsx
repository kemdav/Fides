"use client";

import * as React from "react";
import Link from "next/link";
import { acceptCustomerInviteAction } from "@/app/actions/customers";
import type { CustomerInvitePreview } from "@/types/customers";
import { Icon } from "@/components/admin/icon";

export function CustomerInviteAcceptForm({
  token,
  preview,
}: {
  token: string;
  preview: CustomerInvitePreview;
}) {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState<{
    tenantSlug: string;
    businessName: string;
  } | null>(null);

  if (!preview.valid) {
    const title =
      preview.reason === "already_registered"
        ? "Account already active"
        : preview.reason === "expired"
          ? "Invitation link expired"
          : preview.reason === "canceled"
            ? "Invitation canceled"
            : "Invalid invitation link";

    const description =
      preview.reason === "already_registered"
        ? "This customer record is already linked to a registered account."
        : preview.reason === "expired"
          ? "This setup link has expired. Ask the business to send you a fresh invite."
          : preview.reason === "canceled"
            ? "This setup link is no longer active. Your visit history is still safely kept by the business."
            : "We could not find an active invitation for this link.";

    return (
      <div className="w-full max-w-md rounded-2xl border border-[#ECEAE0] bg-white p-8 text-center shadow-lg">
        <h1 className="font-display text-2xl text-[#1E293B]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          {description}
        </p>
        {preview.tenantSlug && (
          <div className="mt-6">
            <Link
              href={`/${preview.tenantSlug}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#C35000] px-5 text-sm font-semibold text-white hover:bg-[#A64400]"
            >
              Visit {preview.businessName ?? "Storefront"}
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (completed) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-[#ECEAE0] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border-[3px] border-[#15803D] text-[#15803D]">
          <Icon name="check" weight="bold" className="size-7" />
        </div>
        <h1 className="font-display text-2xl text-[#1E293B]">
          Account activated
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          Your password is set and your existing visits with{" "}
          <span className="font-semibold text-[#1E293B]">
            {completed.businessName}
          </span>{" "}
          are now linked to your account.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/${completed.tenantSlug}`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#C35000] px-5 text-sm font-semibold text-white hover:bg-[#A64400]"
          >
            Visit {completed.businessName}
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await acceptCustomerInviteAction(
        token,
        password,
        confirmPassword,
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      if (res.data) {
        setCompleted(res.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-2xl border border-[#ECEAE0] bg-white p-8 shadow-lg"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#C35000]">
        {preview.businessName}
      </p>
      <h1 className="mt-2 font-display text-2xl text-[#1E293B]">
        Finish setting up your account
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-[#64748B]">
        Hi {preview.customerName}, choose a password for{" "}
        <span className="font-semibold text-[#1E293B]">{preview.email}</span> to
        link your visit history.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="invite-password"
            className="block text-xs font-semibold text-[#1E293B]"
          >
            New password
          </label>
          <input
            id="invite-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1.5 h-10 w-full rounded-lg border border-[#D9DDE3] px-3 text-sm text-[#1E293B] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
          <p className="mt-1 text-[11px] text-[#64748B]">
            Use 8+ characters with an uppercase letter, lowercase letter, and
            number.
          </p>
        </div>

        <div>
          <label
            htmlFor="invite-confirm-password"
            className="block text-xs font-semibold text-[#1E293B]"
          >
            Confirm password
          </label>
          <input
            id="invite-confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="mt-1.5 h-10 w-full rounded-lg border border-[#D9DDE3] px-3 text-sm text-[#1E293B] focus:border-[#C35000] focus:outline-none focus:ring-2 focus:ring-[#C35000]/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 h-11 w-full rounded-lg bg-[#C35000] text-sm font-semibold text-white transition-colors hover:bg-[#A64400] disabled:opacity-50"
      >
        {submitting ? "Activating account..." : "Set Password & Activate"}
      </button>
    </form>
  );
}
