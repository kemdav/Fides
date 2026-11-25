"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { formatPeso, normalizePaymentMethod } from "@/lib/payments";
import { generateBirSalesBookCsv, triggerCsvDownload } from "@/lib/payments-export";
import {
  recordPaymentAction,
  voidPaymentAction,
  refundPaymentAction,
} from "@/app/actions/payments";
import { DailyCollectionsBarChart, MethodDonutChart } from "./payment-charts";
import { PaymentPortalDropdown, type DropdownMenuItem } from "./payment-portal-dropdown";
import {
  ActionCompletedModal,
  ConfirmPartialPaymentModal,
  PaymentActionErrorModal,
  PaymentRecordedSuccessModal,
  PaymentReceiptModal,
  RecordPaymentModal,
  RefundPaymentConfirmationModal,
  SelectAppointmentModal,
  StatusBadge,
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
  const [activeTab, setActiveTab] = React.useState<"unsettled" | "history">("history");

  // Timeframe for collections bar chart
  const [timeframe, setTimeframe] = React.useState<"7" | "14" | "30">("7");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMethod, setFilterMethod] = React.useState<"all" | PaymentMethod>("all");
  const [filterStatus, setFilterStatus] = React.useState<"all" | PaymentRecordStatus | "unpaid">("all");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  // Portal Dropdown state for table row action
  const [dropdownAnchor, setDropdownAnchor] = React.useState<HTMLElement | null>(null);
  const [dropdownTargetItem, setDropdownTargetItem] = React.useState<{
    type: "unsettled" | "history";
    item: UnsettledAppointmentDTO | PaymentRecordDTO;
  } | null>(null);

  // Modal states
  const [showSelectAptModal, setShowSelectAptModal] = React.useState(false);
  const [selectedAptForRecord, setSelectedAptForRecord] = React.useState<UnsettledAppointmentDTO | null>(null);
  const [showRecordModal, setShowRecordModal] = React.useState(false);

  const [pendingPartialInput, setPendingPartialInput] = React.useState<RecordPaymentInput | null>(null);
  const [showConfirmPartialModal, setShowConfirmPartialModal] = React.useState(false);

  const [paymentSuccessResult, setPaymentSuccessResult] = React.useState<RecordPaymentSuccessData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);

  const [receiptRecord, setReceiptRecord] = React.useState<PaymentRecordDTO | null>(null);
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);

  const [voidingRecord, setVoidingRecord] = React.useState<PaymentRecordDTO | null>(null);
  const [showVoidModal, setShowVoidModal] = React.useState(false);

  const [refundingRecord, setRefundingRecord] = React.useState<PaymentRecordDTO | null>(null);
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

  // Local state initialized from initialData
  const [history, setHistory] = React.useState<PaymentRecordDTO[]>(initialData.paymentHistory);
  const [unsettled, setUnsettled] = React.useState<UnsettledAppointmentDTO[]>(initialData.unsettledAppointments);
  const [currentKpis, setCurrentKpis] = React.useState<PaymentKpiSummaryDTO>(initialData.kpis);

  // Sync state if initialData changes (e.g. from background revalidation)
  React.useEffect(() => {
    setHistory(initialData.paymentHistory);
    setUnsettled(initialData.unsettledAppointments);
    setCurrentKpis(initialData.kpis);
  }, [initialData]);

  // Select chart series based on timeframe
  const activeDailySeries =
    timeframe === "7"
      ? dailyCollections.sevenDays
      : timeframe === "14"
      ? dailyCollections.fourteenDays
      : dailyCollections.thirtyDays;

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
        filterStatus === "all" || apt.paymentStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [unsettled, searchQuery, filterStatus]);

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
        filterStatus === "all" || rec.status === filterStatus;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [history, searchQuery, filterMethod, filterStatus]);

  /* ------------------------------------------------------------- Handlers */

  const handleStartRecordPayment = (apt?: UnsettledAppointmentDTO) => {
    if (apt) {
      setSelectedAptForRecord(apt);
      setShowRecordModal(true);
    } else {
      setShowSelectAptModal(true);
    }
  };

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
      const changeCents = res.data.changeCents;

      // 1. Immediately prepend into local payment history
      setHistory((prev) => [createdPayment, ...prev.filter((p) => p.id !== createdPayment.id)]);

      // 2. Update unsettled appointments list in local state
      setUnsettled((prev) => {
        if (createdPayment.appointmentBalanceCents <= 0) {
          return prev.filter((apt) => apt.appointmentId !== createdPayment.appointmentId);
        }
        return prev.map((apt) =>
          apt.appointmentId === createdPayment.appointmentId
            ? {
                ...apt,
                paidCents: createdPayment.appointmentPaidCents,
                balanceCents: createdPayment.appointmentBalanceCents,
                paymentStatus: "partial" as const,
              }
            : apt
        );
      });

      // 3. Update KPIs in local state
      setCurrentKpis((prev: PaymentKpiSummaryDTO) => ({
        ...prev,
        collectedTodayCents: prev.collectedTodayCents + createdPayment.amountCents,
        collectedTodayCount: prev.collectedTodayCount + 1,
        outstandingBalanceCents: Math.max(0, prev.outstandingBalanceCents - createdPayment.amountCents),
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
        message: "Unable to reach server to record payment. Please check connection.",
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
          p.id === paymentId ? { ...p, status: "voided" as const, voidReason: reason } : p
        )
      );

      setShowVoidModal(false);
      setActionSuccessModal({
        title: "Payment Voided",
        description: "The payment has been marked as voided. The appointment balance has been reopened.",
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

  const handleConfirmRefund = async (paymentId: string, amountCents: number, reason: string) => {
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
          p.id === paymentId ? { ...p, status: "refunded" as const, refundReason: reason } : p
        )
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

  const handleCloseDropdown = React.useCallback(() => {
    setDropdownAnchor(null);
    setDropdownTargetItem(null);
  }, []);

  const handleOpenDropdown = (
    e: React.MouseEvent<HTMLElement>,
    item: UnsettledAppointmentDTO | PaymentRecordDTO,
    type: "unsettled" | "history"
  ) => {
    e.stopPropagation();
    if (dropdownAnchor === e.currentTarget) {
      handleCloseDropdown();
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
          onClick: () => {
            setReceiptRecord(rec);
            setShowReceiptModal(true);
          },
        },
      ];

      if (rec.status === "partial") {
        items.push({
          label: "Settle Balance",
          tone: "primary",
          onClick: () => {
            // Find unsettled appointment matching this record
            const apt = unsettled.find((a) => a.appointmentId === rec.appointmentId);
            if (apt) {
              handleStartRecordPayment(apt);
            } else {
              setReceiptRecord(rec);
              setShowReceiptModal(true);
            }
          },
        });
      }

      if (isOwnerOrAdmin && (rec.status === "paid" || rec.status === "partial")) {
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
  }, [dropdownTargetItem, userRole, unsettled, slug, router]);

  return (
    <div className="flex min-h-screen bg-[#FFFFEB]">
      {/* Merchant Sidebar */}
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={`/${slug}`}
      />

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">Payments</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Record appointment settlements, track balances, and review payment history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleStartRecordPayment()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C35000] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors shrink-0"
          >
            <Icon name="card" className="size-4" />
            + Record Payment
          </button>
        </div>

        {/* Row 1: Four KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Collected Today (Solid Burnt-Orange) */}
          <div className="flex flex-col justify-between rounded-xl bg-[#C35000] p-5 text-white shadow-sm min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white/90">Collected today</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-white/20">
                <Icon name="card" className="size-4 text-white" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {formatPeso(currentKpis.collectedTodayCents)}
              </span>
            </div>
            <p className="text-[11px] text-white/80">
              Across {currentKpis.collectedTodayCount} paid transaction{currentKpis.collectedTodayCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Card 2: Outstanding Balance (White) */}
          <div className="flex flex-col justify-between rounded-xl border border-[#EDECE8] bg-white p-5 shadow-sm min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#64748B]">Outstanding balance</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#F8FAFC]">
                <Icon name="clock" className="size-4 text-[#64748B]" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B]">
                {formatPeso(currentKpis.outstandingBalanceCents)}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              {currentKpis.outstandingAppointmentsCount} appointment{currentKpis.outstandingAppointmentsCount === 1 ? "" : "s"} with unpaid balances
            </p>
          </div>

          {/* Card 3: Unsettled Appointments (White, Smooth Tab Switch on Click) */}
          <button
            type="button"
            onClick={() => setActiveTab("unsettled")}
            className="flex flex-col justify-between rounded-xl border border-[#EDECE8] bg-white p-5 text-left shadow-sm min-h-[140px] hover:border-[#C35000]/40 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium text-[#64748B] group-hover:text-[#C35000] transition-colors">
                Unsettled appointments
              </span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#F8FAFC] group-hover:bg-[#FFF7ED]">
                <Icon name="calendar" className="size-4 text-[#64748B] group-hover:text-[#C35000]" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B]">
                {currentKpis.unsettledAppointmentsCount}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Awaiting full or partial settlement <span className="text-[#C35000] underline font-medium ml-1">View</span>
            </p>
          </button>

          {/* Card 4: Average Payment (White) */}
          <div className="flex flex-col justify-between rounded-xl border border-[#EDECE8] bg-white p-5 shadow-sm min-h-[140px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#64748B]">Average payment</span>
              <div className="flex size-7 items-center justify-center rounded-lg bg-[#F8FAFC]">
                <Icon name="chart" className="size-4 text-[#64748B]" />
              </div>
            </div>
            <div className="my-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E293B]">
                {formatPeso(currentKpis.averagePaymentCents)}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Per settled transaction
            </p>
          </div>
        </div>

        {/* Row 2: Analytics Cards Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-7">
            <DailyCollectionsBarChart
              data={activeDailySeries}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
            />
          </div>
          <div className="lg:col-span-5">
            <MethodDonutChart breakdown={methodBreakdown} />
          </div>
        </div>

        {/* Row 3: Main Payment Ledger Card */}
        <div className="rounded-xl border border-[#EDECE8] bg-white shadow-sm overflow-hidden">
          {/* Card Header Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b border-[#EDECE8]">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#C35000]">
                <Icon name="card" className="size-4" />
              </div>
              <h2 className="text-base font-bold text-[#1E293B]">Payment Ledger</h2>
            </div>

            {/* Controls: Search, Filter, Export */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#94A3B8]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer, service, or ref..."
                  className="w-48 sm:w-60 rounded-lg border border-[#E2E8F0] py-1.5 pl-8 pr-3 text-xs text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#C35000] focus:ring-1 focus:ring-[#C35000] focus:outline-none"
                />
              </div>

              {/* Filter Popover Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors ${
                    filterMethod !== "all" || filterStatus !== "all"
                      ? "border-[#C35000] bg-[#FFF7ED] text-[#C35000]"
                      : "border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Icon name="settings" className="size-3.5" />
                  Filter
                  {(filterMethod !== "all" || filterStatus !== "all") && (
                    <span className="size-1.5 rounded-full bg-[#C35000]" />
                  )}
                </button>

                {filterMenuOpen && (
                  <div
                    className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-2.5">
                      <label className="block text-[11px] font-semibold text-[#64748B] uppercase mb-1">
                        Method
                      </label>
                      <select
                        value={filterMethod}
                        onChange={(e) => setFilterMethod(e.target.value as any)}
                        className="w-full rounded-lg border border-[#E2E8F0] p-1.5 text-xs text-[#1E293B]"
                      >
                        <option value="all">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="ewallet">E-wallet (GCash / Maya)</option>
                        <option value="card">Card</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="block text-[11px] font-semibold text-[#64748B] uppercase mb-1">
                        Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="w-full rounded-lg border border-[#E2E8F0] p-1.5 text-xs text-[#1E293B]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="voided">Voided</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterMethod("all");
                        setFilterStatus("all");
                        setFilterMenuOpen(false);
                      }}
                      className="w-full rounded-lg border border-[#E2E8F0] py-1 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-xs hover:bg-[#F8FAFC] transition-colors"
              >
                <Icon name="document" className="size-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* View Switcher Tabs (Segmented Buttons) */}
          <div className="px-5 pt-3.5 pb-2 border-b border-[#EDECE8] bg-[#FDFBF7]">
            <div className="inline-flex rounded-lg p-1 bg-[#E2E8F0]/70 gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("unsettled")}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "unsettled"
                    ? "bg-[#C35000] text-white shadow-xs"
                    : "text-[#475569] hover:text-[#1E293B]"
                }`}
              >
                <span>Unsettled Appointments</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    activeTab === "unsettled"
                      ? "bg-white/20 text-white"
                      : "bg-[#CBD5E1] text-[#334155]"
                  }`}
                >
                  {unsettled.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                  activeTab === "history"
                    ? "bg-[#C35000] text-white shadow-xs"
                    : "text-[#475569] hover:text-[#1E293B]"
                }`}
              >
                <span>Payment History</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    activeTab === "history"
                      ? "bg-white/20 text-white"
                      : "bg-[#CBD5E1] text-[#334155]"
                  }`}
                >
                  {history.length}
                </span>
              </button>
            </div>
          </div>

          {/* Tab 1: Unsettled Appointments Table */}
          {activeTab === "unsettled" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EDECE8] bg-[#FCFBF7] text-[#64748B] font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer & Service</th>
                    <th className="py-3 px-4">Staff</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDECE8]">
                  {filteredUnsettled.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                        No unsettled appointments found.
                      </td>
                    </tr>
                  ) : (
                    filteredUnsettled.map((apt) => (
                      <tr key={apt.appointmentId} className="hover:bg-[#FCFBF4] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-semibold text-[#1E293B]">{apt.formattedDate}</p>
                          <p className="text-[11px] text-[#64748B]">{apt.formattedTime}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#1E293B]">{apt.customerName}</p>
                          <p className="text-[11px] text-[#64748B] max-w-[200px] truncate">
                            {apt.serviceSummary}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-[#334155] whitespace-nowrap">
                          {apt.staffName}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-[#1E293B]">
                          {formatPeso(apt.totalCents)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-medium text-emerald-600">
                          {formatPeso(apt.paidCents)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-[#C35000]">
                          {formatPeso(apt.balanceCents)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={apt.paymentStatus} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStartRecordPayment(apt)}
                              className="rounded-lg bg-[#C35000] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#A73F00] transition-colors"
                            >
                              Settle
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenDropdown(e, apt, "unsettled")}
                              className="inline-flex size-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                              aria-label="Actions"
                            >
                              •••
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Payment History Table */}
          {activeTab === "history" && (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EDECE8] bg-[#FCFBF7] text-[#64748B] font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer & Service</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDECE8]">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                        No payment records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FCFBF4] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-semibold text-[#1E293B]">{rec.formattedDate}</p>
                          <p className="text-[11px] text-[#64748B]">{rec.formattedTime}</p>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptRecord(rec);
                              setShowReceiptModal(true);
                            }}
                            className="text-left font-semibold text-[#1E293B] hover:text-[#C35000] hover:underline transition-colors"
                          >
                            {rec.customerName}
                          </button>
                          <p className="text-[11px] text-[#64748B] max-w-[200px] truncate">
                            {rec.serviceSummary}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-[#334155]">
                          {rec.methodLabel}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#64748B]">
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptRecord(rec);
                              setShowReceiptModal(true);
                            }}
                            className="hover:text-[#C35000] hover:underline transition-colors"
                          >
                            {rec.referenceNumber || "—"}
                          </button>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-[#334155]">
                          {rec.recordedByName}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-[#1E293B]">
                          {formatPeso(rec.amountCents)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge status={rec.status} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptRecord(rec);
                                setShowReceiptModal(true);
                              }}
                              className="rounded-lg border border-[#EDECE8] bg-white px-2.5 py-1 text-xs font-semibold text-[#334155] shadow-xs hover:bg-[#F8FAFC] hover:text-[#C35000] transition-colors"
                            >
                              Receipt
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleOpenDropdown(e, rec, "history")}
                              className="inline-flex size-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                              aria-label="Actions"
                            >
                              •••
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Portal-Rendered Dropdown Menu */}
      <PaymentPortalDropdown
        isOpen={Boolean(dropdownAnchor)}
        onClose={handleCloseDropdown}
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
        isOpen={showConfirmPartialModal}
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
          const apt = unsettled.find((a) => a.appointmentId === rec.appointmentId);
          if (apt) {
            handleStartRecordPayment(apt);
          }
        }}
      />

      {/* Modal 6: Void Payment Confirmation Modal */}
      <VoidPaymentConfirmationModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        record={voidingRecord}
        onConfirmVoid={handleConfirmVoid}
        isSubmitting={isSubmitting}
      />

      {/* Modal 7: Refund Payment Confirmation Modal */}
      <RefundPaymentConfirmationModal
        isOpen={showRefundModal}
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
        description={actionSuccessModal?.description || "Transaction updated successfully."}
      />

      {/* Modal 9: Payment Action Error Modal */}
      <PaymentActionErrorModal
        isOpen={Boolean(errorModal)}
        onClose={() => setErrorModal(null)}
        title={errorModal?.title}
        errorMessage={errorModal?.message || "An unexpected error occurred."}
      />
    </div>
  );
}
