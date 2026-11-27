/**
 * Merchant Payments DTOs and Type Definitions
 * End-to-end data transfer objects matching Figma specifications for ticket [MAN-DAS] Payments.
 */

export type PaymentMethod = "cash" | "ewallet" | "card";

export type PaymentRecordStatus = "paid" | "partial" | "voided" | "refunded";

export type AppointmentBalanceStatus = "unpaid" | "partial" | "paid";

export interface PaymentRecordDTO {
  id: string;
  appointmentId: string | null;
  customerId: string | null;
  customerName: string;
  serviceSummary: string;
  staffName: string;
  method: PaymentMethod;
  methodLabel: string;
  referenceNumber: string | null;
  amountCents: number;
  netCents: number; // Net of VAT for BIR quarterly sales book
  vatCents: number; // 12% VAT breakdown or tenant-configured rate
  appointmentTotalCents: number;
  appointmentPaidCents: number;
  appointmentBalanceCents: number;
  status: PaymentRecordStatus;
  recordedByName: string;
  notes: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  refundReason: string | null;
  refundedAt: string | null;
  paidAt: string; // ISO timestamp
  formattedDate: string; // Asia/Manila date string e.g. "Nov 24, 2026"
  formattedTime: string; // Asia/Manila time string e.g. "02:30 PM"
}

export interface UnsettledAppointmentDTO {
  appointmentId: string;
  startsAt: string;
  formattedDate: string;
  formattedTime: string;
  customerId: string | null;
  customerName: string;
  serviceSummary: string;
  staffName: string;
  appointmentStatus: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  paymentStatus: "unpaid" | "partial";
}

export interface PaymentKpiSummaryDTO {
  collectedTodayCents: number;
  collectedTodayCount: number;
  outstandingBalanceCents: number;
  outstandingAppointmentsCount: number;
  unsettledAppointmentsCount: number;
  averagePaymentCents: number;
}

export interface DailyCollectionPointDTO {
  dateKey: string;
  label: string;
  grossCents: number;
  netCents: number;
  count: number;
}

export interface MethodBreakdownItemDTO {
  method: PaymentMethod;
  label: string;
  amountCents: number;
  percentage: number;
  count: number;
}

export interface PaymentsDashboardDTO {
  kpis: PaymentKpiSummaryDTO;
  dailyCollections: {
    sevenDays: DailyCollectionPointDTO[];
    fourteenDays: DailyCollectionPointDTO[];
    thirtyDays: DailyCollectionPointDTO[];
  };
  methodBreakdown: MethodBreakdownItemDTO[];
  unsettledAppointments: UnsettledAppointmentDTO[];
  paymentHistory: PaymentRecordDTO[];
  vatRatePercent: number;
}

/* ------------------------------------------------------------------ Actions */

export interface RecordPaymentInput {
  tenantId: string;
  slug: string;
  appointmentId: string;
  method: PaymentMethod;
  amountCents: number;
  referenceNumber?: string;
  notes?: string;
}

export interface RecordPaymentSuccessData {
  payment: PaymentRecordDTO;
  changeCents: number;
}

export interface VoidPaymentInput {
  tenantId: string;
  slug: string;
  paymentId: string;
  reason: string;
}

export interface RefundPaymentInput {
  tenantId: string;
  slug: string;
  paymentId: string;
  amountCents: number;
  reason: string;
}

export type PaymentActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };
