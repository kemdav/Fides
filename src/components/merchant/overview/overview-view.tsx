"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import { PageContent, PageHeading, StatusPill, Surface } from "@/components/admin/primitives";
import { updateAppointmentStatusAction } from "@/app/actions/appointments";
import { NewAppointmentModal, type NewAppointmentResult } from "@/components/merchant/new-appointment-modal";
import { WalkInModal, type WalkInResult } from "@/components/merchant/walk-in-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusPill } from "@/components/merchant/appointment-status-pill";

export interface AppointmentRow {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Online" | "Walk-In";
  status: "Confirmed" | "Pending approval" | "Check In" | "In service" | "Completed" | "Cancelled";
  startsAt?: string;
  calendarDate?: string;
  rawStatus?: string;
}

export interface DayChartStat {
  day: string;
  booked: number;
  completed: number;
  isToday?: boolean;
}

export interface OverviewViewProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  tenantId?: string;
  todayCount?: number;
  confirmedCount?: number;
  pendingCount?: number;
  checkedInCount?: number;
  completedVisitsCount?: number;
  revenueTotal?: number;
  revenueChangePercent?: number;
  bookingCount?: number;
  activeCustomerCount?: number;
  customerGrowthPercent?: number;
  averageOrderValue?: number;
  initialPeriod?: "Today" | "This Week" | "This Month";
  chartStats?: DayChartStat[];
  todayActivity?: { time: string; customer: string; service: string }[];
  initialRows?: AppointmentRow[];
  calendarAppointments?: AppointmentRow[];
  basePath?: string;
}

const EMPTY_APPOINTMENTS: AppointmentRow[] = [];

export function OverviewView({
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole = "Business owner",
  tenantId,
  todayCount = 0,
  confirmedCount = 0,
  pendingCount = 0,
  checkedInCount = 0,
  completedVisitsCount = 0,
  revenueTotal = 0,
  revenueChangePercent = 0,
  bookingCount = 0,
  activeCustomerCount = 0,
  customerGrowthPercent = 0,
  averageOrderValue = 0,
  initialPeriod = "This Week",
  chartStats = [],
  initialRows = EMPTY_APPOINTMENTS,
  calendarAppointments = EMPTY_APPOINTMENTS,
  basePath = "",
}: OverviewViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [appointments, setAppointments] = React.useState<AppointmentRow[]>(initialRows);

  const [filterStatus, setFilterStatus] = React.useState<string>("All");
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [period, setPeriod] = React.useState(initialPeriod);
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<AppointmentRow | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = React.useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [expandedAppointmentId, setExpandedAppointmentId] = React.useState<string | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = React.useState<number | null>(null);
  const [calendarMonth, setCalendarMonth] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const displayName = userName || userEmail;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filtered = appointments.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.staff.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || app.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // QA #3: Row action persists status changes to Supabase
  const handleStatusChange = async (id: string, newStatus: AppointmentRow["status"]) => {
    setActiveMenuId(null);
    const prevRows = appointments;
    setAppointments((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status: newStatus } : row))
    );

    try {
      const res = await updateAppointmentStatusAction({
        appointmentId: id,
        newStatus,
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setAppointments(prevRows);
        showToast(res.error || "Failed to update appointment status.");
        return;
      }
      showToast(`Appointment status updated to ${newStatus}`);
      router.refresh();
    } catch (err: unknown) {
      setAppointments(prevRows);
      showToast(err instanceof Error ? err.message : "Failed to update appointment status.");
    }
  };

  // QA #3: Cancel row action persists cancellation to Supabase
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    const prevRows = appointments;
    setAppointments((prev) => prev.filter((row) => row.id !== target.id));

    try {
      const res = await updateAppointmentStatusAction({
        appointmentId: target.id,
        newStatus: "Cancelled",
        tenantIdParam: tenantId,
      });

      if (!res.success) {
        setAppointments(prevRows);
        showToast(res.error || "Failed to cancel appointment.");
        return;
      }
      showToast(`Appointment for ${target.customer} cancelled.`);
      router.refresh();
    } catch (err: unknown) {
      setAppointments(prevRows);
      showToast(err instanceof Error ? err.message : "Failed to cancel appointment.");
    }
  };

  // Chart statistics data (QA #1: dynamic chart bars from loaded records)
  const stats =
    chartStats && chartStats.length > 0
      ? chartStats
      : [
          { day: "Mon", booked: 0, completed: 0 },
          { day: "Tue", booked: 0, completed: 0 },
          { day: "Wed", booked: 0, completed: 0 },
          { day: "Thu", booked: 0, completed: 0 },
          { day: "Fri", booked: 0, completed: 0 },
          { day: "Sat", booked: 0, completed: 0 },
          { day: "Sun", booked: 0, completed: 0 },
        ];
  const maxVal = Math.max(1, ...stats.map((s) => Math.max(s.booked, s.completed)));
  const lineMaxVal = Math.max(1, ...stats.map((s) => Math.max(s.booked, s.completed)));
  const lineWidth = 720;
  const lineHeight = 280;
  const lineLeft = 44; // space for y-axis labels
  const lineRight = 16;
  const lineTop = 16;
  const lineBottom = 40; // space for x-axis labels + "Today" sub-label
  const chartWidth = lineWidth - lineLeft - lineRight;
  const chartHeight = lineHeight - lineTop - lineBottom;

  // Compute nice y-axis ticks
  const yTickCount = 5;
  const rawStep = lineMaxVal / (yTickCount - 1);
  const niceStep = rawStep <= 1 ? 1 : Math.ceil(rawStep);
  const niceMax = niceStep * (yTickCount - 1);
  const yTicks = Array.from({ length: yTickCount }, (_, i) => i * niceStep);

  const linePointCoords = (key: "booked" | "completed") =>
    stats.map((item, index) => {
      const x =
        stats.length === 1
          ? lineLeft + chartWidth / 2
          : lineLeft + (index / (stats.length - 1)) * chartWidth;
      const y =
        lineTop +
        chartHeight -
        (item[key] / niceMax) * chartHeight;
      return { x, y };
    });

  const smoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  };

  const areaPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return "";
    const baseline = lineTop + chartHeight;
    let d = `M ${points[0].x},${baseline} L ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    d += ` L ${points[points.length - 1].x},${baseline} Z`;
    return d;
  };

  const [hoveredPoint, setHoveredPoint] = React.useState<{
    day: string;
    booked: number;
    completed: number;
    x: number;
    y: number;
  } | null>(null);

  const linePoints = (key: "booked" | "completed") =>
    stats.map((item, index) => {
      const x =
        stats.length === 1
          ? lineWidth / 2
          : 12 + (index / (stats.length - 1)) * (lineWidth - 24);
      const y =
        lineHeight -
        12 -
        (item[key] / lineMaxVal) * (lineHeight - 24);
      return `${x},${y}`;
    }).join(" ");
  const today = new Date();
  const currentMonthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const calendarDaysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const calendarStartDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: calendarStartDay }, () => null),
    ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1),
  ];
  const isCurrentMonth =
    calendarMonth.getFullYear() === today.getFullYear() &&
    calendarMonth.getMonth() === today.getMonth();
  const activeCalendarDay = selectedCalendarDay ?? (isCurrentMonth ? today.getDate() : 1);
  const activeCalendarDateKey = `${calendarMonth.getFullYear()}-${String(
    calendarMonth.getMonth() + 1
  ).padStart(2, "0")}-${String(activeCalendarDay).padStart(2, "0")}`;
  const activeCalendarAppointments = calendarAppointments.filter(
    (appointment) => appointment.calendarDate === activeCalendarDateKey
  );
  const activeCompletedAppointments = activeCalendarAppointments.filter(
    (appointment) => appointment.status === "Completed"
  );
  const activeCalendarLabel = new Date(
    `${activeCalendarDateKey}T12:00:00`
  ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar
        businessName={businessName}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath}
      />

      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            eyebrow="MERCHANT WORKSPACE"
            title={`Welcome back, ${displayName.split(" ")[0] || "Maria"}`}
            description="Here's the latest update on your business. Let's make today a great one."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                    className="h-12 w-36 rounded-lg border-2 border-outline bg-white px-4 text-sm font-semibold text-ink flex items-center justify-between gap-3 hover:bg-mist transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    <span>{period}</span>
                    <Icon name="chevron-down" className="size-4 text-glyph" />
                  </button>
                  {isPeriodOpen && (
                    <div className="absolute right-0 mt-2 w-44 rounded-[10px] bg-white border border-hairline shadow-lg py-2 z-30 text-sm">
                      {["Today", "This Week", "This Month"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPeriod(p as typeof initialPeriod);
                            setIsPeriodOpen(false);
                            setHoveredPoint(null);
                            router.push(`${basePath}/dashboard?period=${encodeURIComponent(p)}`);
                            router.refresh();
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-mist ${period === p ? "text-burnt font-semibold" : "text-body"}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNewBookingOpen(true)}
                >
                  + New Booking
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWalkInOpen(true)}
                >
                  + Add Walk-in
                </AdminButton>
              </div>
            }
          />

          {/* KPI Metric Cards (QA #1: Real loaded counts and amounts) */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard
              featured
              label="Total revenue"
              value={revenueTotal}
              caption={`${revenueChangePercent >= 0 ? "+" : ""}${revenueChangePercent.toFixed(1)}% vs previous week`}
              icon="calendar"
              progress={Math.min(100, Math.max(0, 50 + revenueChangePercent / 2))}
            />
            <MetricCard
              label="Total bookings"
              value={bookingCount}
              caption={`${todayCount} today · ${confirmedCount} confirmed · ${pendingCount} pending`}
              icon="clock"
              progress={bookingCount > 0 ? Math.min(100, Math.round((completedVisitsCount / bookingCount) * 100)) : 0}
              miniChart
            />
            <MetricCard
              label="Active customers"
              value={activeCustomerCount}
              caption={`${customerGrowthPercent >= 0 ? "+" : ""}${customerGrowthPercent.toFixed(1)}% vs previous week · ${checkedInCount} checked in`}
              icon="users"
              progress={Math.min(100, Math.max(0, 50 + customerGrowthPercent / 2))}
            />
            <MetricCard
              label="Average order value"
              value={averageOrderValue}
              caption={`${completedVisitsCount} completed today`}
              icon="card"
              progress={averageOrderValue > 0 ? 100 : 0}
            />
          </div>

          {/* Middle Section: Appointment statistics & Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Appointment statistics (7 cols) */}
            <Surface className="lg:col-span-7 min-h-[440px] h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="chart" className="size-5 text-glyph" />
                  <h3 className="text-sm font-semibold text-ink tracking-wide uppercase">
                    Appointment statistics
                  </h3>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-2.5 rounded-full bg-burnt" />
                    <span>Booked</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="size-2.5 rounded-full bg-sky" />
                    <span>Completed</span>
                  </span>
                </div>
              </div>

              {/* Appointment analytics */}
              <div className="pt-4 transition-all duration-300">
                {period === "This Month" ? (
                  <div className="relative w-full h-[280px]" onMouseLeave={() => setHoveredPoint(null)}>
                    <svg
                      viewBox={`0 0 ${lineWidth} ${lineHeight}`}
                      className="h-[280px] w-full overflow-visible"
                      role="img"
                      aria-label="Daily appointment analytics for this month"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="bookedGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" style={{ stopColor: "var(--color-burnt)" }} stopOpacity="0.18" />
                          <stop offset="100%" style={{ stopColor: "var(--color-burnt)" }} stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="completedGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" style={{ stopColor: "var(--color-sky-deep)" }} stopOpacity="0.15" />
                          <stop offset="100%" style={{ stopColor: "var(--color-sky-deep)" }} stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Y-axis gridlines and labels */}
                      {yTicks.map((tick) => {
                        const y = lineTop + chartHeight - (tick / niceMax) * chartHeight;
                        return (
                          <g key={tick}>
                            <line
                              x1={lineLeft}
                              x2={lineWidth - lineRight}
                              y1={y}
                              y2={y}
                              stroke="var(--color-hairline)"
                              strokeWidth="1"
                            />
                            <text
                              x={lineLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-subtle text-xs font-medium"
                            >
                              {tick}
                            </text>
                          </g>
                        );
                      })}

                      {/* Today vertical indicator */}
                      {(() => {
                        const todayIndex = stats.findIndex((s) => Number(s.day) === today.getDate());
                        if (todayIndex < 0) return null;
                        const todayX =
                          stats.length === 1
                            ? lineLeft + chartWidth / 2
                            : lineLeft + (todayIndex / (stats.length - 1)) * chartWidth;
                        return (
                          <line
                            x1={todayX}
                            x2={todayX}
                            y1={lineTop}
                            y2={lineTop + chartHeight}
                            stroke="var(--color-burnt)"
                            strokeWidth="1"
                            strokeDasharray="4 3"
                            opacity="0.35"
                          />
                        );
                      })()}

                      {/* Gradient area fills */}
                      <path d={areaPath(linePointCoords("booked"))} fill="url(#bookedGrad)" />
                      <path d={areaPath(linePointCoords("completed"))} fill="url(#completedGrad)" />

                      {/* Smooth curve lines */}
                      <path
                        d={smoothPath(linePointCoords("booked"))}
                        fill="none"
                        stroke="var(--color-burnt)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={smoothPath(linePointCoords("completed"))}
                        fill="none"
                        stroke="var(--color-sky-deep)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Data point dots */}
                      {linePointCoords("booked").map((pt, idx) => (
                        <circle
                          key={`b-${idx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.day === stats[idx].day ? 5 : 3}
                          fill="var(--color-burnt)"
                          stroke="white"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      ))}
                      {linePointCoords("completed").map((pt, idx) => (
                        <circle
                          key={`c-${idx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint?.day === stats[idx].day ? 5 : 3}
                          fill="var(--color-sky-deep)"
                          stroke="white"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      ))}

                      {/* X-axis day labels */}
                      {stats.map((item, index) => {
                        const x =
                          stats.length === 1
                            ? lineLeft + chartWidth / 2
                            : lineLeft + (index / (stats.length - 1)) * chartWidth;
                        const isToday = Number(item.day) === today.getDate();
                        // Show every other day, plus first, last, and today
                        const showLabel =
                          index === 0 ||
                          index === stats.length - 1 ||
                          isToday ||
                          (index % 2 === 0);
                        return showLabel ? (
                          <g key={item.day}>
                            <text
                              x={x}
                              y={lineHeight - 14}
                              textAnchor="middle"
                              className={`text-xs font-medium ${isToday ? "fill-burnt" : "fill-subtle"}`}
                            >
                              {item.day}
                            </text>
                            {isToday && (
                              <text
                                x={x}
                                y={lineHeight - 2}
                                textAnchor="middle"
                                className="fill-burnt text-xs font-semibold"
                              >
                                Today
                              </text>
                            )}
                          </g>
                        ) : null;
                      })}

                      {/* Invisible hover hit areas for tooltip */}
                      {stats.map((item, index) => {
                        const coords = linePointCoords("booked");
                        const pt = coords[index];
                        const sliceWidth = stats.length === 1 ? chartWidth : chartWidth / (stats.length - 1);
                        return (
                          <rect
                            key={`hover-${index}`}
                            x={pt.x - sliceWidth / 2}
                            y={lineTop}
                            width={sliceWidth}
                            height={chartHeight}
                            fill="transparent"
                            onMouseEnter={() => {
                              const bookedPt = linePointCoords("booked")[index];
                              setHoveredPoint({
                                day: item.day,
                                booked: item.booked,
                                completed: item.completed,
                                x: bookedPt.x,
                                y: Math.min(
                                  linePointCoords("booked")[index].y,
                                  linePointCoords("completed")[index].y
                                ),
                              });
                            }}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Floating Tooltip */}
                    {hoveredPoint && (
                      <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-hairline bg-white px-3 py-2 shadow-lg text-xs"
                        style={{
                          left: `${(hoveredPoint.x / lineWidth) * 100}%`,
                          top: `${(hoveredPoint.y / lineHeight) * 100}%`,
                        }}
                      >
                        <p className="font-semibold text-ink mb-1">
                          Day {hoveredPoint.day}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-burnt" />
                          <span className="text-muted">Booked:</span>{" "}
                          <span className="font-semibold text-ink">{hoveredPoint.booked}</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-sky" />
                          <span className="text-muted">Completed:</span>{" "}
                          <span className="font-semibold text-ink">{hoveredPoint.completed}</span>
                        </p>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="h-[280px] w-full flex items-end justify-between gap-0 px-0 border-b border-hairline sm:gap-4 sm:px-3">
                    {stats.map((item) => (
                      <div
                        key={item.day}
                        className={`flex-1 flex flex-col items-center gap-1.5 h-full justify-end group ${item.isToday ? "rounded-t-lg bg-burnt/[0.04]" : ""}`}
                      >
                        <div className="w-full flex items-end justify-center gap-0 h-60 sm:gap-1.5">
                          <div
                            className="w-4 bg-burnt rounded-t-sm transition-all duration-300 relative min-h-[4px] sm:w-7"
                            style={{ height: `${item.booked > 0 ? (item.booked / maxVal) * 100 : 4}%` }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-subtle">
                              {item.booked}
                            </span>
                          </div>
                          <div
                            className="w-4 bg-sky rounded-t-sm transition-all duration-300 relative min-h-[4px] sm:w-7"
                            style={{ height: `${item.completed > 0 ? (item.completed / maxVal) * 100 : 4}%` }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-subtle">
                              {item.completed}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs font-medium sm:text-sm ${item.isToday ? "rounded-full bg-burnt px-2 text-white" : "text-muted"}`}>
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Surface>

            {/* Calendar & Today's Activity (5 cols) */}
            <Surface className="lg:col-span-5 min-h-[390px] h-full space-y-6">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="size-5 text-glyph" />
                  <h3 className="text-sm font-semibold text-ink tracking-wide uppercase">Calendar</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-burnt" />
                    <span>Booked</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-sky" />
                    <span>Completed</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-1">
                {/* Mini Calendar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-ink mb-2">
                    <button
                      type="button"
                      aria-label="Previous month"
                      onClick={() => {
                        setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1));
                        setSelectedCalendarDay(null);
                      }}
                      className="flex size-8 items-center justify-center rounded-md text-2xl leading-none text-glyph hover:bg-mist hover:text-ink"
                    >
                      ‹
                    </button>
                    <span className="font-semibold">{currentMonthLabel}</span>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() => {
                        setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1));
                        setSelectedCalendarDay(null);
                      }}
                      className="flex size-8 items-center justify-center rounded-md text-2xl leading-none text-glyph hover:bg-mist hover:text-ink"
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-subtle mb-2">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-body">
                    {calendarCells.map((day, index) => (
                      <button
                        type="button"
                        key={`${day ?? "empty"}-${index}`}
                        disabled={day === null}
                        onClick={() => day !== null && setSelectedCalendarDay(day)}
                        className={`flex items-center justify-center aspect-square min-h-9 ${
                          day === null
                            ? "cursor-default"
                            : day === activeCalendarDay
                              ? "bg-burnt/15 text-burnt rounded-md font-bold"
                              : "rounded-md hover:bg-burnt/10"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected date activity */}
                <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-hairline sm:pl-4 pt-3 sm:pt-0">
                  <span className="text-sm font-semibold text-ink block">
                    {activeCalendarLabel}&apos;s activity
                  </span>
                  <div className="space-y-3 text-sm max-h-48 overflow-y-auto">
                    {activeCalendarAppointments.length > 0 ? (
                      activeCalendarAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-start gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              appointment.status === "Completed" ? "bg-sky" : "bg-burnt"
                            }`}
                          />
                          <div>
                            <span className="font-medium text-body">
                              {appointment.time} · {appointment.customer}
                            </span>
                            <span className="text-subtle block text-xs">
                              {appointment.service} · {appointment.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-subtle block">
                        No activity scheduled for this date.
                      </span>
                    )}
                  </div>
                  <div className="border-t border-hairline pt-3 text-xs text-muted">
                    <span className="font-semibold text-body">
                      {activeCompletedAppointments.length}
                    </span>{" "}
                    completed appointment{activeCompletedAppointments.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </Surface>
          </div>

          {/* Bottom Section: Today's Appointments Table */}
          <Surface className="overflow-hidden !p-0">
            {/* Card Controls */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h3 className="text-base font-semibold leading-6 text-ink">
                    Today&apos;s appointments
                  </h3>
                </div>
                <span className="inline-flex items-center rounded-md bg-mist px-2 py-1 text-xs font-semibold leading-[18px] text-ink">
                  {appointments.length} appointments
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer or service"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 pr-3 rounded-lg border border-hairline bg-white text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40 focus:bg-white w-48 sm:w-64 transition-shadow"
                  />
                  <Icon name="search" className="size-4 text-glyph absolute left-3 top-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="h-11 rounded-lg border border-hairline bg-white px-3 text-sm font-semibold text-ink hover:bg-mist flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                  >
                    <Icon name="filter" className="size-3.5 text-glyph" />
                    <span>Filter</span>
                    <Icon name="chevron-down" className="size-3.5 text-glyph" />
                  </button>
                  {isFilterOpen && (
                    <div className="absolute right-0 mt-1 w-40 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-20 text-sm">
                      {["All", "Confirmed", "Pending approval", "Check In"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 hover:bg-mist ${filterStatus === status ? "text-burnt font-semibold" : "text-body"}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {filterStatus !== "All" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-burnt/10 px-2.5 py-1 text-xs font-semibold text-burnt">
                    {filterStatus}
                    <button
                      type="button"
                      onClick={() => setFilterStatus("All")}
                      className="flex size-4 items-center justify-center rounded-full hover:bg-burnt/20 transition-colors"
                      aria-label="Clear filter"
                    >
                      <Icon name="close" className="size-2.5" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* Mobile appointment cards */}
            <div className="md:hidden divide-y divide-hairline">
              {filtered.length === 0 ? (
                <EmptyState
                  compact
                  title={searchQuery || filterStatus !== "All"
                    ? "No appointments match your search."
                    : "No appointments scheduled."}
                  description={searchQuery || filterStatus !== "All"
                    ? "Try a different name, service, staff member, or status."
                    : "New bookings will appear here automatically."}
                />
              ) : (
                filtered.map((row) => {
                  const isExpanded = expandedAppointmentId === row.id;
                  return (
                    <div key={row.id} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedAppointmentId(isExpanded ? null : row.id)}
                        className="w-full text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{row.customer}</p>
                            <p className="mt-1 text-xs text-muted">
                              {row.time} · {row.service}
                            </p>
                          </div>
                          <AppointmentStatusPill status={row.status} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-3 rounded-lg bg-powder p-3 text-xs text-muted space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <span>Staff <strong className="block text-ink">{row.staff}</strong></span>
                            <span>Source <strong className="block text-ink">{row.source}</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {row.status !== "Confirmed" && (
                              <AdminButton size="xs" variant="primary" onClick={() => handleStatusChange(row.id, "Confirmed")}>
                                Confirm
                              </AdminButton>
                            )}
                            {row.status !== "Check In" && (
                              <AdminButton size="xs" variant="outline" onClick={() => handleStatusChange(row.id, "Check In")}>
                                Check In
                              </AdminButton>
                            )}
                            <AdminButton size="xs" variant="danger" onClick={() => setCancelTarget(row)}>
                              Cancel
                            </AdminButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table (QA #1: Empty state row when 0 appointments) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-xs leading-4 uppercase tracking-wide">Time</th>
                    <th className="px-6 py-4 text-xs leading-4 uppercase tracking-wide">Customer</th>
                    <th className="px-6 py-4 text-xs leading-4 uppercase tracking-wide">Service</th>
                    <th className="px-6 py-4 text-xs leading-4 uppercase tracking-wide">Staff</th>
                    <th className="px-6 py-4 text-xs leading-4 uppercase tracking-wide">Source</th>
                    <th className="px-6 py-4 text-xs leading-4 uppercase tracking-wide">Status</th>
                    <th className="w-24 px-6 py-4 text-xs leading-4 uppercase tracking-wide text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-2">
                        <EmptyState
                          compact
                          title={searchQuery || filterStatus !== "All"
                            ? "No appointments match your search."
                            : "No appointments scheduled."}
                          description={searchQuery || filterStatus !== "All"
                            ? "Try a different name, service, staff member, or status."
                            : "New bookings will appear here automatically."}
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-mist transition-colors">
                        <td className="px-6 py-4 font-medium text-body">{row.time}</td>
                        <td className="px-6 py-4 font-semibold text-ink">{row.customer}</td>
                        <td className="px-6 py-4 text-muted">{row.service}</td>
                        <td className="px-6 py-4 text-muted">{row.staff}</td>
                        <td className="px-6 py-4">
                          <span className={row.source === "Walk-In" ? "text-burnt font-medium" : "text-muted"}>
                            {row.source}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <AppointmentStatusPill status={row.status} />
                        </td>
                        <td className="w-24 px-6 py-4 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                            className="ml-auto flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph"
                          >
                            <Icon name="more" weight="fill" className="size-5" />
                          </button>

                          {activeMenuId === row.id && (
                            <div className="absolute right-4 mt-1 w-40 rounded-[10px] bg-white border border-hairline shadow-lg py-1 z-30 text-left text-sm">
                              {row.status !== "Confirmed" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(row.id, "Confirmed")}
                                  className="w-full text-left px-4 py-2 hover:bg-mist text-body"
                                >
                                  Confirm
                                </button>
                              )}
                              {row.status !== "Check In" && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(row.id, "Check In")}
                                  className="w-full text-left px-4 py-2 hover:bg-mist text-body"
                                >
                                  Check In
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => { setCancelTarget(row); setActiveMenuId(null); }}
                                className="w-full text-left px-4 py-2 hover:bg-danger-bg text-danger font-medium"
                              >
                                Cancel booking
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 sm:p-6 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>Showing {filtered.length} of {appointments.length} appointments · All times in Asia/Manila (UTC+8)</span>
              <Link
                href={`${basePath}/dashboard/appointments`}
                className="text-burnt font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View All Appointments</span>
                <Icon name="arrow-right" weight="medium" className="size-4" />
              </Link>
            </div>
          </Surface>
        </PageContent>
      </div>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl text-xs font-medium">
          {toastMessage}
        </div>
      )}

      {/* Cancel Confirmation Modal (QA #3) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-[10px] bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-display text-[22px] leading-tight text-ink">
              Cancel Appointment?
            </h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Are you sure you want to cancel the appointment for{" "}
              <span className="font-semibold text-ink">{cancelTarget.customer}</span> ({cancelTarget.service}) at {cancelTarget.time}?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <AdminButton variant="outline" size="xs" onClick={() => setCancelTarget(null)}>
                Keep
              </AdminButton>
              <AdminButton variant="danger" size="xs" onClick={handleConfirmCancel}>
                Confirm Cancel
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal (QA #4) */}
      <NewAppointmentModal
        isOpen={isNewBookingOpen}
        tenantId={tenantId}
        onClose={() => setIsNewBookingOpen(false)}
        onCreated={(result: NewAppointmentResult) => {
          const newRow: AppointmentRow = {
            id: result.id,
            time: result.time,
            customer: result.customer,
            service: result.service,
            staff: result.staff,
            source: result.source,
            status: "Confirmed",
            startsAt: result.startsAt,
          };
          setAppointments((prev) => [newRow, ...prev]);
        }}
        showToast={showToast}
      />

      {/* Walk-in Modal */}
      <WalkInModal
        isOpen={isWalkInOpen}
        tenantId={tenantId}
        onClose={() => setIsWalkInOpen(false)}
        onCreated={(result: WalkInResult) => {
          const newRow: AppointmentRow = {
            id: result.id,
            time: result.time,
            customer: result.customer,
            service: result.service,
            staff: result.staff,
            source: "Walk-In",
            status: "Confirmed",
            startsAt: result.startsAt,
          };
          setAppointments((prev) => [newRow, ...prev]);
        }}
        showToast={showToast}
      />
    </div>
  );
}
