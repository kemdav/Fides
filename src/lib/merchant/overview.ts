import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AppointmentRow, DayChartStat } from "@/components/merchant/overview/overview-view";

type MerchantClient = SupabaseClient<Database>;

const DEFAULT_TIMEZONE = "Asia/Manila";

export interface OverviewMetrics {
  revenueCents: number;
  revenueChangePercent: number;
  bookingCount: number;
  activeCustomerCount: number;
  customerGrowthPercent: number;
  averageOrderValueCents: number;
}

export interface OverviewData {
  metrics: OverviewMetrics;
  chartStats: DayChartStat[];
  todayAppointments: AppointmentRow[];
  calendarAppointments: AppointmentRow[];
  calendarMonth: string;
  todayKey: string;
  timezone: string;
}

export type OverviewPeriod = "Today" | "This Week" | "This Month";

export interface TransactionPageRequest {
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: Database["public"]["Enums"]["payment_status"];
  sort?: "paid_at" | "amount_cents" | "status";
  direction?: "asc" | "desc";
}

export interface TransactionRow {
  id: string;
  amountCents: number;
  currency: string;
  status: Database["public"]["Enums"]["payment_status"];
  method: Database["public"]["Enums"]["payment_method"];
  reference: string | null;
  paidAt: string | null;
  customerName: string;
  appointmentId: string | null;
}

export interface TransactionPage {
  rows: TransactionRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function assertDateRange(start: Date, end: Date): void {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    throw new Error("Invalid merchant overview date range.");
  }
}

function getTimezoneParts(date: Date, timezone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
}

/**
 * Converts a calendar date in the tenant timezone to an instant. The second
 * pass accounts for DST transitions when the initial offset crosses a boundary.
 */
export function zonedDateToUtc(date: string, timezone: string, endOfDay = false): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid calendar date: ${date}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = endOfDay ? 24 : 0;
  const nominal = Date.UTC(year, month - 1, day, hour);
  let candidate = new Date(nominal);

  for (let pass = 0; pass < 2; pass += 1) {
    const local = getTimezoneParts(candidate, timezone);
    const localAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second
    );
    candidate = new Date(nominal - (localAsUtc - candidate.getTime()));
  }

  return candidate;
}

function dateKeyInTimezone(value: string, timezone: string): string {
  const parts = getTimezoneParts(new Date(value), timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getWeekStart(date: Date, timezone: string): string {
  const key = dateKeyInTimezone(date.toISOString(), timezone);
  const [year, month, day] = key.split("-").map(Number);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const offset = localDate.getUTCDay() === 0 ? -6 : 1 - localDate.getUTCDay();
  localDate.setUTCDate(localDate.getUTCDate() + offset);
  return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, "0")}-${String(localDate.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function asOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

async function getMetricsFromTables(
  supabase: MerchantClient,
  tenantId: string,
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
): Promise<OverviewMetrics> {
  const [currentPayments, previousPayments, currentAppointments, previousAppointments] =
    await Promise.all([
      supabase.from("payments").select("amount_cents").eq("tenant_id", tenantId)
        .eq("status", "paid").gte("paid_at", currentStart.toISOString()).lt("paid_at", currentEnd.toISOString()),
      supabase.from("payments").select("amount_cents").eq("tenant_id", tenantId)
        .eq("status", "paid").gte("paid_at", previousStart.toISOString()).lt("paid_at", previousEnd.toISOString()),
      supabase.from("appointments").select("customer_id, status").eq("tenant_id", tenantId)
        .gte("starts_at", currentStart.toISOString()).lt("starts_at", currentEnd.toISOString()),
      supabase.from("appointments").select("customer_id, status").eq("tenant_id", tenantId)
        .gte("starts_at", previousStart.toISOString()).lt("starts_at", previousEnd.toISOString()),
    ]);

  const queryError = [
    currentPayments.error,
    previousPayments.error,
    currentAppointments.error,
    previousAppointments.error,
  ].find(Boolean);
  if (queryError) throw new Error(`Failed to load merchant metrics: ${queryError.message}`);

  const currentRevenue = (currentPayments.data ?? []).reduce(
    (sum, payment) => sum + payment.amount_cents,
    0
  );
  const previousRevenue = (previousPayments.data ?? []).reduce(
    (sum, payment) => sum + payment.amount_cents,
    0
  );
  const validBooking = (status: Database["public"]["Enums"]["appointment_status"]) =>
    status !== "cancelled" && status !== "rejected" && status !== "expired" && status !== "no_show";
  const currentBookings = (currentAppointments.data ?? []).filter((row) => validBooking(row.status));
  const previousBookings = (previousAppointments.data ?? []).filter((row) => validBooking(row.status));
  const currentCustomers = new Set(
    currentBookings.map((row) => row.customer_id).filter((id): id is string => Boolean(id))
  );
  const previousCustomers = new Set(
    previousBookings.map((row) => row.customer_id).filter((id): id is string => Boolean(id))
  );

  return {
    revenueCents: currentRevenue,
    revenueChangePercent: percentageChange(currentRevenue, previousRevenue),
    bookingCount: currentBookings.length,
    activeCustomerCount: currentCustomers.size,
    customerGrowthPercent: percentageChange(currentCustomers.size, previousCustomers.size),
    averageOrderValueCents: currentPayments.data?.length
      ? Math.round(currentRevenue / currentPayments.data.length)
      : 0,
  };
}

export function toAppointmentRow(
  appointment: {
    id: string;
    starts_at: string;
    source: Database["public"]["Enums"]["booking_source"];
    status: Database["public"]["Enums"]["appointment_status"];
    customers: { full_name: string } | { full_name: string }[] | null;
    staff_members: { full_name: string } | { full_name: string }[] | null;
    appointment_services:
      | { services: { name: string } | { name: string }[] | null }
      | { services: { name: string } | { name: string }[] | null }[]
      | null;
  },
  timezone: string
): AppointmentRow {
  const customer = asOne(appointment.customers);
  const staff = asOne(appointment.staff_members);
  const line = asOne(appointment.appointment_services);
  const service = asOne(line?.services ?? null);
  const labels: Record<string, AppointmentRow["status"]> = {
    pending_approval: "Pending approval",
    checked_in: "Check In",
    in_service: "In service",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return {
    id: appointment.id,
    time: new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(appointment.starts_at)),
    customer: customer?.full_name?.trim() || "Customer",
    service: service?.name || "Signature service",
    staff: staff?.full_name?.trim() || "Specialist",
    source: appointment.source === "walk_in" ? "Walk-In" : "Online",
    status: labels[appointment.status] ?? "Confirmed",
    startsAt: appointment.starts_at,
    calendarDate: dateKeyInTimezone(appointment.starts_at, timezone),
    rawStatus: appointment.status,
  };
}

export async function getMerchantOverview(
  supabase: MerchantClient,
  tenantId: string,
  now = new Date(),
  period: OverviewPeriod = "This Week",
  options: { calendarMonth?: string; staff?: { id: string; full_name: string } | null } = {},
): Promise<OverviewData> {
  if (!tenantId) throw new Error("A tenant is required to load the merchant overview.");

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("timezone")
    .eq("id", tenantId)
    .single();
  if (tenantError) throw new Error(`Failed to load merchant timezone: ${tenantError.message}`);

  const timezone = tenant.timezone || DEFAULT_TIMEZONE;
  const weekStart = getWeekStart(now, timezone);
  const weekEnd = addDays(weekStart, 7);
  const todayKey = dateKeyInTimezone(now.toISOString(), timezone);
  const todayParts = todayKey.split("-").map(Number);
  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (period === "Today") {
    const tomorrow = addDays(todayKey, 1);
    const yesterday = addDays(todayKey, -1);
    currentStart = zonedDateToUtc(todayKey, timezone);
    currentEnd = zonedDateToUtc(tomorrow, timezone);
    previousStart = zonedDateToUtc(yesterday, timezone);
    previousEnd = currentStart;
  } else if (period === "This Month") {
    const monthStartKey = `${todayParts[0]}-${String(todayParts[1]).padStart(2, "0")}-01`;
    const nextMonth = new Date(Date.UTC(todayParts[0], todayParts[1], 1));
    const previousMonth = new Date(Date.UTC(todayParts[0], todayParts[1] - 2, 1));
    const monthEndKey = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const previousMonthStartKey = `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
    currentStart = zonedDateToUtc(monthStartKey, timezone);
    currentEnd = zonedDateToUtc(monthEndKey, timezone);
    previousStart = zonedDateToUtc(previousMonthStartKey, timezone);
    previousEnd = currentStart;
  } else {
    currentStart = zonedDateToUtc(weekStart, timezone);
    currentEnd = zonedDateToUtc(weekEnd, timezone);
    previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - 7);
    previousEnd = currentStart;
  }
  const calendarMonth = options.calendarMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(options.calendarMonth)
    && options.calendarMonth >= "1900-01" && options.calendarMonth <= "9998-12"
    ? options.calendarMonth : todayKey.slice(0, 7);
  const [year, month] = calendarMonth.split("-").map(Number);
  const localMonth = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(localMonth.getUTCFullYear(), localMonth.getUTCMonth() + 1, 1));
  const calendarStart = zonedDateToUtc(
    `${localMonth.getUTCFullYear()}-${String(localMonth.getUTCMonth() + 1).padStart(2, "0")}-01`,
    timezone
  );
  const calendarEnd = zonedDateToUtc(
    `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-01`,
    timezone
  );
  assertDateRange(currentStart, currentEnd);

  const staff = options.staff;
  const { data: aggregate, error: aggregateError } = staff !== undefined ? { data: null, error: null } : await supabase.rpc("get_merchant_overview_metrics", {
    p_tenant_id: tenantId,
    p_current_start: currentStart.toISOString(),
    p_current_end: currentEnd.toISOString(),
    p_previous_start: previousStart.toISOString(),
    p_previous_end: previousEnd.toISOString(),
  });
  let metrics: OverviewMetrics;
  if (staff !== undefined) {
    metrics = { revenueCents: 0, revenueChangePercent: 0, bookingCount: 0, activeCustomerCount: 0, customerGrowthPercent: 0, averageOrderValueCents: 0 };
  } else if (aggregateError) {
    const functionMissing = aggregateError.message.includes(
      "Could not find the function public.get_merchant_overview_metrics"
    );
    if (!functionMissing) {
      throw new Error(`Failed to load merchant metrics: ${aggregateError.message}`);
    }

    console.warn(
      "Merchant overview aggregate function is unavailable; using bounded table queries. Apply migration 00019_merchant_overview.sql to enable the optimized RPC."
    );
    metrics = await getMetricsFromTables(
      supabase,
      tenantId,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd
    );
  } else {
    const metricsRow = aggregate?.[0];
    if (!metricsRow) throw new Error("Merchant metrics query returned no result.");
    metrics = {
      revenueCents: Number(metricsRow.revenue_cents),
      revenueChangePercent: Number(metricsRow.revenue_change_percent),
      bookingCount: Number(metricsRow.booking_count),
      activeCustomerCount: Number(metricsRow.active_customer_count),
      customerGrowthPercent: Number(metricsRow.customer_growth_percent),
      averageOrderValueCents: Number(metricsRow.average_order_value_cents),
    };
  }

  async function loadAppointments(start: Date, end: Date) {
    if (staff === null) return [];
    const buildQuery = () => supabase.from("appointments")
      .select("id, starts_at, source, status, customer_id, customers(full_name), staff_members(full_name), appointment_services(services(name)), assigned:appointment_services()")
      .eq("tenant_id", tenantId).gte("starts_at", start.toISOString()).lt("starts_at", end.toISOString())
      .order("starts_at").order("id");
    if (!staff) {
      const { data, error } = await buildQuery();
      if (error) throw error;
      return data;
    }
    const rows: NonNullable<Awaited<ReturnType<typeof buildQuery>>["data"]> = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await buildQuery()
        .eq("assigned.staff_id", staff.id).or(`staff_id.eq.${staff.id},assigned.not.is.null`)
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < pageSize) return rows;
    }
  }

  const [calendarRows, periodRows, weekRows, todayRows] = await Promise.all([
    loadAppointments(calendarStart, calendarEnd),
    loadAppointments(currentStart, currentEnd),
    loadAppointments(zonedDateToUtc(weekStart, timezone), zonedDateToUtc(weekEnd, timezone)),
    calendarMonth === todayKey.slice(0, 7) ? null : loadAppointments(
      zonedDateToUtc(todayKey, timezone), zonedDateToUtc(addDays(todayKey, 1), timezone),
    ),
  ]);
  const toRow = (appointment: (typeof calendarRows)[number]) => ({
    ...toAppointmentRow(appointment, timezone),
    ...(staff && { staff: staff.full_name }),
  });
  const rows = calendarRows.map(toRow);
  const weekSourceRows = weekRows.map(toRow);
  const periodAppointments = periodRows.map(toRow);
  const todayAppointments = todayRows?.map(toRow) ?? rows.filter((row) => row.calendarDate === todayKey);
  if (staff !== undefined) {
    const booked = periodRows.filter(({ status }) => !["cancelled", "rejected", "expired", "no_show"].includes(status));
    metrics.bookingCount = booked.length;
    metrics.activeCustomerCount = new Set(booked.flatMap(({ customer_id }) => customer_id ? [customer_id] : [])).size;
  }

  let chartStats: DayChartStat[];
  if (period === "This Month") {
    const daysInMonth = new Date(Date.UTC(todayParts[0], todayParts[1], 0)).getUTCDate();
    chartStats = Array.from({ length: daysInMonth }, (_, index) => {
      const dayNumber = index + 1;
      const dayRows = periodAppointments.filter((row) => {
        if (!row.startsAt) return false;
        const [year, month, day] = dateKeyInTimezone(row.startsAt, timezone).split("-").map(Number);
        return year === todayParts[0] && month === todayParts[1] && day === dayNumber;
      });
      return {
        day: String(dayNumber),
        booked: dayRows.filter((row) =>
          row.rawStatus !== "cancelled" && row.rawStatus !== "rejected" &&
          row.rawStatus !== "expired" && row.rawStatus !== "no_show"
        ).length,
        completed: dayRows.filter((row) => row.rawStatus === "completed").length,
      };
    });
  } else {
    chartStats = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${weekStart}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const dayRows = weekSourceRows.filter(
        (appointment) => appointment.startsAt && dateKeyInTimezone(appointment.startsAt, timezone) === key
      );
      const dateKey = date.toISOString().slice(0, 10);
      return {
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()],
        isToday: period === "Today" && dateKey === todayKey,
        booked: dayRows.filter(
          (row) =>
            row.rawStatus !== "cancelled" && row.rawStatus !== "rejected" &&
            row.rawStatus !== "expired" && row.rawStatus !== "no_show"
        ).length,
        completed: dayRows.filter((row) => row.rawStatus === "completed").length,
      };
    });
  }

  return {
    metrics,
    chartStats,
    todayAppointments,
    calendarAppointments: rows,
    calendarMonth,
    todayKey,
    timezone,
  };
}

export async function getMerchantTransactions(
  supabase: MerchantClient,
  request: TransactionPageRequest
): Promise<TransactionPage> {
  const page = Math.max(1, Math.floor(request.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(request.pageSize ?? 25)));
  const sort = request.sort ?? "paid_at";
  const direction = request.direction ?? "desc";
  const sortColumn = { paid_at: "paid_at", amount_cents: "amount_cents", status: "status" }[sort];
  const search = request.search?.trim();

  let query = supabase
    .from("payments")
    .select("id, amount_cents, currency, status, method, reference, paid_at, customer_id, appointment_id, customers (full_name)", {
      count: "exact",
    })
    .eq("tenant_id", request.tenantId)
    .order(sortColumn, { ascending: direction === "asc", nullsFirst: false })
    .order("id", { ascending: direction === "asc" });

  if (request.status) query = query.eq("status", request.status);
  if (search) query = query.ilike("reference", `%${search.replace(/[%_]/g, "")}%`);

  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(`Failed to load merchant transactions: ${error.message}`);

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    method: row.method,
    reference: row.reference,
    paidAt: row.paid_at,
    customerName: asOne(row.customers)?.full_name?.trim() || "Customer",
    appointmentId: row.appointment_id,
  }));
  const total = count ?? 0;
  return { rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
