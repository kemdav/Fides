"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { MetricCard } from "@/components/admin/metric-card";
import {
  PageContent,
  PageHeading,
  Surface,
} from "@/components/admin/primitives";
import { formatPeso } from "@/lib/payments";
import { cn } from "@/lib/utils";
import {
  generateBirSalesBookCsv,
  triggerCsvDownload,
} from "@/lib/payments-export";
import {
  recordPaymentAction,
  voidPaymentAction,
  refundPaymentAction,
} from "@/app/actions/payments";
import { DailyCollectionsBarChart, MethodDonutChart } from "./payment-charts";
import { PaymentLedgerTable } from "./payment-ledger-table";
import {
  PaymentPortalDropdown,
  type DropdownMenuItem,
} from "./payment-portal-dropdown";
import {
  ActionCompletedModal,
  ConfirmPartialPaymentModal,
  PaymentActionErrorModal,
  PaymentRecordedSuccessModal,
  PaymentReceiptModal,
  RecordPaymentModal,
  RefundPaymentConfirmationModal,
  SelectAppointmentModal,
  VoidPaymentConfirmationModal,
} from "./payment-modals";
import type {
  PaymentKpiSummaryDTO,
  PaymentMethod,
  PaymentRecordDTO,
  PaymentRecordStatus,
  PaymentsDashboardDTO,
  RecordPaymentInput,
  RecordPaymentSuccessData,
  UnsettledAppointmentDTO,
} from "@/types/payments";
import type { WorkspaceRole } from "@/lib/merchant/workspace-roles";

const ledgerTabs = [
  { id: "unsettled", label: "Unsettled Appointments" },
  { id: "history", label: "Payment History" },
] as const;

type LedgerTab = (typeof ledgerTabs)[number]["id"];

const historyStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "voided", label: "Voided" },
  { value: "refunded", label: "Refunded" },
] as const;

const unsettledStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
] as const;

const methodOptions = [
  { value: "all", label: "All methods" },
  { value: "cash", label: "Cash" },
  { value: "ewallet", label: "E-wallet (GCash / Maya)" },
  { value: "card", label: "Card" },
] as const;

function PaymentFilterSection<T extends string>({
  title,
  options,
  value,
  onChange,
  open,
}: {
  title: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  open: boolean;
}) {
  return (
    <details
      open={open}
      className="group border-b border-hairline last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-subtle hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden group-open:inline">
          −
        </span>
      </summary>
      <div className="pb-2" role="group" aria-label={title}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className="block w-full break-words px-4 py-2 text-left text-sm text-body hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt aria-pressed:font-semibold aria-pressed:text-burnt"
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

interface PaymentsViewProps {
  initialData: PaymentsDashboardDTO;
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: WorkspaceRole | string;
  tenantId: string;
  slug: string;
}

export function PaymentsView({
  initialData,
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "maria@bellavita.ph",
  userRole = "owner",
  tenantId,
  slug,
}: PaymentsViewProps) {
  const router = useRouter();

  // Active Ledger Tab
  const [activeTab, setActiveTab] = React.useState<LedgerTab>("history");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMethod, setFilterMethod] = React.useState<"all" | PaymentMethod>(
    "all",
  );
  const [historyStatus, setHistoryStatus] = React.useState<
    "all" | PaymentRecordStatus
  >("all");
  const [unsettledStatus, setUnsettledStatus] = React.useState<
    "all" | UnsettledAppointmentDTO["paymentStatus"]
  >("all");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const filterPanelId = React.useId();
  const filterRef = React.useRef<HTMLDivElement>(null);
  const filterButtonRef = React.useRef<HTMLButtonElement>(null);

  // Portal Dropdown state for table row action
  const [dropdownAnchor, setDropdownAnchor] =
    React.useState<HTMLElement | null>(null);
  const [dropdownTargetItem, setDropdownTargetItem] = React.useState<{
    type: LedgerTab;
    item: UnsettledAppointmentDTO | PaymentRecordDTO;
  } | null>(null);

  // Modal states
  const [showSelectAptModal, setShowSelectAptModal] = React.useState(false);
  const [selectedAptForRecord, setSelectedAptForRecord] =
    React.useState<UnsettledAppointmentDTO | null>(null);
  const [showRecordModal, setShowRecordModal] = React.useState(false);

  const [pendingPartialInput, setPendingPartialInput] =
    React.useState<RecordPaymentInput | null>(null);
  const [showConfirmPartialModal, setShowConfirmPartialModal] =
    React.useState(false);

  const [paymentSuccessResult, setPaymentSuccessResult] =
    React.useState<RecordPaymentSuccessData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const [receiptRecord, setReceiptRecord] =
    React.useState<PaymentRecordDTO | null>(null);
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);

  const [voidingRecord, setVoidingRecord] =
    React.useState<PaymentRecordDTO | null>(null);
  const [showVoidModal, setShowVoidModal] = React.useState(false);

  const [refundingRecord, setRefundingRecord] =
    React.useState<PaymentRecordDTO | null>(null);
  const [showRefundModal, setShowRefundModal] = React.useState(false);

  const [actionSuccessModal, setActionSuccessModal] = React.useState<{
    title: string;
    description: string;
  } | null>(null);

  const [errorModal, setErrorModal] = React.useState<{
    title?: string;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { dailyCollections, methodBreakdown } = initialData;

  const [lastDashboardData, setLastDashboardData] = React.useState(initialData);
  const [history, setHistory] = React.useState<PaymentRecordDTO[]>(
    initialData.paymentHistory,
  );
  const [unsettled, setUnsettled] = React.useState<UnsettledAppointmentDTO[]>(
    initialData.unsettledAppointments,
  );
  const [currentKpis, setCurrentKpis] = React.useState<PaymentKpiSummaryDTO>(
    initialData.kpis,
  );

  if (lastDashboardData !== initialData) {
    setLastDashboardData(initialData);
    setHistory(initialData.paymentHistory);
    setUnsettled(initialData.unsettledAppointments);
    setCurrentKpis(initialData.kpis);
  }

  React.useEffect(() => {
    if (!filterMenuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node))
        setFilterMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        !filterRef.current?.contains(event.target as Node)
      )
        return;
      setFilterMenuOpen(false);
      filterButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterMenuOpen]);

  // Filtered Unsettled Appointments
  const filteredUnsettled = React.useMemo(() => {
    return unsettled.filter((apt) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        apt.customerName.toLowerCase().includes(q) ||
        apt.serviceSummary.toLowerCase().includes(q) ||
        apt.staffName.toLowerCase().includes(q);

      const matchesStatus =
        unsettledStatus === "all" || apt.paymentStatus === unsettledStatus;

      return matchesSearch && matchesStatus;
    });
  }, [unsettled, searchQuery, unsettledStatus]);

  // Filtered Payment History
  const filteredHistory = React.useMemo(() => {
    return history.filter((rec) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.customerName.toLowerCase().includes(q) ||
        rec.serviceSummary.toLowerCase().includes(q) ||
        rec.staffName.toLowerCase().includes(q) ||
        (rec.referenceNumber && rec.referenceNumber.toLowerCase().includes(q));

      const matchesMethod =
        filterMethod === "all" || rec.method === filterMethod;

      const matchesStatus =
        historyStatus === "all" || rec.status === historyStatus;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [history, searchQuery, filterMethod, historyStatus]);

  /* ------------------------------------------------------------- Handlers */

  const showReceipt = React.useCallback((record: PaymentRecordDTO) => {
    setReceiptRecord(record);
    setShowReceiptModal(true);
  }, []);

  const handleStartRecordPayment = React.useCallback(
    (apt?: UnsettledAppointmentDTO) => {
      if (apt) {
        setSelectedAptForRecord(apt);
        setShowRecordModal(true);
      } else {
        setShowSelectAptModal(true);
      }
    },
    [],
  );

  const handleSelectAptFromModal = (apt: UnsettledAppointmentDTO) => {
    setSelectedAptForRecord(apt);
    setShowRecordModal(true);
  };

  const handleExecutePayment = async (input: RecordPaymentInput) => {
    setIsSubmitting(true);
    try {
      const res = await recordPaymentAction({
        ...input,
        tenantId,
        slug,
      });

      if (!res.ok) {
        setShowConfirmPartialModal(false);
        setErrorModal({
          title: "Payment Recording Failed",
          message: res.error,
        });
        return;
      }

      const createdPayment = res.data.payment;

      // 1. Immediately prepend into local payment history
      setHistory((prev) => [
        createdPayment,
        ...prev.filter((p) => p.id !== createdPayment.id),
      ]);

      // 2. Update unsettled appointments list in local state
      setUnsettled((prev) => {
        if (createdPayment.appointmentBalanceCents <= 0) {
          return prev.filter(
            (apt) => apt.appointmentId !== createdPayment.appointmentId,
          );
        }
        return prev.map((apt) =>
          apt.appointmentId === createdPayment.appointmentId
            ? {
                ...apt,
                paidCents: createdPayment.appointmentPaidCents,
                balanceCents: createdPayment.appointmentBalanceCents,
                paymentStatus: "partial" as const,
              }
            : apt,
        );
      });

      // 3. Update KPIs in local state
      setCurrentKpis((prev: PaymentKpiSummaryDTO) => ({
        ...prev,
        collectedTodayCents:
          prev.collectedTodayCents + createdPayment.amountCents,
        collectedTodayCount: prev.collectedTodayCount + 1,
        outstandingBalanceCents: Math.max(
          0,
          prev.outstandingBalanceCents - createdPayment.amountCents,
        ),
        unsettledAppointmentsCount:
          createdPayment.appointmentBalanceCents <= 0
            ? Math.max(0, prev.unsettledAppointmentsCount - 1)
            : prev.unsettledAppointmentsCount,
      }));

      // 4. Store createdPayment on Modal #4 success state
      setPaymentSuccessResult(res.data);
      setShowRecordModal(false);
      setShowConfirmPartialModal(false);
      setShowSuccessModal(true);

      router.refresh();
    } catch {
      setErrorModal({
        title: "Network or System Error",
        message:
          "Unable to reach server to record payment. Please check connection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmVoid = async (paymentId: string, reason: string) => {
    setIsSubmitting(true);
    try {
      const res = await voidPaymentAction({
        tenantId,
        slug,
        paymentId,
        reason,
      });

      if (!res.ok) {
        setErrorModal({
          title: "Unable to Void Payment",
          message: res.error,
        });
        return;
      }

      // Update local state immediately
      setHistory((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status: "voided" as const, voidReason: reason }
            : p,
        ),
      );

      setShowVoidModal(false);
      setActionSuccessModal({
        title: "Payment Voided",
        description:
          "The payment has been marked as voided. The appointment balance has been reopened.",
      });
      router.refresh();
    } catch {
      setErrorModal({
        title: "Action Error",
        message: "Failed to process void transaction. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRefund = async (
    paymentId: string,
    amountCents: number,
    reason: string,
  ) => {
    setIsSubmitting(true);
    try {
      const res = await refundPaymentAction({
        tenantId,
        slug,
        paymentId,
        amountCents,
        reason,
      });

      if (!res.ok) {
        setErrorModal({
          title: "Refund Failed",
          message: res.error,
        });
        return;
      }

      // Update local state immediately
      setHistory((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status: "refunded" as const, refundReason: reason }
            : p,
        ),
      );

      setShowRefundModal(false);
      setActionSuccessModal({
        title: "Refund Recorded",
        description: `Successfully processed refund of ${formatPeso(amountCents)}. The audit log has been updated.`,
      });
      router.refresh();
    } catch {
      setErrorModal({
        title: "Action Error",
        message: "Failed to record refund. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const csv = generateBirSalesBookCsv(filteredHistory);
    const filename = `BIR_Sales_Book_${slug}_${new Date().toISOString().slice(0, 10)}.csv`;
    triggerCsvDownload(csv, filename);
  };

  const closeDropdown = React.useCallback(() => {
    setDropdownAnchor(null);
    setDropdownTargetItem(null);
  }, []);

  const changeTab = (tab: LedgerTab) => {
    setActiveTab(tab);
    setFilterMenuOpen(false);
    closeDropdown();
  };

  const handleOpenDropdown = (
    e: React.MouseEvent<HTMLElement>,
    item: UnsettledAppointmentDTO | PaymentRecordDTO,
    type: LedgerTab,
  ) => {
    e.stopPropagation();
    if (dropdownAnchor === e.currentTarget) {
      closeDropdown();
      return;
    }
    setDropdownAnchor(e.currentTarget);
    setDropdownTargetItem({ type, item });
  };

  // Build items for portal dropdown
  const dropdownItems = React.useMemo<DropdownMenuItem[]>(() => {
    if (!dropdownTargetItem) return [];

    const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

    if (dropdownTargetItem.type === "unsettled") {
      const apt = dropdownTargetItem.item as UnsettledAppointmentDTO;
      return [
        {
          label: "Record Payment",
          tone: "primary",
          onClick: () => handleStartRecordPayment(apt),
        },
        {
          label: "View Appointment",
          onClick: () => router.push(`/${slug}/dashboard/appointments`),
        },
      ];
    } else {
      const rec = dropdownTargetItem.item as PaymentRecordDTO;
      const items: DropdownMenuItem[] = [
        {
          label: "View Receipt",
          onClick: () => showReceipt(rec),
        },
      ];

      if (rec.status === "partial") {
        items.push({
          label: "Settle Balance",
          tone: "primary",
          onClick: () => {
            // Find unsettled appointment matching this record
            const apt = unsettled.find(
              (a) => a.appointmentId === rec.appointmentId,
            );
            if (apt) {
              handleStartRecordPayment(apt);
            } else {
              showReceipt(rec);
            }
          },
        });
      }

      if (
        isOwnerOrAdmin &&
        (rec.status === "paid" || rec.status === "partial")
      ) {
        items.push({
          label: "Void Payment",
          tone: "danger",
          onClick: () => {
            setVoidingRecord(rec);
            setShowVoidModal(true);
          },
        });
      }

      if (isOwnerOrAdmin && rec.status === "paid") {
        items.push({
          label: "Issue Refund",
          tone: "danger",
          onClick: () => {
            setRefundingRecord(rec);
            setShowRefundModal(true);
          },
        });
      }

      return items;
    }
  }, [
    dropdownTargetItem,
    userRole,
    unsettled,
    slug,
    router,
    handleStartRecordPayment,
    showReceipt,
  ]);

  const isHistory = activeTab === "history";
  const activeTitle = isHistory ? "Payment History" : "Unsettled Appointments";
  const hasFilters = isHistory
    ? historyStatus !== "all" || filterMethod !== "all"
    : unsettledStatus !== "all";
  const hasQuery = Boolean(searchQuery.trim()) || hasFilters;

  function resetFilters() {
    if (isHistory) {
      setFilterMethod("all");
      setHistoryStatus("all");
    } else {
      setUnsettledStatus("all");
    }
  }

  const renderRowActions = (
    item: PaymentRecordDTO | UnsettledAppointmentDTO,
    kind: LedgerTab,
  ) => {
    const expanded = dropdownTargetItem?.item === item;
    return (
      <button
        type="button"
        aria-label={"Payment actions for " + item.customerName}
        aria-haspopup="menu"
        aria-expanded={expanded}
        onClick={(event) => handleOpenDropdown(event, item, kind)}
        className={cn(
          "mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
          expanded
            ? "bg-mist text-ink"
            : "text-glyph hover:bg-mist hover:text-ink",
        )}
      >
        <Icon name="more" weight="fill" className="size-5" />
      </button>
    );
  };

  return (
    <>
      <div
        className={cn(
          "flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden",
          showReceiptModal && "print:hidden",
        )}
      >
        <MerchantSidebar
          businessName={businessName}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          basePath={"/" + slug}
        />

        <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
          <PageContent>
            <PageHeading
              title="Payments"
              description="Record appointment settlements, track balances, and review payment history."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <AdminButton
                    size="sm"
                    aria-haspopup="dialog"
                    onClick={() => handleStartRecordPayment()}
                  >
                    + Record Payment
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="outline"
                    onClick={handleExportCsv}
                  >
                    Export CSV
                  </AdminButton>
                </div>
              }
            />

            <div className="grid grid-cols-1 gap-5 min-[440px]:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                featured={isHistory}
                pressed={isHistory}
                label="Collected today"
                value={formatPeso(currentKpis.collectedTodayCents)}
                caption={
                  "Across " +
                  currentKpis.collectedTodayCount +
                  " paid transaction" +
                  (currentKpis.collectedTodayCount === 1 ? "" : "s")
                }
                icon="card"
                onClick={() => changeTab("history")}
              />
              <MetricCard
                label="Outstanding balance"
                value={formatPeso(currentKpis.outstandingBalanceCents)}
                caption={
                  currentKpis.outstandingAppointmentsCount +
                  " with unpaid balances"
                }
                icon="clock"
              />
              <MetricCard
                featured={!isHistory}
                pressed={!isHistory}
                label="Unsettled appointments"
                value={currentKpis.unsettledAppointmentsCount}
                caption="Awaiting full or partial settlement"
                icon="calendar"
                onClick={() => changeTab("unsettled")}
              />
              <MetricCard
                label="Average payment"
                value={formatPeso(currentKpis.averagePaymentCents)}
                caption="Per settled transaction"
                icon="chart"
              />
            </div>

            <Surface className="!p-0">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Icon name="card" className="size-5 text-glyph" />
                  <h2 className="text-base font-semibold leading-6 text-ink">
                    {activeTitle}
                  </h2>
                </div>

                <div className="flex w-full items-center gap-2.5 sm:w-auto">
                  <div className="relative min-w-0 flex-1 sm:w-60">
                    <Icon
                      name="search"
                      className="pointer-events-none absolute left-3 top-3.5 size-4 text-glyph"
                    />
                    <input
                      type="text"
                      aria-label={
                        isHistory
                          ? "Search payment history"
                          : "Search unsettled appointments"
                      }
                      placeholder={
                        isHistory
                          ? "Search payments..."
                          : "Search appointments..."
                      }
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-11 w-full rounded-lg border border-hairline bg-white pl-10 pr-9 text-sm text-ink placeholder:text-glyph transition-shadow focus:outline-none focus:ring-2 focus:ring-burnt/40"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear payment search"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-glyph hover:bg-mist hover:text-ink"
                      >
                        <Icon name="close" className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div ref={filterRef} className="relative shrink-0">
                    <button
                      ref={filterButtonRef}
                      type="button"
                      aria-expanded={filterMenuOpen}
                      aria-controls={filterPanelId}
                      onClick={() => setFilterMenuOpen((open) => !open)}
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40",
                        filterMenuOpen || hasFilters
                          ? "border-burnt"
                          : "border-hairline",
                      )}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="size-3.5 text-glyph"
                        aria-hidden
                      >
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      <span>Filter</span>
                      {hasFilters && (
                        <span
                          className="size-1.5 rounded-full bg-burnt"
                          role="img"
                          aria-label="Filters applied"
                        />
                      )}
                      <Icon
                        name="chevron-down"
                        className={cn(
                          "size-3.5 text-glyph transition-transform",
                          filterMenuOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {filterMenuOpen && (
                      <div
                        id={filterPanelId}
                        className="absolute right-0 z-30 mt-1 max-h-[min(60dvh,24rem)] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[10px] border border-hairline bg-white shadow-lg"
                      >
                        {isHistory ? (
                          <>
                            <PaymentFilterSection
                              title="Status"
                              options={historyStatusOptions}
                              value={historyStatus}
                              onChange={setHistoryStatus}
                              open
                            />
                            <PaymentFilterSection
                              title="Method"
                              options={methodOptions}
                              value={filterMethod}
                              onChange={setFilterMethod}
                              open={filterMethod !== "all"}
                            />
                          </>
                        ) : (
                          <PaymentFilterSection
                            title="Status"
                            options={unsettledStatusOptions}
                            value={unsettledStatus}
                            onChange={setUnsettledStatus}
                            open
                          />
                        )}
                        {hasFilters && (
                          <button
                            type="button"
                            onClick={() => {
                              resetFilters();
                              filterButtonRef.current?.focus();
                            }}
                            className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-burnt hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt"
                          >
                            Reset filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="flex flex-wrap gap-1 border-b border-hairline px-4 py-2 sm:px-6"
                role="group"
                aria-label="Ledger view"
              >
                {ledgerTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={id === activeTab}
                    onClick={() => changeTab(id)}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-md px-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 sm:px-3",
                      id === activeTab
                        ? "bg-burnt/10 text-burnt-dark"
                        : "text-muted hover:bg-mist hover:text-ink",
                    )}
                  >
                    {label}
                    <span className="rounded bg-mist px-1.5 text-xs text-muted">
                      {id === "history" ? history.length : unsettled.length}
                    </span>
                  </button>
                ))}
              </div>

              <PaymentLedgerTable
                ledger={
                  isHistory
                    ? {
                        tab: "history",
                        records: filteredHistory,
                        onViewReceipt: showReceipt,
                        renderActions: (record) =>
                          renderRowActions(record, "history"),
                      }
                    : {
                        tab: "unsettled",
                        records: filteredUnsettled,
                        renderActions: (appointment) =>
                          renderRowActions(appointment, "unsettled"),
                      }
                }
                emptyTitle={
                  hasQuery
                    ? isHistory
                      ? "No matching payments"
                      : "No matching appointments"
                    : isHistory
                      ? "No payments yet"
                      : "No unsettled appointments"
                }
                emptyDescription={
                  hasQuery
                    ? "Try a different search term or reset the filters to see all records."
                    : isHistory
                      ? "Recorded payments will appear here."
                      : "Appointments with an outstanding balance will appear here."
                }
                emptyAction={
                  hasQuery ? (
                    <AdminButton
                      size="xs"
                      onClick={() => {
                        setSearchQuery("");
                        resetFilters();
                      }}
                    >
                      Reset filters
                    </AdminButton>
                  ) : isHistory ? (
                    <AdminButton
                      size="xs"
                      aria-haspopup="dialog"
                      onClick={() => handleStartRecordPayment()}
                    >
                      + Record Payment
                    </AdminButton>
                  ) : undefined
                }
              />
            </Surface>

            <div className="grid min-w-0 gap-5 xl:grid-cols-12">
              <div className="min-w-0 xl:col-span-7">
                <DailyCollectionsBarChart
                  history={history}
                  todayKey={dailyCollections.thirtyDays.at(-1)?.dateKey}
                />
              </div>
              <div className="min-w-0 xl:col-span-5">
                <MethodDonutChart breakdown={methodBreakdown} />
              </div>
            </div>
          </PageContent>
        </div>
      </div>

      {/* Portal-Rendered Dropdown Menu */}
      <PaymentPortalDropdown
        isOpen={Boolean(dropdownAnchor)}
        onClose={closeDropdown}
        anchorEl={dropdownAnchor}
        items={dropdownItems}
      />

      {/* Modal 1: Select Unsettled Appointment Modal */}
      <SelectAppointmentModal
        isOpen={showSelectAptModal}
        onClose={() => setShowSelectAptModal(false)}
        unsettledAppointments={unsettled}
        onSelectAppointment={handleSelectAptFromModal}
      />

      {/* Modal 2: Record Payment Modal */}
      <RecordPaymentModal
        isOpen={showRecordModal}
        isActive={!showConfirmPartialModal && !errorModal}
        onClose={() => setShowRecordModal(false)}
        appointment={selectedAptForRecord}
        onProceedToConfirmPartial={(input) => {
          setPendingPartialInput(input);
          setShowConfirmPartialModal(true);
        }}
        onSubmitFullPayment={handleExecutePayment}
        isSubmitting={isSubmitting}
      />

      {/* Modal 3: Confirm Partial Payment Modal */}
      <ConfirmPartialPaymentModal
        isOpen={showConfirmPartialModal && !errorModal}
        onClose={() => setShowConfirmPartialModal(false)}
        input={pendingPartialInput}
        appointment={selectedAptForRecord}
        onConfirm={async () => {
          if (pendingPartialInput) {
            await handleExecutePayment(pendingPartialInput);
          }
        }}
        isSubmitting={isSubmitting}
      />

      {/* Modal 4: Payment Recorded Success Modal */}
      <PaymentRecordedSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        result={paymentSuccessResult}
        onViewReceipt={(payment) => {
          setShowSuccessModal(false);
          setReceiptRecord(payment);
          setShowReceiptModal(true);
        }}
      />

      {/* Modal 5: Payment Receipt / Details Modal */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        record={receiptRecord}
        userRole={userRole}
        onTriggerVoid={(rec) => {
          setVoidingRecord(rec);
          setShowVoidModal(true);
        }}
        onTriggerRefund={(rec) => {
          setRefundingRecord(rec);
          setShowRefundModal(true);
        }}
        onTriggerSettleBalance={(rec) => {
          const apt = unsettled.find(
            (a) => a.appointmentId === rec.appointmentId,
          );
          if (apt) {
            handleStartRecordPayment(apt);
          }
        }}
      />

      {/* Modal 6: Void Payment Confirmation Modal */}
      <VoidPaymentConfirmationModal
        isOpen={showVoidModal}
        isActive={!errorModal}
        onClose={() => setShowVoidModal(false)}
        record={voidingRecord}
        onConfirmVoid={handleConfirmVoid}
        isSubmitting={isSubmitting}
      />

      {/* Modal 7: Refund Payment Confirmation Modal */}
      <RefundPaymentConfirmationModal
        isOpen={showRefundModal}
        isActive={!errorModal}
        onClose={() => setShowRefundModal(false)}
        record={refundingRecord}
        onConfirmRefund={handleConfirmRefund}
        isSubmitting={isSubmitting}
      />

      {/* Modal 8: Action Completed Success Modal */}
      <ActionCompletedModal
        isOpen={Boolean(actionSuccessModal)}
        onClose={() => setActionSuccessModal(null)}
        title={actionSuccessModal?.title || "Action Completed"}
        description={
          actionSuccessModal?.description || "Transaction updated successfully."
        }
      />

      {/* Modal 9: Payment Action Error Modal */}
      <PaymentActionErrorModal
        isOpen={Boolean(errorModal)}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title}
        errorMessage={errorModal?.message || "An unexpected error occurred."}
      />
    </>
  );
}
