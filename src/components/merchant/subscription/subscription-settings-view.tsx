"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { PageContent } from "@/components/admin/primitives";
import { Icon } from "@/components/admin/icon";
import {
  confirmTrialConversionAction,
  keepSubscriptionPlanAction,
  requestReactivationAction,
  scheduleCancellationAction,
  schedulePlanChangeAction,
  submitInvoicePaymentDetailsAction,
  updateBillingDetailsAction,
  updateInvoiceDeliveryPreferencesAction,
  updateRenewalRemindersAction,
} from "@/app/actions/subscription";
import {
  FEATURE_CATALOG,
  type SubscriptionInvoice,
  type SubscriptionTierCode,
  type SubscriptionWorkspaceData,
} from "@/types/subscription";
import { cn } from "@/lib/utils";
import {
  formatLastSaved,
  formatLongDate,
  formatMonthDay,
  formatPeriodNoYear,
  formatPeriodRange,
  formatPhp,
  formatShortDate,
  getNextCycleBounds,
} from "./formatters";
import { CancelFinalConfirmModal, OutcomeModal } from "./modal-shell";
import {
  CancelSubscriptionModal,
  ChangePlanModal,
  ComparePlansModal,
  ConvertTrialModal,
  ReactivateSubscriptionModal,
  ReactivationRequestedModal,
  WhyCannotAddBranchModal,
} from "./plan-modals";
import {
  BillingDetailsModal,
  InvoiceDeliveryPreferencesModal,
  SubmitPaymentDetailsModal,
  SubscriptionInvoiceModal,
} from "./billing-modals";

interface SubscriptionSettingsViewProps {
  initialData: SubscriptionWorkspaceData;
  basePath: string;
}

const INVOICES_PER_PAGE = 5;

const cardClass =
  "rounded-[14px] bg-white p-6 shadow-[0_2px_12px_rgba(36,50,66,0.04)] sm:p-7";

export function SubscriptionSettingsView({
  initialData,
  basePath,
}: SubscriptionSettingsViewProps) {
  const router = useRouter();
  const data = initialData;
  const {
    subscription,
    tiers,
    usage,
    billingProfile,
    invoices,
    canEdit,
    timezone,
  } = data;

  const currentTier =
    tiers.find((t) => t.code === subscription.tierCode) ?? tiers[0];
  const basicTier = tiers.find((t) => t.code === "basic");
  const enterpriseTier = tiers.find((t) => t.code === "enterprise");

  // Modal state
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [changePlanOpen, setChangePlanOpen] = React.useState(false);
  const [changePlanKey, setChangePlanKey] = React.useState(0);
  const [whyBranchOpen, setWhyBranchOpen] = React.useState(false);
  const [billingDetailsOpen, setBillingDetailsOpen] = React.useState(false);
  const [billingDetailsKey, setBillingDetailsKey] = React.useState(0);
  const [deliveryPrefsOpen, setDeliveryPrefsOpen] = React.useState(false);
  const [deliveryPrefsKey, setDeliveryPrefsKey] = React.useState(0);
  const [cancelStep1Open, setCancelStep1Open] = React.useState(false);
  const [cancelStep1Key, setCancelStep1Key] = React.useState(0);
  const [cancelStep2Open, setCancelStep2Open] = React.useState(false);
  const [pendingCancelReason, setPendingCancelReason] = React.useState("");
  const [convertTrialOpen, setConvertTrialOpen] = React.useState(false);
  const [reactivateOpen, setReactivateOpen] = React.useState(false);
  const [reactivationRequestedOpen, setReactivationRequestedOpen] =
    React.useState(false);
  const [reactivationInvoiceId, setReactivationInvoiceId] = React.useState<
    string | null
  >(null);

  const [viewingInvoice, setViewingInvoice] =
    React.useState<SubscriptionInvoice | null>(null);
  const [submitPaymentInvoice, setSubmitPaymentInvoice] =
    React.useState<SubscriptionInvoice | null>(null);
  const [submitPaymentKey, setSubmitPaymentKey] = React.useState(0);

  const [outcomeModal, setOutcomeModal] = React.useState<{
    title: string;
    description: string;
  } | null>(null);
  const [justScheduledPlanBanner, setJustScheduledPlanBanner] =
    React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = React.useState<string | null>(null);
  const [invoicePage, setInvoicePage] = React.useState(1);

  // Derived dates & labels
  const { nextStartIso, nextEndIso } = getNextCycleBounds(
    subscription.currentPeriodEnd,
    timezone,
  );
  const currentPeriodLabel = formatPeriodRange(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    timezone,
  );
  const currentPeriodNoYear = formatPeriodNoYear(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    timezone,
  );
  const nextInvoiceDateLabel = formatLongDate(nextStartIso, timezone);
  const nextInvoicePeriodLabel = formatPeriodRange(
    nextStartIso,
    nextEndIso,
    timezone,
  );
  const nextResetDateLabel = formatMonthDay(nextStartIso, timezone);
  const periodEndLabel = formatLongDate(
    subscription.currentPeriodEnd,
    timezone,
  );

  const nextPlanName = subscription.scheduledTierName ?? subscription.tierName;
  const nextPlanPriceCents =
    subscription.scheduledTierPriceCents ?? subscription.priceCents;

  const isCancelling =
    subscription.cancelAtPeriodEnd &&
    subscription.status !== "cancelled" &&
    subscription.status !== "expired";
  const isEnded =
    subscription.status === "cancelled" || subscription.status === "expired";
  const isTrialing = subscription.status === "trialing";
  const isPastDue = subscription.status === "past_due";
  const hasScheduledChange = Boolean(
    subscription.scheduledTierId &&
    subscription.scheduledTierName &&
    !isCancelling &&
    !isEnded,
  );

  // Usage bar calculations
  const staffLimit = currentTier?.limits.staffAccounts ?? 15;
  const branchLimit = currentTier?.limits.branches ?? 1;
  const apptLimit = currentTier?.limits.appointmentsPerMonth ?? 1000;

  const staffPct = Math.min(
    100,
    Math.round((usage.totalStaffSeatsUsed / staffLimit) * 100),
  );
  const branchPct = Math.min(
    100,
    Math.round((usage.branchesCount / branchLimit) * 100),
  );
  const apptPct = Math.min(
    100,
    Math.round((usage.appointmentsThisPeriod / apptLimit) * 100),
  );
  const branchAtLimit = usage.branchesCount >= branchLimit;

  // Included features for current tier
  const includedFeatures = FEATURE_CATALOG.filter(
    (item) => currentTier?.features[item.key],
  );

  // Invoices pagination
  const totalPages = Math.max(
    1,
    Math.ceil(invoices.length / INVOICES_PER_PAGE),
  );
  const safePage = Math.min(invoicePage, totalPages);
  const pagedInvoices = invoices.slice(
    (safePage - 1) * INVOICES_PER_PAGE,
    safePage * INVOICES_PER_PAGE,
  );
  const latestInvoice = invoices[0] ?? null;
  const latestUnpaidInvoice =
    invoices.find(
      (inv) => inv.status === "overdue" || inv.status === "unpaid",
    ) ?? latestInvoice;

  // Action handlers
  const handleOpenChangePlan = () => {
    setModalError(null);
    setChangePlanKey((k) => k + 1);
    setChangePlanOpen(true);
  };

  const handleOpenBillingDetails = () => {
    setModalError(null);
    setBillingDetailsKey((k) => k + 1);
    setBillingDetailsOpen(true);
  };

  const handleOpenDeliveryPrefs = () => {
    setModalError(null);
    setDeliveryPrefsKey((k) => k + 1);
    setDeliveryPrefsOpen(true);
  };

  const handleOpenCancelStep1 = () => {
    setModalError(null);
    setCancelStep1Key((k) => k + 1);
    setCancelStep1Open(true);
  };

  const handleConfirmPlanChange = async (
    targetTierCode: SubscriptionTierCode,
  ) => {
    setSubmitting(true);
    setModalError(null);
    const result = await schedulePlanChangeAction({
      tenantId: data.tenantId,
      targetTierCode,
    });
    setSubmitting(false);

    if (!result.success) {
      setModalError(result.error);
      return;
    }

    setChangePlanOpen(false);
    setJustScheduledPlanBanner(true);
    const targetName = result.data?.targetTierName ?? "New plan";
    const effDate = formatLongDate(
      result.data?.effectiveAt ?? nextStartIso,
      timezone,
    );
    const priceLabel = formatPhp(result.data?.priceCents ?? nextPlanPriceCents);

    setOutcomeModal({
      title: "Plan change scheduled",
      description: `${targetName} starts ${effDate}. Your next invoice will be ${priceLabel}. No payment is due today.`,
    });
    router.refresh();
  };

  const handleFinalCancelConfirm = async () => {
    setSubmitting(true);
    const result = await scheduleCancellationAction({
      tenantId: data.tenantId,
      reason: pendingCancelReason,
    });
    setSubmitting(false);

    if (!result.success) {
      setModalError(result.error);
      setCancelStep2Open(false);
      return;
    }

    setCancelStep2Open(false);
    setPendingCancelReason("");
    setJustScheduledPlanBanner(false);
    router.refresh();
  };

  const handleKeepMyPlan = async () => {
    setSubmitting(true);
    await keepSubscriptionPlanAction({ tenantId: data.tenantId });
    setSubmitting(false);
    router.refresh();
  };

  const handleConfirmTrialConversion = async () => {
    setSubmitting(true);
    const result = await confirmTrialConversionAction({
      tenantId: data.tenantId,
    });
    setSubmitting(false);

    if (!result.success) return;

    setConvertTrialOpen(false);
    const trialEnd = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
    const { nextStartIso: paidStart } = getNextCycleBounds(trialEnd, timezone);
    setOutcomeModal({
      title: "Paid plan scheduled",
      description: `${subscription.tierName} billing starts ${formatLongDate(paidStart, timezone)}. Your trial remains active until ${formatMonthDay(trialEnd, timezone)}.`,
    });
    router.refresh();
  };

  const handleRequestReactivation = async () => {
    setSubmitting(true);
    const result = await requestReactivationAction({ tenantId: data.tenantId });
    setSubmitting(false);

    if (!result.success) return;

    setReactivateOpen(false);
    setReactivationInvoiceId(result.data?.invoiceId ?? null);
    setReactivationRequestedOpen(true);
    router.refresh();
  };

  const handleSaveBillingDetails = async (values: {
    billingName: string;
    billingEmail: string;
    sameAsBusinessEmail: boolean;
    streetBarangay: string;
    city: string;
    province: string;
    postalCode: string;
    tin: string;
    branchCode: string;
  }) => {
    setSubmitting(true);
    setModalError(null);
    const result = await updateBillingDetailsAction({
      tenantId: data.tenantId,
      ...values,
    });
    setSubmitting(false);

    if (!result.success) {
      setModalError(result.error);
      return;
    }

    setBillingDetailsOpen(false);
    setOutcomeModal({
      title: "Billing details saved",
      description:
        "Your billing contact and invoice preferences have been updated. Owner login details remain unchanged.",
    });
    router.refresh();
  };

  const handleSaveDeliveryPrefs = async (payload: {
    ccEmail: string;
    renewalRemindersEnabled: boolean;
  }) => {
    setSubmitting(true);
    setModalError(null);

    const [ccRes, remRes] = await Promise.all([
      updateInvoiceDeliveryPreferencesAction({
        tenantId: data.tenantId,
        ccEmail: payload.ccEmail,
      }),
      updateRenewalRemindersAction({
        tenantId: data.tenantId,
        renewalRemindersEnabled: payload.renewalRemindersEnabled,
      }),
    ]);
    setSubmitting(false);

    if (!ccRes.success) {
      setModalError(ccRes.error);
      return;
    }
    if (!remRes.success) {
      setModalError(remRes.error);
      return;
    }

    setDeliveryPrefsOpen(false);
    setOutcomeModal({
      title: "Billing details saved",
      description:
        "Your billing contact and invoice preferences have been updated. Owner login details remain unchanged.",
    });
    router.refresh();
  };

  const handleDownloadInvoicePdf = (invoice: SubscriptionInvoice) => {
    const link = document.createElement("a");
    link.href = `/api/merchant/subscription/invoices/${invoice.id}/pdf`;
    link.download = `${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setViewingInvoice(null);
    setOpenRowMenuId(null);
    setOutcomeModal({
      title: "Invoice download",
      description:
        "Your invoice PDF download starts automatically. If it does not start, try again.",
    });
  };

  const handleOpenSubmitPayment = (invoice: SubscriptionInvoice) => {
    setViewingInvoice(null);
    setOpenRowMenuId(null);
    setModalError(null);
    setSubmitPaymentKey((k) => k + 1);
    setSubmitPaymentInvoice(invoice);
  };

  const handleSubmitPaymentDetails = async (payload: {
    invoiceId: string;
    bankTransferReference: string;
    transferDate: string;
    amountPhp: string;
    receiptFile: File | null;
  }) => {
    setSubmitting(true);
    setModalError(null);

    const formData = new FormData();
    formData.set("tenantId", data.tenantId);
    formData.set("invoiceId", payload.invoiceId);
    formData.set("bankTransferReference", payload.bankTransferReference);
    formData.set("transferDate", payload.transferDate);
    formData.set("amountPhp", payload.amountPhp);
    if (payload.receiptFile) {
      formData.set("receipt", payload.receiptFile);
    }

    const result = await submitInvoicePaymentDetailsAction(formData);
    setSubmitting(false);

    if (!result.success) {
      setModalError(result.error);
      return;
    }

    setSubmitPaymentInvoice(null);
    if (result.data?.isPastDue) {
      setOutcomeModal({
        title: "Payment verification pending",
        description:
          "Your payment report has been received. The subscription stays past due until billing verifies the transfer. Do not submit another transfer unless requested.",
      });
    } else {
      setOutcomeModal({
        title: "Payment details submitted",
        description:
          "We’ll verify your bank transfer. Your invoice remains unpaid until verification is complete; no duplicate payment is needed.",
      });
    }
    router.refresh();
  };

  const statusPillLabel = isEnded
    ? subscription.status === "expired"
      ? "Expired"
      : "Cancelled"
    : isPastDue
      ? "Past due"
      : isTrialing
        ? "Trial"
        : "Active";

  const statusPillClass = isEnded
    ? "bg-[#F3F4F6] text-[#4B5563]"
    : isPastDue
      ? "bg-[#FEF2F2] text-[#B91C1C]"
      : isTrialing
        ? "bg-[#EEF2FF] text-[#3B5BDB]"
        : "bg-[#E9F9EE] text-[#15803D]";

  return (
    <div className="flex min-h-dvh bg-[#FEFCE8]">
      <MerchantSidebar
        businessName={data.businessName}
        userName={data.userName}
        userEmail={data.userEmail}
        userRole={data.userRoleLabel}
        basePath={basePath}
      />

      <div className="min-w-0 flex-1">
        <PageContent>
          {/* Page Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-[28px] leading-[36px] text-[#243242] sm:text-[32px] sm:leading-[40px]">
                Subscription settings
              </h1>
              <p className="mt-2 text-[13px] leading-[20px] text-[#6B7280]">
                Manage your plan, usage, invoices, and billing preferences.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="inline-flex h-[34px] items-center justify-center rounded-[6px] border-[1.5px] border-[#C35000] bg-transparent px-3.5 text-[12.5px] font-semibold text-[#C35000] transition-colors hover:bg-[#C35000]/5"
            >
              Compare plans
            </button>
          </div>

          {/* Status Banners */}
          {!canEdit ? (
            <div className="rounded-[10px] border border-[#E9ECF0] bg-[#F3F5F8] px-4 py-3 text-[12.5px] leading-[19px] text-[#354357]">
              Read-only access · Only the business owner can change the
              subscription and billing details.
            </div>
          ) : isCancelling ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#E9ECF0] bg-[#F3F5F8] px-4 py-2.5 text-[12.5px] leading-[19px] text-[#354357]">
              <p>
                Cancellation scheduled · {subscription.tierName} stays active
                through {periodEndLabel} at 23:59 ({timezone}). Renewal on{" "}
                {nextResetDateLabel} is cancelled.
              </p>
              <button
                type="button"
                onClick={handleKeepMyPlan}
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-[7px] bg-[#C35000] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A64400] disabled:opacity-50"
              >
                Keep my Plan
              </button>
            </div>
          ) : isEnded ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-[12.5px] leading-[19px] text-[#991B1B]">
              <p>
                Subscription {subscription.status} · Your workspace is in
                read-only mode. Reactivate your plan to resume bookings.
              </p>
              <button
                type="button"
                onClick={() => setReactivateOpen(true)}
                className="inline-flex h-9 items-center justify-center rounded-[7px] bg-[#C35000] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A64400]"
              >
                Reactivate subscription
              </button>
            </div>
          ) : isPastDue ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5 text-[12.5px] leading-[19px] text-[#92400E]">
              <p>
                Payment past due · Submit your bank transfer details for the
                overdue invoice to avoid service interruption.
              </p>
              {latestUnpaidInvoice && (
                <button
                  type="button"
                  onClick={() => setViewingInvoice(latestUnpaidInvoice)}
                  className="inline-flex h-9 items-center justify-center rounded-[7px] bg-[#C35000] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A64400]"
                >
                  View overdue invoice
                </button>
              )}
            </div>
          ) : isTrialing ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#E9ECF0] bg-[#F3F5F8] px-4 py-2.5 text-[12.5px] leading-[19px] text-[#354357]">
              <p>
                {subscription.trialConversionScheduled
                  ? `Paid plan scheduled · ${subscription.tierName} billing starts after your trial ends on ${formatLongDate(subscription.trialEndsAt ?? subscription.currentPeriodEnd, timezone)}.`
                  : `Free trial active · Your ${subscription.tierName} trial ends ${formatLongDate(subscription.trialEndsAt ?? subscription.currentPeriodEnd, timezone)}.`}
              </p>
              {!subscription.trialConversionScheduled && (
                <button
                  type="button"
                  onClick={() => setConvertTrialOpen(true)}
                  className="inline-flex h-9 items-center justify-center rounded-[7px] bg-[#C35000] px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A64400]"
                >
                  Convert trial to paid
                </button>
              )}
            </div>
          ) : hasScheduledChange ? (
            <div className="space-y-2.5">
              {justScheduledPlanBanner && (
                <div className="rounded-[10px] border border-[#E9ECF0] bg-[#F3F5F8] px-4 py-3 text-[12.5px] leading-[19px] text-[#354357]">
                  Plan change scheduled. No charge is due today.
                </div>
              )}
              <div className="rounded-[10px] border border-[#E9ECF0] bg-[#F3F5F8] px-4 py-3 text-[12.5px] leading-[19px] text-[#354357]">
                Plan change scheduled · {subscription.scheduledTierName} starts{" "}
                {formatLongDate(
                  subscription.scheduledChangeEffectiveAt ?? nextStartIso,
                  timezone,
                )}
                . Your {subscription.tierName} plan remains active until then.
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-[#E9ECF0] bg-[#F3F5F8] px-4 py-3 text-[12.5px] leading-[19px] text-[#354357]">
              Active subscription · Your {subscription.tierName} plan is active
              for {currentPeriodLabel}.
            </div>
          )}

          {/* Top 2-Column Workspace Cards — items-start so each card matches its Figma height */}
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
            {/* Left Card: Plan & Usage */}
            <section className={cardClass}>
              <h2 className="text-[17px] font-medium leading-[24px] text-[#243242]">
                {subscription.tierName}
                {isCancelling ? " · Cancels at period end" : ""}
              </h2>
              <p className="mt-3 text-[26px] font-medium leading-[32px] tracking-[-0.01em] text-[#243242]">
                {formatPhp(subscription.priceCents)} / month
              </p>
              <p className="mt-2 text-[12.5px] text-[#6B7280]">
                Current period: {currentPeriodLabel} · Monthly billing
              </p>

              <div className="mt-3.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium",
                    statusPillClass,
                  )}
                >
                  {statusPillLabel}
                </span>
              </div>

              {/* Usage Meters */}
              <div className="mt-5 space-y-4">
                {/* Staff accounts */}
                <div>
                  <p className="text-[13px] font-medium text-[#243242]">
                    Staff accounts · {usage.totalStaffSeatsUsed} of {staffLimit}
                  </p>
                  <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[#ECEFF3]">
                    <div
                      className="h-full rounded-full bg-[#C35000] transition-all"
                      style={{ width: `${staffPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] leading-[17px] text-[#6B7280]">
                    {usage.activeStaffCount} active{" "}
                    {usage.activeStaffCount === 1 ? "account" : "accounts"} +{" "}
                    {usage.pendingInvitationsCount} pending{" "}
                    {usage.pendingInvitationsCount === 1
                      ? "invitation"
                      : "invitations"}
                    . Pending invitations reserve a seat.
                  </p>
                </div>

                {/* Branches */}
                <div>
                  <p className="text-[13px] font-medium text-[#243242]">
                    Branches · {usage.branchesCount} of {branchLimit}
                  </p>
                  <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[#ECEFF3]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        branchAtLimit ? "bg-[#243242]" : "bg-[#C35000]",
                      )}
                      style={{ width: `${branchPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] leading-[17px] text-[#6B7280]">
                    {branchAtLimit
                      ? subscription.tierCode === "enterprise"
                        ? "At plan branch limit."
                        : "At limit · Upgrade to Enterprise to add another branch."
                      : `${branchLimit - usage.branchesCount} branch ${branchLimit - usage.branchesCount === 1 ? "slot" : "slots"} available.`}
                  </p>
                </div>

                {/* Appointments */}
                <div>
                  <p className="text-[13px] font-medium text-[#243242]">
                    Appointments this period ·{" "}
                    {usage.appointmentsThisPeriod.toLocaleString()} of{" "}
                    {apptLimit.toLocaleString()}
                  </p>
                  <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[#ECEFF3]">
                    <div
                      className="h-full rounded-full bg-[#8ECAE0] transition-all"
                      style={{ width: `${apptPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] leading-[17px] text-[#6B7280]">
                    {isCancelling || isEnded
                      ? "Last billing period usage · New usage starts after a paid plan is active."
                      : `${currentPeriodNoYear} · Resets ${nextResetDateLabel} at 00:00 (${timezone}).`}
                  </p>
                </div>
              </div>

              {canEdit && (
                <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                  {branchAtLimit && subscription.tierCode !== "enterprise" && (
                    <button
                      type="button"
                      onClick={() => setWhyBranchOpen(true)}
                      className="inline-flex h-[44px] min-w-[186px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-5 text-[13px] font-medium text-[#243242] transition-colors hover:bg-[#F9FAFB]"
                    >
                      Why can&apos;t I add a branch?
                    </button>
                  )}
                  {isEnded ? (
                    <button
                      type="button"
                      onClick={() => setReactivateOpen(true)}
                      className="inline-flex h-[44px] min-w-[164px] items-center justify-center rounded-[8px] bg-[#C35000] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#A64400]"
                    >
                      Reactivate subscription
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenChangePlan}
                      className="inline-flex h-[44px] min-w-[136px] items-center justify-center rounded-[8px] bg-[#C35000] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#A64400]"
                    >
                      Change plan
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Right Card: Next Invoice / Subscription Ending */}
            <section className={cardClass}>
              <h2 className="text-[17px] font-medium leading-[24px] text-[#243242]">
                {isCancelling || isEnded
                  ? "Subscription ending"
                  : "Next invoice"}
              </h2>
              <p className="mt-3 text-[24px] font-medium leading-[30px] tracking-[-0.01em] text-[#243242]">
                {isCancelling || isEnded
                  ? "No scheduled renewal"
                  : nextInvoiceDateLabel}
              </p>

              <div className="mt-3">
                {isCancelling || isEnded ? (
                  <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-medium text-[#B45309]">
                    No renewal
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-3 py-1 text-[12px] font-medium text-[#4361EE]">
                    Not issued
                  </span>
                )}
              </div>

              {!isCancelling && !isEnded && (
                <dl className="mt-5 space-y-3 text-[13px]">
                  <div className="grid grid-cols-2 gap-4">
                    <dt className="text-[#6B7280]">Billing period</dt>
                    <dd className="font-medium text-[#243242]">
                      {nextInvoicePeriodLabel}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <dt className="text-[#6B7280]">
                      {nextPlanName} monthly plan
                    </dt>
                    <dd className="font-medium text-[#243242]">
                      {formatPhp(nextPlanPriceCents)}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <dt className="text-[#6B7280]">Add-ons</dt>
                    <dd className="font-medium text-[#243242]">₱0</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <dt className="text-[#6B7280]">Tax</dt>
                    <dd className="font-medium text-[#243242]">
                      Included in the estimate
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <dt className="text-[#6B7280]">Next invoice total</dt>
                    <dd className="font-semibold text-[#243242]">
                      {formatPhp(nextPlanPriceCents)}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="mt-4 rounded-[10px] bg-[#F3F5F8] px-4 py-3 text-[12.5px] leading-[19px] text-[#354357]">
                This is an estimate. Payment is due only after an invoice is
                issued. No payment is requested today.
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[13px] font-medium text-[#243242]">
                  Payment method: Invoice / bank transfer
                </p>
                <p className="text-[12.5px] leading-[19px] text-[#6B7280]">
                  Pay within 7 days of issue. Include the invoice number as your
                  transfer reference. No card is stored.
                </p>
              </div>

              {canEdit && (
                <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleOpenBillingDetails}
                    className="inline-flex h-[34px] items-center justify-center rounded-[6px] border-[1.5px] border-[#C35000] bg-white px-3.5 text-[12.5px] font-semibold text-[#C35000] transition-colors hover:bg-[#C35000]/5"
                  >
                    Billing Details
                  </button>
                  {latestInvoice && (
                    <button
                      type="button"
                      onClick={() => setViewingInvoice(latestInvoice)}
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B7280] transition-colors hover:text-[#243242]"
                    >
                      <span>View Latest Invoice</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6B7280]">
                <p>
                  Invoice and reminder recipient:{" "}
                  <span>{billingProfile.billingEmail}</span>
                  {billingProfile.ccEmail
                    ? ` · CC: ${billingProfile.ccEmail}`
                    : ""}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenDeliveryPrefs}
                    className="font-medium text-[#C35000] hover:underline"
                  >
                    Delivery &amp; alerts
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* Included Features Section */}
          <section className={cardClass}>
            <h2 className="text-[17px] font-medium leading-[24px] text-[#243242]">
              Included in {subscription.tierName}
            </h2>
            <p className="mt-1.5 text-[12.5px] text-[#6B7280]">
              Everything included with your {subscription.tierName} plan.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {includedFeatures.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-start gap-3 rounded-[10px] bg-[#F3F5F8] px-4 py-3.5"
                >
                  <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[#C35000] text-white">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5"
                    >
                      <path d="M4.5 10.5l3.5 3.5 7.5-7.5" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium leading-[19px] text-[#243242]">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-[17px] text-[#6B7280]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Billing History Table */}
          <section className={cardClass}>
            <h2 className="text-[17px] font-medium leading-[24px] text-[#243242]">
              Billing history
            </h2>

            {invoices.length === 0 ? (
              <div className="mt-4 rounded-[10px] border border-dashed border-[#E5E7EB] bg-[#FAFAFB] px-6 py-10 text-center">
                <p className="text-sm font-semibold text-[#243242]">
                  No invoices yet
                </p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  Subscription invoices and bank transfer payment records will
                  appear here once issued.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="text-[12.5px] text-[#6B7280]">
                        <th className="pb-4 pr-4 font-normal">Invoice</th>
                        <th className="pb-4 px-3 font-normal">
                          Billing period
                        </th>
                        <th className="pb-4 px-3 font-normal">Issued</th>
                        <th className="pb-4 px-3 font-normal">Paid</th>
                        <th className="pb-4 px-3 font-normal">Amount</th>
                        <th className="pb-4 px-3 font-normal">Status</th>
                        <th className="pb-4 pl-3 text-right font-normal">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedInvoices.map((inv) => {
                        const statusLabel =
                          inv.status.charAt(0).toUpperCase() +
                          inv.status.slice(1);
                        const isPaid = inv.status === "paid";
                        const isOverdue = inv.status === "overdue";

                        return (
                          <tr key={inv.id} className="text-[#243242]">
                            <td className="py-4 pr-4 font-normal">
                              <button
                                type="button"
                                onClick={() => setViewingInvoice(inv)}
                                className="hover:text-[#C35000] hover:underline"
                              >
                                {inv.invoiceNumber}
                              </button>
                            </td>
                            <td className="py-4 px-3 text-[#4B5563]">
                              {formatPeriodRange(
                                inv.billingPeriodStart,
                                inv.billingPeriodEnd,
                                timezone,
                                true,
                              )}
                            </td>
                            <td className="py-4 px-3 text-[#4B5563]">
                              {formatShortDate(inv.issuedAt, timezone)}
                            </td>
                            <td className="py-4 px-3 text-[#4B5563]">
                              {inv.paidAt
                                ? formatShortDate(inv.paidAt, timezone)
                                : "—"}
                            </td>
                            <td className="py-4 px-3 font-normal">
                              {formatPhp(inv.totalCents)}
                            </td>
                            <td className="py-4 px-3">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-3.5 py-1 text-[12px] font-medium",
                                  isPaid
                                    ? "bg-[#E9F9EE] text-[#15803D]"
                                    : isOverdue
                                      ? "bg-[#FEF2F2] text-[#B91C1C]"
                                      : "bg-[#F3F4F6] text-[#374151]",
                                )}
                              >
                                {statusLabel}
                              </span>
                            </td>
                            <td className="relative py-4 pl-3 text-right">
                              <button
                                type="button"
                                aria-label={`Actions for ${inv.invoiceNumber}`}
                                onClick={() =>
                                  setOpenRowMenuId((cur) =>
                                    cur === inv.id ? null : inv.id,
                                  )
                                }
                                className="inline-flex size-8 items-center justify-center rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
                              >
                                <Icon name="more" className="size-4" />
                              </button>

                              {openRowMenuId === inv.id && (
                                <div className="absolute right-3 top-12 z-20 w-48 rounded-[10px] border border-[#E5E7EB] bg-white py-1.5 text-left shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenRowMenuId(null);
                                      setViewingInvoice(inv);
                                    }}
                                    className="block w-full px-3.5 py-2 text-xs font-medium text-[#243242] hover:bg-[#F9FAFB]"
                                  >
                                    View invoice
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadInvoicePdf(inv)
                                    }
                                    className="block w-full px-3.5 py-2 text-xs font-medium text-[#243242] hover:bg-[#F9FAFB]"
                                  >
                                    Download PDF
                                  </button>
                                  {canEdit &&
                                    (inv.status === "unpaid" ||
                                      inv.status === "overdue") && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenSubmitPayment(inv)
                                        }
                                        className="block w-full px-3.5 py-2 text-xs font-semibold text-[#C35000] hover:bg-[#FFF7ED]"
                                      >
                                        Submit payment details
                                      </button>
                                    )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 text-[12px] text-[#6B7280]">
                  <p>
                    Showing {pagedInvoices.length}{" "}
                    {pagedInvoices.length === 1 ? "invoice" : "invoices"} ·
                    Amounts in PHP
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
                      className="inline-flex h-10 min-w-[110px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-[13px] font-medium text-[#243242] transition-colors hover:bg-[#F9FAFB] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() =>
                        setInvoicePage((p) => Math.min(totalPages, p + 1))
                      }
                      className="inline-flex h-10 min-w-[110px] items-center justify-center rounded-[8px] border border-[#E5E7EB] bg-white px-4 text-[13px] font-medium text-[#243242] transition-colors hover:bg-[#F9FAFB] disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Bottom Metadata & Subscription Cancellation Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4 text-[12px] text-[#6B7280]">
            <p>
              Billing details · Last saved{" "}
              {formatLastSaved(billingProfile.updatedAt, timezone)}
            </p>
            {canEdit && !isCancelling && !isEnded && (
              <button
                type="button"
                onClick={handleOpenCancelStep1}
                className="font-medium text-[#B91C1C] hover:underline"
              >
                Cancel subscription
              </button>
            )}
          </div>
        </PageContent>
      </div>

      {/* Modals */}
      <ComparePlansModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        tiers={tiers}
        currentTierCode={subscription.tierCode}
        canEdit={canEdit}
        onStartChangePlan={handleOpenChangePlan}
      />

      <ChangePlanModal
        key={`change-plan-${changePlanKey}`}
        open={changePlanOpen}
        onClose={() => setChangePlanOpen(false)}
        tiers={tiers}
        subscription={subscription}
        usage={usage}
        timezone={timezone}
        submitting={submitting}
        error={modalError}
        onConfirmPlanChange={handleConfirmPlanChange}
      />

      <WhyCannotAddBranchModal
        open={whyBranchOpen}
        onClose={() => setWhyBranchOpen(false)}
        currentTierName={subscription.tierName}
        currentBranchLimit={branchLimit}
        enterpriseBranchLimit={enterpriseTier?.limits.branches ?? 3}
        canEdit={canEdit}
        onUpgradeClick={handleOpenChangePlan}
      />

      <CancelSubscriptionModal
        key={`cancel-step1-${cancelStep1Key}`}
        open={cancelStep1Open}
        onClose={() => setCancelStep1Open(false)}
        subscription={subscription}
        basicTier={basicTier}
        usage={usage}
        timezone={timezone}
        onProceedToFinalConfirm={(reason) => {
          setPendingCancelReason(reason);
          setCancelStep1Open(false);
          setCancelStep2Open(true);
        }}
      />

      <CancelFinalConfirmModal
        open={cancelStep2Open}
        onClose={() => setCancelStep2Open(false)}
        onConfirm={handleFinalCancelConfirm}
        planName={subscription.tierName}
        periodEndLabel={periodEndLabel}
        submitting={submitting}
      />

      <ConvertTrialModal
        open={convertTrialOpen}
        onClose={() => setConvertTrialOpen(false)}
        subscription={subscription}
        timezone={timezone}
        submitting={submitting}
        onConfirm={handleConfirmTrialConversion}
      />

      <ReactivateSubscriptionModal
        open={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        subscription={subscription}
        submitting={submitting}
        onRequestReactivation={handleRequestReactivation}
      />

      <ReactivationRequestedModal
        open={reactivationRequestedOpen}
        onClose={() => setReactivationRequestedOpen(false)}
        onViewPaymentInstructions={() => {
          setReactivationRequestedOpen(false);
          const target =
            invoices.find((i) => i.id === reactivationInvoiceId) ??
            latestUnpaidInvoice;
          if (target) setViewingInvoice(target);
        }}
      />

      <BillingDetailsModal
        key={`billing-details-${billingDetailsKey}`}
        open={billingDetailsOpen}
        onClose={() => setBillingDetailsOpen(false)}
        profile={billingProfile}
        businessDefaults={data.businessDefaults}
        submitting={submitting}
        error={modalError}
        onSave={handleSaveBillingDetails}
      />

      <InvoiceDeliveryPreferencesModal
        key={`delivery-prefs-${deliveryPrefsKey}`}
        open={deliveryPrefsOpen}
        onClose={() => setDeliveryPrefsOpen(false)}
        initialCcEmail={billingProfile.ccEmail}
        renewalRemindersEnabled={subscription.renewalRemindersEnabled}
        renewalReminderDays={subscription.renewalReminderDays}
        submitting={submitting}
        error={modalError}
        onSave={handleSaveDeliveryPrefs}
      />

      <SubscriptionInvoiceModal
        open={Boolean(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
        invoice={viewingInvoice}
        timezone={timezone}
        canEdit={canEdit}
        onDownloadPdf={handleDownloadInvoicePdf}
        onOpenSubmitPayment={handleOpenSubmitPayment}
      />

      <SubmitPaymentDetailsModal
        key={`submit-payment-${submitPaymentKey}`}
        open={Boolean(submitPaymentInvoice)}
        onClose={() => setSubmitPaymentInvoice(null)}
        invoice={submitPaymentInvoice}
        submitting={submitting}
        error={modalError}
        onSubmit={handleSubmitPaymentDetails}
      />

      <OutcomeModal
        open={Boolean(outcomeModal)}
        onClose={() => setOutcomeModal(null)}
        title={outcomeModal?.title ?? ""}
        description={outcomeModal?.description ?? ""}
      />
    </div>
  );
}
