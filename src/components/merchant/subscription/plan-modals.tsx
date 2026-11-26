"use client";

import * as React from "react";
import type {
  SubscriptionTierCode,
  SubscriptionTierOption,
  SubscriptionUsageMetrics,
  TenantSubscriptionSummary,
} from "@/types/subscription";
import { cn } from "@/lib/utils";
import { ModalShell } from "./modal-shell";
import {
  formatLongDate,
  formatMonthDay,
  formatPhp,
  getNextCycleBounds,
} from "./formatters";

interface ComparePlansModalProps {
  open: boolean;
  onClose: () => void;
  tiers: SubscriptionTierOption[];
  currentTierCode: SubscriptionTierCode;
  canEdit: boolean;
  onStartChangePlan: () => void;
}

export function ComparePlansModal({
  open,
  onClose,
  tiers,
  currentTierCode,
  canEdit,
  onStartChangePlan,
}: ComparePlansModalProps) {
  const currentTier = tiers.find((t) => t.code === currentTierCode);

  const rows: {
    label: string;
    render: (t: SubscriptionTierOption) => string;
  }[] = [
    { label: "Monthly price", render: (t) => formatPhp(t.priceCents) },
    { label: "Staff accounts", render: (t) => String(t.limits.staffAccounts) },
    { label: "Branches", render: (t) => String(t.limits.branches) },
    {
      label: "Appointments per month",
      render: (t) => String(t.limits.appointmentsPerMonth),
    },
    {
      label: "Booking website",
      render: (t) => (t.features.bookingWebsite ? "Included" : "Not included"),
    },
    {
      label: "Appointment management",
      render: (t) =>
        t.features.appointmentManagement ? "Included" : "Not included",
    },
    {
      label: "Customer registry",
      render: (t) =>
        t.features.customerRegistry ? "Included" : "Not included",
    },
    {
      label: "Custom domain & QR",
      render: (t) => (t.features.customDomainQr ? "Included" : "Not included"),
    },
    {
      label: "Reports & commissions",
      render: (t) =>
        t.features.reportsCommissions ? "Included" : "Not included",
    },
    {
      label: "Multiple branches",
      render: (t) =>
        t.features.multipleBranches ? "Included" : "Not included",
    },
  ];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Compare plans"
      subtitle={`Monthly pricing in PHP · Your plan: ${currentTier?.name ?? "Business"}`}
      maxWidthClass="max-w-[820px]"
      footer={
        canEdit ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartChangePlan();
            }}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark"
          >
            Change plan
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-[104px] items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist"
          >
            Close
          </button>
        )
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="pb-4 pr-4 font-semibold text-ink">
                Feature
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.id}
                  className="pb-4 px-3 font-semibold text-ink"
                >
                  {tier.name}
                  {tier.code === currentTierCode ? " · Your plan" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-mist">
                <td className="py-3 pr-4 text-muted">{row.label}</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="py-3 px-3 text-muted">
                    {row.render(tier)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

interface ChangePlanModalProps {
  open: boolean;
  onClose: () => void;
  tiers: SubscriptionTierOption[];
  subscription: TenantSubscriptionSummary;
  usage: SubscriptionUsageMetrics;
  timezone: string;
  submitting: boolean;
  error: string | null;
  onConfirmPlanChange: (targetTierCode: SubscriptionTierCode) => void;
}

export function ChangePlanModal({
  open,
  onClose,
  tiers,
  subscription,
  usage,
  timezone,
  submitting,
  error,
  onConfirmPlanChange,
}: ChangePlanModalProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [selectedCode, setSelectedCode] =
    React.useState<SubscriptionTierCode | null>(null);

  const currentTier =
    tiers.find((t) => t.code === subscription.tierCode) ?? tiers[0];
  const selectedTier = selectedCode
    ? (tiers.find((t) => t.code === selectedCode) ?? null)
    : null;
  const { nextStartIso } = getNextCycleBounds(subscription.currentPeriodEnd);
  const effectiveLabel = formatLongDate(nextStartIso, timezone);

  const getBlocker = (tier: SubscriptionTierOption): string | null => {
    if (tier.code === subscription.tierCode) return null;
    if (usage.totalStaffSeatsUsed > tier.limits.staffAccounts) {
      return `Your ${usage.totalStaffSeatsUsed} staff accounts exceed this plan’s ${tier.limits.staffAccounts}-seat limit. Reduce usage before downgrading.`;
    }
    if (usage.branchesCount > tier.limits.branches) {
      return `Your ${usage.branchesCount} branches exceed this plan’s ${tier.limits.branches}-branch limit. Reduce usage before downgrading.`;
    }
    return null;
  };

  if (step === 2 && selectedTier && currentTier) {
    const deltaCents = selectedTier.priceCents - currentTier.priceCents;
    const deltaPrefix = deltaCents >= 0 ? "+" : "-";
    const deltaText = `${deltaPrefix}${formatPhp(Math.abs(deltaCents))}`;

    return (
      <ModalShell
        open={open}
        onClose={onClose}
        title="Review plan change"
        subtitle={`Step 2 of 2 · ${currentTier.name} to ${selectedTier.name}`}
        maxWidthClass="max-w-[680px]"
        footer={
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirmPlanChange(selectedTier.code)}
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark disabled:opacity-50"
            >
              {submitting ? "Scheduling..." : "Confirm plan change"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger-dark">
              {error}
            </div>
          )}

          <dl className="divide-y divide-mist text-sm">
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">Effective date</dt>
              <dd className="font-medium text-ink">{effectiveLabel}</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">Current usage</dt>
              <dd className="font-medium text-ink">
                {usage.totalStaffSeatsUsed} staff · {usage.branchesCount}{" "}
                {usage.branchesCount === 1 ? "branch" : "branches"} ·{" "}
                {usage.appointmentsThisPeriod.toLocaleString()} appointments
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">New limits</dt>
              <dd className="font-medium text-ink">
                {selectedTier.limits.staffAccounts} staff ·{" "}
                {selectedTier.limits.branches}{" "}
                {selectedTier.limits.branches === 1 ? "branch" : "branches"} ·{" "}
                {selectedTier.limits.appointmentsPerMonth.toLocaleString()}{" "}
                appointments
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">Monthly price change</dt>
              <dd className="font-medium text-ink">
                {formatPhp(currentTier.priceCents)} to{" "}
                {formatPhp(selectedTier.priceCents)} ({deltaText})
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">Proration / credit</dt>
              <dd className="font-medium text-ink">
                ₱0 · Change starts next billing cycle
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">Amount due today</dt>
              <dd className="font-medium text-ink">₱0</dd>
            </div>
            <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-muted">First invoice on new plan</dt>
              <dd className="font-medium text-ink">
                {formatPhp(selectedTier.priceCents)} · {effectiveLabel}
              </dd>
            </div>
          </dl>

          <div className="rounded-[10px] bg-mist px-4 py-3.5 text-xs leading-[19px] text-body">
            Monthly billing by invoice / bank transfer. Pay within 7 days of
            invoice issue. No payment is taken when you confirm this change.
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Change subscription plan"
      subtitle="Step 1 of 2 · Choose a plan"
      maxWidthClass="max-w-[920px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-[104px] items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!selectedTier}
            className="inline-flex h-11 min-w-[128px] items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark disabled:bg-sand-400 disabled:text-on-burnt"
          >
            Continue
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted">
          Monthly billing · Annual billing is not offered.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiers.map((tier) => {
            const isCurrent = tier.code === subscription.tierCode;
            const blocker = getBlocker(tier);
            const isSelectable = !isCurrent && !blocker;
            const isSelected = selectedCode === tier.code;

            const featureLabels = [
              tier.features.bookingWebsite && "Booking website",
              tier.features.appointmentManagement && "Appointment management",
              tier.features.customerRegistry && "Customer registry",
              tier.features.customDomainQr && "Custom domain & QR",
              tier.features.reportsCommissions && "Reports & commissions",
              tier.features.multipleBranches && "Multiple branches",
            ].filter(Boolean) as string[];

            return (
              <div
                key={tier.id}
                role={isSelectable ? "button" : undefined}
                tabIndex={isSelectable ? 0 : undefined}
                onClick={() => {
                  if (isSelectable) setSelectedCode(tier.code);
                }}
                onKeyDown={(e) => {
                  if (isSelectable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setSelectedCode(tier.code);
                  }
                }}
                className={cn(
                  "flex flex-col rounded-[12px] border p-5 transition-all",
                  isSelected
                    ? "border-2 border-burnt bg-white shadow-sm"
                    : "border-line bg-white",
                  isSelectable && "cursor-pointer hover:border-burnt/60",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-body">
                  {blocker ? (
                    <span>Unavailable</span>
                  ) : isCurrent ? (
                    <span>Current plan</span>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "flex size-3.5 items-center justify-center rounded-full border",
                          isSelected ? "border-ink" : "border-muted",
                        )}
                      >
                        {isSelected && (
                          <span className="size-2 rounded-full bg-ink" />
                        )}
                      </span>
                      <span>{isSelected ? "Selected" : "Select plan"}</span>
                    </>
                  )}
                </div>

                <h3 className="mt-3 text-[22px] font-semibold leading-[28px] text-ink">
                  {tier.name}
                </h3>
                <p className="mt-2 text-base font-semibold text-ink">
                  {formatPhp(tier.priceCents)} / month
                </p>

                <div className="mt-3 space-y-0.5 text-xs text-muted">
                  <p>
                    {tier.limits.branches}{" "}
                    {tier.limits.branches === 1 ? "branch" : "branches"} ·{" "}
                    {tier.limits.staffAccounts} staff accounts
                  </p>
                  <p>{tier.limits.appointmentsPerMonth} appointments / month</p>
                </div>

                <ul className="mt-4 space-y-1.5 text-xs text-body">
                  {featureLabels.map((label) => (
                    <li key={label} className="flex items-center gap-1.5">
                      <span className="text-ink">✓</span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>

                {blocker && (
                  <div className="mt-4 rounded-lg bg-mist p-3 text-xs leading-[18px] text-body">
                    {blocker}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-[10px] bg-mist px-4 py-3 text-xs text-body">
          Changes take effect on {effectiveLabel}. Your current plan remains
          active until then; no immediate charge or credit applies.
        </div>
      </div>
    </ModalShell>
  );
}

interface WhyCannotAddBranchModalProps {
  open: boolean;
  onClose: () => void;
  currentTierName: string;
  currentBranchLimit: number;
  enterpriseBranchLimit: number;
  canEdit: boolean;
  onUpgradeClick: () => void;
}

export function WhyCannotAddBranchModal({
  open,
  onClose,
  currentTierName,
  currentBranchLimit,
  enterpriseBranchLimit,
  canEdit,
  onUpgradeClick,
}: WhyCannotAddBranchModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Branch limit reached"
      subtitle={`Your ${currentTierName} plan includes up to ${currentBranchLimit} ${currentBranchLimit === 1 ? "branch" : "branches"}.`}
      maxWidthClass="max-w-[520px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist"
          >
            Close
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onUpgradeClick();
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-burnt px-5 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark"
            >
              Upgrade to Enterprise
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3 text-sm leading-[21px] text-body">
        <p>
          You are currently using all {currentBranchLimit} included{" "}
          {currentBranchLimit === 1 ? "branch slot" : "branch slots"} on the{" "}
          <strong className="text-ink">{currentTierName}</strong> tier.
        </p>
        <div className="rounded-[10px] bg-mist px-4 py-3.5 text-xs leading-[19px] text-body">
          Switch to <strong className="text-ink">Enterprise</strong> to
          unlock up to {enterpriseBranchLimit} branches, 50 staff accounts, and
          5,000 monthly appointments starting on your next billing cycle.
        </div>
      </div>
    </ModalShell>
  );
}

interface CancelSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription: TenantSubscriptionSummary;
  basicTier: SubscriptionTierOption | undefined;
  usage: SubscriptionUsageMetrics;
  timezone: string;
  onProceedToFinalConfirm: (reason: string) => void;
}

export function CancelSubscriptionModal({
  open,
  onClose,
  subscription,
  basicTier,
  usage,
  timezone,
  onProceedToFinalConfirm,
}: CancelSubscriptionModalProps) {
  const [reason, setReason] = React.useState("");
  const periodEndLabel = formatLongDate(
    subscription.currentPeriodEnd,
    timezone,
  );
  const { nextStartIso } = getNextCycleBounds(subscription.currentPeriodEnd);
  const effectiveLabel = formatLongDate(nextStartIso, timezone);

  const basicExceedsSeats =
    basicTier && usage.totalStaffSeatsUsed > basicTier.limits.staffAccounts;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Cancel subscription?"
      subtitle="Review what changes before you confirm."
      maxWidthClass="max-w-[660px]"
      footer={
        <>
          <button
            type="button"
            onClick={() => onProceedToFinalConfirm(reason)}
            className="inline-flex h-11 min-w-[180px] items-center justify-center rounded-lg bg-danger px-5 text-sm font-semibold text-white transition-colors hover:bg-danger-dark"
          >
            Confirm cancellation
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 min-w-[144px] items-center justify-center rounded-lg bg-burnt px-5 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark"
          >
            Keep my plan
          </button>
        </>
      }
    >
      <div className="space-y-5 text-sm text-body">
        <div className="rounded-[10px] bg-mist px-4 py-3.5 leading-[21px]">
          Your {subscription.tierName} plan stays active through{" "}
          {periodEndLabel} at 23:59 ({timezone}). Cancellation takes effect{" "}
          {effectiveLabel}.
        </div>

        <div>
          <p className="font-medium text-ink">After the period ends:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
            <li>New bookings and staff changes stop.</li>
            <li>Your workspace becomes read-only.</li>
            <li>Customer records, visit history and invoices are retained.</li>
            <li>
              No new renewal invoices are issued. Existing unpaid invoices still
              need payment.
            </li>
          </ul>
        </div>

        <div>
          <label
            htmlFor="cancel-reason-notes"
            className="block font-medium text-ink"
          >
            Reason for leaving (optional)
          </label>
          <textarea
            id="cancel-reason-notes"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Customer notes."
            maxLength={500}
            className="mt-2 w-full rounded-[10px] border border-line px-3.5 py-2.5 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/20"
          />
        </div>

        {basicTier && subscription.tierCode !== "basic" && (
          <div className="rounded-[10px] bg-mist px-4 py-3.5 text-xs leading-[19px] text-body">
            {basicExceedsSeats
              ? `Need a lower-cost plan? Basic is ${formatPhp(basicTier.priceCents)} / month, but your ${usage.totalStaffSeatsUsed} staff accounts exceed its ${basicTier.limits.staffAccounts}-seat limit. Reduce usage before downgrading.`
              : `Need a lower-cost plan? You can downgrade to Basic (${formatPhp(basicTier.priceCents)} / month) instead of cancelling.`}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

interface ConvertTrialModalProps {
  open: boolean;
  onClose: () => void;
  subscription: TenantSubscriptionSummary;
  timezone: string;
  submitting: boolean;
  onConfirm: () => void;
}

export function ConvertTrialModal({
  open,
  onClose,
  subscription,
  timezone,
  submitting,
  onConfirm,
}: ConvertTrialModalProps) {
  const trialEndIso = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
  const { nextStartIso } = getNextCycleBounds(trialEndIso);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Convert trial to a paid plan"
      maxWidthClass="max-w-[600px]"
      footer={
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark disabled:opacity-50"
        >
          {submitting
            ? "Confirming..."
            : `Confirm ${subscription.tierName} subscription`}
        </button>
      }
    >
      <div className="space-y-4 text-sm text-body">
        <div>
          <p className="font-medium text-ink">
            {subscription.tierName} · {formatPhp(subscription.priceCents)} /
            month
          </p>
          <p className="mt-1 text-body">
            Trial ends {formatLongDate(trialEndIso, timezone)}. Paid billing
            starts {formatLongDate(nextStartIso, timezone)}.
          </p>
        </div>

        <dl className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Due today</dt>
            <dd className="font-medium text-ink">₱0</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">First invoice</dt>
            <dd className="font-medium text-ink">
              {formatPhp(subscription.priceCents)} on{" "}
              {formatMonthDay(nextStartIso, timezone)}
            </dd>
          </div>
        </dl>

        <p className="text-xs leading-[18px] text-muted">
          Payment method: Invoice / bank transfer. Your trial continues until
          its stated end date.
        </p>
      </div>
    </ModalShell>
  );
}

interface ReactivateSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  subscription: TenantSubscriptionSummary;
  submitting: boolean;
  onRequestReactivation: () => void;
}

export function ReactivateSubscriptionModal({
  open,
  onClose,
  subscription,
  submitting,
  onRequestReactivation,
}: ReactivateSubscriptionModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Reactivate subscription"
      maxWidthClass="max-w-[580px]"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-mist"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRequestReactivation}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark disabled:opacity-50"
          >
            {submitting ? "Requesting..." : "Request reactivation"}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-body">
        <dl className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Plan</dt>
            <dd className="font-medium text-ink">
              {subscription.tierName} · Monthly
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-body">Price</dt>
            <dd className="font-medium text-ink">
              {formatPhp(subscription.priceCents)} / month
            </dd>
          </div>
        </dl>

        <p className="text-sm leading-[21px] text-body">
          Review your billing details before reactivating. An invoice will be
          issued for bank transfer; access resumes after payment verification.
        </p>
      </div>
    </ModalShell>
  );
}

interface ReactivationRequestedModalProps {
  open: boolean;
  onClose: () => void;
  onViewPaymentInstructions: () => void;
}

export function ReactivationRequestedModal({
  open,
  onClose,
  onViewPaymentInstructions,
}: ReactivationRequestedModalProps) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Reactivation requested"
      maxWidthClass="max-w-[580px]"
      footer={
        <button
          type="button"
          onClick={onViewPaymentInstructions}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-burnt px-6 text-sm font-semibold text-on-burnt transition-colors hover:bg-burnt-dark"
        >
          View payment instructions
        </button>
      }
    >
      <p className="text-sm leading-[21px] text-body">
        Your invoice is ready. Access resumes once payment is verified.
      </p>
    </ModalShell>
  );
}
