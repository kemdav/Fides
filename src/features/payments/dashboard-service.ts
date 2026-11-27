import "server-only";
import { calculateVatSplit, formatDateManila, normalizePaymentMethod, resolvePaymentMethodLabel } from "@/lib/payments";
import { formatTimeManila, getManilaDateKey, getManilaTodayKey, resolveCustomerName, resolveServiceName, resolveStaffName } from "@/lib/date-utils";
import type { DailyCollectionPointDTO, MethodBreakdownItemDTO, PaymentKpiSummaryDTO, PaymentMethod, PaymentRecordDTO, PaymentRecordStatus, PaymentsDashboardDTO, UnsettledAppointmentDTO } from "@/types/payments";
import { readDashboardRows, readDashboardNames, readViewerName } from "./dashboard-queries";
import type { PaymentsDashboardClient } from "./dashboard-queries";
import type { TenantAccess } from "@/lib/merchant/access";

export async function loadPaymentsDashboard(supabase: PaymentsDashboardClient, access: TenantAccess): Promise<{
  dashboardData: PaymentsDashboardDTO;
  userName: string | undefined;
}> {
  const [dashboardData, userName] = await Promise.all([
    buildPaymentsDashboard(supabase, access.tenantId),
    readViewerName(supabase, access.userId),
  ]);
  return { dashboardData, userName };
}

async function buildPaymentsDashboard(supabase: PaymentsDashboardClient, tenantId: string): Promise<PaymentsDashboardDTO> {
  const { vatRatePercent, paymentsList, appointmentsList } = await readDashboardRows(supabase, tenantId);
  const appointmentMap = new Map(appointmentsList.map((appointment) => [appointment.id, appointment]));
  const customerIds = [...new Set(paymentsList.flatMap((payment) => payment.customer_id ? [payment.customer_id] : []))];
  const recorderIds = [...new Set(paymentsList.flatMap((payment) => [payment.recorded_by, payment.created_by])
    .filter((id): id is string => Boolean(id)))];
  const { customerMap, profileMap } = await readDashboardNames(supabase, tenantId, customerIds, recorderIds);
  // Map Unsettled Appointments
  const unsettledAppointments: UnsettledAppointmentDTO[] = [];
  let totalOutstandingCents = 0;
  let outstandingAppointmentsCount = 0;

  for (const apt of appointmentsList) {
    const validPayments = (apt.payments || []).filter(
      (p) => p.status === "paid" || p.status === "pending"
    );
    const calculatedPaidCents = validPayments.reduce((sum, p) => sum + p.amount_cents, 0);
    const balanceCents = Math.max(0, apt.total_cents - calculatedPaidCents);

    if (balanceCents > 0) {
      totalOutstandingCents += balanceCents;
      outstandingAppointmentsCount++;

      unsettledAppointments.push({
        appointmentId: apt.id,
        startsAt: apt.starts_at,
        formattedDate: formatDateManila(apt.starts_at),
        formattedTime: formatTimeManila(apt.starts_at),
        customerId: apt.customer_id,
        customerName: resolveCustomerName(apt.customers, apt.notes),
        serviceSummary: resolveServiceName(apt.appointment_services),
        staffName: resolveStaffName(apt.staff_members),
        appointmentStatus: apt.status,
        totalCents: apt.total_cents,
        paidCents: calculatedPaidCents,
        balanceCents,
        paymentStatus: calculatedPaidCents > 0 ? "partial" : "unpaid",
      });
    }
  }

  // Map Payment Records using in-memory Map lookups
  const paymentHistory: PaymentRecordDTO[] = paymentsList.map((p) => {
    const apt = p.appointment_id ? appointmentMap.get(p.appointment_id) : undefined;
    const aptTotalCents = apt?.total_cents || p.amount_cents;
    const aptValidPayments = (apt?.payments ?? []).filter(
      (sub) => sub.status === "paid" || sub.status === "pending"
    );
    const aptPaidCents =
      aptValidPayments.length > 0
        ? aptValidPayments.reduce((sum, sub) => sum + sub.amount_cents, 0)
        : p.amount_cents;
    const aptBalanceCents = Math.max(0, aptTotalCents - aptPaidCents);

    const directCustomerName = p.customer_id ? customerMap.get(p.customer_id) : undefined;
    const aptCustomerName = apt ? resolveCustomerName(apt.customers, apt.notes) : undefined;
    const customerName = directCustomerName || aptCustomerName || "Walk-in Customer";

    const serviceSummary = apt ? resolveServiceName(apt.appointment_services) : "General Service";
    const staffName = apt ? resolveStaffName(apt.staff_members) : "Staff Member";
    const recorderId = p.recorded_by || p.created_by;
    const recordedByName = (recorderId ? profileMap.get(recorderId) : null) || "Staff Member";

    const normalizedMethod = normalizePaymentMethod(p.method);
    const rawStatus = (p.status || "paid").toLowerCase();
    const status: PaymentRecordStatus =
      rawStatus === "voided"
        ? "voided"
        : rawStatus === "refunded"
        ? "refunded"
        : aptBalanceCents > 0
        ? "partial"
        : "paid";

    const { netCents, vatCents } =
      p.net_cents && p.vat_cents
        ? { netCents: p.net_cents, vatCents: p.vat_cents }
        : calculateVatSplit(p.amount_cents, vatRatePercent);

    const paidAt = p.paid_at || p.created_at || new Date().toISOString();

    return {
      id: p.id,
      appointmentId: p.appointment_id,
      customerId: p.customer_id,
      customerName,
      serviceSummary,
      staffName,
      method: normalizedMethod,
      methodLabel: resolvePaymentMethodLabel(p.method),
      referenceNumber: p.reference_number || p.reference || null,
      amountCents: p.amount_cents,
      netCents,
      vatCents,
      appointmentTotalCents: aptTotalCents,
      appointmentPaidCents: aptPaidCents,
      appointmentBalanceCents: aptBalanceCents,
      status,
      recordedByName,
      notes: p.notes,
      voidReason: p.void_reason,
      voidedAt: p.voided_at,
      refundReason: p.refund_reason,
      refundedAt: p.refunded_at,
      paidAt,
      formattedDate: formatDateManila(paidAt),
      formattedTime: formatTimeManila(paidAt),
    };
  });

  paymentHistory.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  // Today's collections in Manila timezone
  const manilaTodayKey = getManilaTodayKey();
  const todayPaidRecords = paymentHistory.filter(
    (p) =>
      p.status !== "voided" &&
      p.status !== "refunded" &&
      getManilaDateKey(p.paidAt) === manilaTodayKey
  );

  const collectedTodayCents = todayPaidRecords.reduce((sum, p) => sum + p.amountCents, 0);
  const collectedTodayCount = todayPaidRecords.length;

  const allActivePaidRecords = paymentHistory.filter(
    (p) => p.status !== "voided" && p.status !== "refunded"
  );
  const averagePaymentCents =
    allActivePaidRecords.length > 0
      ? Math.round(
          allActivePaidRecords.reduce((sum, p) => sum + p.amountCents, 0) /
            allActivePaidRecords.length
        )
      : 0;

  const kpis: PaymentKpiSummaryDTO = {
    collectedTodayCents,
    collectedTodayCount,
    outstandingBalanceCents: totalOutstandingCents,
    outstandingAppointmentsCount,
    unsettledAppointmentsCount: unsettledAppointments.length,
    averagePaymentCents,
  };

  // Helper for generating daily series
  const buildDailySeries = (daysCount: number): DailyCollectionPointDTO[] => {
    const points: DailyCollectionPointDTO[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = getManilaDateKey(d);
      const label = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
      }).format(d);

      const matchingRecords = paymentHistory.filter(
        (p) =>
          p.status !== "voided" &&
          p.status !== "refunded" &&
          getManilaDateKey(p.paidAt) === dateKey
      );

      const grossCents = matchingRecords.reduce((sum, p) => sum + p.amountCents, 0);
      const netCents = matchingRecords.reduce((sum, p) => sum + p.netCents, 0);

      points.push({
        dateKey,
        label,
        grossCents,
        netCents,
        count: matchingRecords.length,
      });
    }

    return points;
  };

  // Method Breakdown
  const methodMap: Record<PaymentMethod, { amountCents: number; count: number; label: string }> = {
    cash: { amountCents: 0, count: 0, label: "Cash" },
    ewallet: { amountCents: 0, count: 0, label: "E-wallet (GCash / Maya)" },
    card: { amountCents: 0, count: 0, label: "Card" },
  };

  for (const p of allActivePaidRecords) {
    if (methodMap[p.method]) {
      methodMap[p.method].amountCents += p.amountCents;
      methodMap[p.method].count += 1;
    }
  }

  const totalMethodAmountCents = Object.values(methodMap).reduce(
    (sum, m) => sum + m.amountCents,
    0
  );

  const methodBreakdown: MethodBreakdownItemDTO[] = (
    ["cash", "ewallet", "card"] as const
  ).map((method) => {
    const item = methodMap[method];
    const percentage =
      totalMethodAmountCents > 0
        ? Math.round((item.amountCents / totalMethodAmountCents) * 1000) / 10
        : 0;
    return {
      method,
      label: item.label,
      amountCents: item.amountCents,
      percentage,
      count: item.count,
    };
  });

  return {
    kpis,
    dailyCollections: {
      sevenDays: buildDailySeries(7),
      fourteenDays: buildDailySeries(14),
      thirtyDays: buildDailySeries(30),
    },
    methodBreakdown,
    unsettledAppointments,
    paymentHistory,
    vatRatePercent,
  };
}
