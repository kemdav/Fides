"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  canManageBookings,
  type WorkspaceRole,
} from "@/lib/merchant/workspace-roles";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { MetricCard } from "@/components/admin/metric-card";
import {
  PageContent,
  PageHeading,
  StatusPill,
  Surface,
} from "@/components/admin/primitives";
import { AppointmentDetailsModal } from "./appointment-details-modal";
import {
  NewAppointmentModal,
  type NewAppointmentResult,
} from "@/components/merchant/new-appointment-modal";
import {
  WalkInModal,
  type WalkInResult,
} from "@/components/merchant/walk-in-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { WebsiteSetupPrompt } from "@/components/merchant/onboarding/website-setup/website-setup-prompt";
import type { AppointmentServiceOption, AppointmentStaffOption } from "@/types/appointments";

export interface AppointmentRow {
  id: string;
  time: string;
  customer: string;
  service: string;
  staff: string;
  source: "Online" | "Walk-In" | "Phone";
  status:
    | "Confirmed"
    | "Pending approval"
    | "Check In"
    | "In service"
    | "Completed"
    | "Cancelled";
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
  userRole?: WorkspaceRole;
  tenantId?: string;
  websiteSetupUserId?: string;
  bookingOptions?: { services: AppointmentServiceOption[]; staff: AppointmentStaffOption[] };
  todayCount?: number;
  confirmedCount?: number;
  pendingCount?: number;
  checkedInCount?: number;
  completedVisitsCount?: number;
  revenueTotal?: number;
  revenueChangePercent?: number;
  bookingCount?: number;
  activeCustomerCount?: number;
  commissionThisMonth?: number;
  calendarMonthKey?: string;
  todayKey?: string;
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

function AppointmentStatusPill({
  status,
}: {
  status: AppointmentRow["status"];
}) {
  const toneMap: Record<
    AppointmentRow["status"],
    { tone: React.ComponentProps<typeof StatusPill>["tone"]; label: string }
  > = {
    Confirmed: { tone: "success", label: "Confirmed" },
    "Pending approval": { tone: "warning", label: "Pending approval" },
    "Check In": { tone: "info", label: "Check In" },
    "In service": { tone: "info", label: "In service" },
    Completed: { tone: "neutral", label: "Completed" },
    Cancelled: { tone: "danger", label: "Cancelled" },
  };
  const { tone, label } = toneMap[status] ?? { tone: "neutral", label: status };
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

export function OverviewView({
  businessName = "Bella Vita",
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole,
  tenantId,
  websiteSetupUserId,
  bookingOptions,
  todayCount = 0,
  confirmedCount = 0,
  pendingCount = 0,
  checkedInCount = 0,
  completedVisitsCount = 0,
  revenueTotal = 0,
  revenueChangePercent = 0,
  bookingCount = 0,
  activeCustomerCount = 0,
  commissionThisMonth = 0,
  calendarMonthKey,
  todayKey,
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
  const [appointments, setAppointments] =
    React.useState<AppointmentRow[]>(initialRows);
  const [previousRows, setPreviousRows] = React.useState(initialRows);
  if (previousRows !== initialRows) {
    setPreviousRows(initialRows);
    setAppointments(initialRows);
  }

  const [filterStatus, setFilterStatus] = React.useState("");
  const [filterStaff, setFilterStaff] = React.useState("");
  const [filterSource, setFilterSource] = React.useState("");
  const filterTrigger = React.useRef<HTMLButtonElement>(null);
  const canManage = canManageBookings(userRole);
  const isServiceStaff = userRole === "staff";
  const canViewBusinessMetrics = userRole === "owner" || userRole === "admin";
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [period, setPeriod] = React.useState(initialPeriod);
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = React.useState<
    string | null
  >(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = React.useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [expandedAppointmentId, setExpandedAppointmentId] = React.useState<
    string | null
  >(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = React.useState<
    number | null
  >(null);
  const calendarMonth = calendarMonthKey
    ? new Date(`${calendarMonthKey}-01T12:00:00`)
    : new Date();
  const changeCalendarMonth = (offset: number) => {
    const month = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + offset,
      1,
    );
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    if (key < "1900-01" || key > "9998-12") return;
    setSelectedCalendarDay(null);
    router.push(
      `${basePath}/dashboard?${new URLSearchParams({ period, month: key })}`,
      { scroll: false },
    );
  };
  const displayName = userName || userEmail;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const activeFilterCount = [filterStatus, filterStaff, filterSource].filter(
    Boolean,
  ).length;
  const hasFilters = Boolean(searchQuery || activeFilterCount);
  const staffOptions = [
    ...new Set(appointments.map(({ staff }) => staff)),
  ].sort((a, b) => a.localeCompare(b));
  const filterFields = [
    {
      label: "Status",
      value: filterStatus,
      onChange: setFilterStatus,
      options: [
        "Confirmed",
        "Pending approval",
        "Check In",
        "In service",
        "Completed",
        "Cancelled",
      ],
      placeholder: "All statuses",
    },
    {
      label: "Staff",
      value: filterStaff,
      onChange: setFilterStaff,
      options: staffOptions,
      placeholder: "All staff",
    },
    {
      label: "Source",
      value: filterSource,
      onChange: setFilterSource,
      options: ["Online", "Walk-In", "Phone"],
      placeholder: "All sources",
    },
  ];
  const filtered = appointments.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.staff.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      matchesSearch &&
      (!filterStatus || app.status === filterStatus) &&
      (!filterStaff || app.staff === filterStaff) &&
      (!filterSource || app.source === filterSource)
    );
  });

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
  const maxVal = Math.max(
    1,
    ...stats.map((s) => Math.max(s.booked, s.completed)),
  );
  const lineMaxVal = Math.max(
    1,
    ...stats.map((s) => Math.max(s.booked, s.completed)),
  );
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
      const y = lineTop + chartHeight - (item[key] / niceMax) * chartHeight;
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
    stats
      .map((item, index) => {
        const x =
          stats.length === 1
            ? lineWidth / 2
            : 12 + (index / (stats.length - 1)) * (lineWidth - 24);
        const y =
          lineHeight - 12 - (item[key] / lineMaxVal) * (lineHeight - 24);
        return `${x},${y}`;
      })
      .join(" ");
  const today = todayKey ? new Date(`${todayKey}T12:00:00`) : new Date();
  const currentMonthLabel = calendarMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const calendarDaysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarStartDay = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: calendarStartDay }, () => null),
    ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1),
  ];
  const isCurrentMonth =
    calendarMonth.getFullYear() === today.getFullYear() &&
    calendarMonth.getMonth() === today.getMonth();
  const activeCalendarDay =
    selectedCalendarDay ?? (isCurrentMonth ? today.getDate() : 1);
  const activeCalendarDateKey = `${calendarMonth.getFullYear()}-${String(
    calendarMonth.getMonth() + 1,
  ).padStart(2, "0")}-${String(activeCalendarDay).padStart(2, "0")}`;
  const activeCalendarAppointments = calendarAppointments.filter(
    (appointment) => appointment.calendarDate === activeCalendarDateKey,
  );
  const activeCompletedAppointments = activeCalendarAppointments.filter(
    (appointment) => appointment.status === "Completed",
  );
  const activeCalendarLabel = new Date(
    `${activeCalendarDateKey}T12:00:00`,
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

      <div className="min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            title={`Welcome Back, ${displayName.split(" ")[0] || "Maria"}`}
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
                            router.push(
                              `${basePath}/dashboard?${new URLSearchParams({ period: p, ...(calendarMonthKey && { month: calendarMonthKey }) })}`,
                              { scroll: false },
                            );
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-mist ${period === p ? "text-burnt font-semibold" : "text-body"}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {canManage && (
                  <>
                    <AdminButton
                      variant="primary"
                      size="sm"
                      onClick={() => setIsNewBookingOpen(true)}
                    >
                      + New Booking
                    </AdminButton>
                    <AdminButton
                      variant="outline-accent"
                      size="sm"
                      onClick={() => setIsWalkInOpen(true)}
                    >
                      + Add Walk-in
                    </AdminButton>
                  </>
                )}
              </div>
            }
          />

          {tenantId && websiteSetupUserId && <WebsiteSetupPrompt tenantId={tenantId} userId={websiteSetupUserId} basePath={basePath} />}

          {/* KPI Metric Cards (QA #1: Real loaded counts and amounts) */}
          <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
            <MetricCard
              featured
              label={
                isServiceStaff
                  ? "Commission this month"
                  : canViewBusinessMetrics
                    ? "Total revenue"
                    : "Today’s appointments"
              }
              value={
                isServiceStaff
                  ? commissionThisMonth
                  : canViewBusinessMetrics
                    ? revenueTotal
                    : todayCount
              }
              valuePrefix={isServiceStaff ? "₱" : undefined}
              caption={
                isServiceStaff
                  ? "Earned from completed services"
                  : canViewBusinessMetrics
                    ? `${revenueChangePercent >= 0 ? "+" : ""}${revenueChangePercent.toFixed(1)}% vs previous week`
                    : `${confirmedCount} confirmed today`
              }
              icon="calendar"
              progress={
                isServiceStaff
                  ? commissionThisMonth > 0
                    ? 100
                    : 0
                  : canViewBusinessMetrics
                    ? Math.min(100, Math.max(0, 50 + revenueChangePercent / 2))
                    : todayCount
                      ? (confirmedCount / todayCount) * 100
                      : 0
              }
            />
            <MetricCard
              label="Total bookings"
              value={bookingCount}
              caption={`${todayCount} today · ${confirmedCount} confirmed · ${pendingCount} pending`}
              icon="clock"
              progress={
                bookingCount > 0
                  ? Math.min(
                      100,
                      Math.round((completedVisitsCount / bookingCount) * 100),
                    )
                  : 0
              }
              miniChart
            />
            <MetricCard
              label={
                isServiceStaff
                  ? "Total customers"
                  : canViewBusinessMetrics
                    ? "Active customers"
                    : "Checked-in customers"
              }
              value={
                isServiceStaff || canViewBusinessMetrics
                  ? activeCustomerCount
                  : checkedInCount
              }
              caption={
                isServiceStaff
                  ? "Unique customers in the selected period"
                  : canViewBusinessMetrics
                    ? `${customerGrowthPercent >= 0 ? "+" : ""}${customerGrowthPercent.toFixed(1)}% vs previous week · ${checkedInCount} checked in`
                    : "Checked in or in service today"
              }
              icon="users"
              progress={
                isServiceStaff
                  ? bookingCount
                    ? (activeCustomerCount / bookingCount) * 100
                    : 0
                  : canViewBusinessMetrics
                    ? Math.min(100, Math.max(0, 50 + customerGrowthPercent / 2))
                    : todayCount
                      ? (checkedInCount / todayCount) * 100
                      : 0
              }
            />
            <MetricCard
              label={
                canViewBusinessMetrics
                  ? "Average order value"
                  : "Completed today"
              }
              value={
                canViewBusinessMetrics
                  ? averageOrderValue
                  : completedVisitsCount
              }
              caption={
                canViewBusinessMetrics
                  ? `${completedVisitsCount} completed today`
                  : "Appointments completed today"
              }
              icon={canViewBusinessMetrics ? "card" : "clock"}
              progress={
                canViewBusinessMetrics
                  ? averageOrderValue > 0
                    ? 100
                    : 0
                  : todayCount
                    ? (completedVisitsCount / todayCount) * 100
                    : 0
              }
            />
          </div>

          {/* Middle Section: Appointment statistics & Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Appointment statistics (7 cols) */}
            <Surface className="lg:col-span-7 min-h-[440px] h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="chart" className="size-5 text-glyph" />
                  <h3 className="text-sm font-semibold text-ink tracking-wide">
                    Appointment Statistics
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
                  <div
                    className="relative w-full h-[280px]"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <svg
                      viewBox={`0 0 ${lineWidth} ${lineHeight}`}
                      className="h-[280px] w-full overflow-visible"
                      role="img"
                      aria-label="Daily appointment analytics for this month"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="bookedGrad"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#C35000"
                            stopOpacity="0.18"
                          />
                          <stop
                            offset="100%"
                            stopColor="#C35000"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="completedGrad"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#82AFC2"
                            stopOpacity="0.15"
                          />
                          <stop
                            offset="100%"
                            stopColor="#82AFC2"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>

                      {/* Y-axis gridlines and labels */}
                      {yTicks.map((tick) => {
                        const y =
                          lineTop +
                          chartHeight -
                          (tick / niceMax) * chartHeight;
                        return (
                          <g key={tick}>
                            <line
                              x1={lineLeft}
                              x2={lineWidth - lineRight}
                              y1={y}
                              y2={y}
                              stroke="#EDECE8"
                              strokeWidth="1"
                            />
                            <text
                              x={lineLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-subtle text-[11px] font-medium"
                            >
                              {tick}
                            </text>
                          </g>
                        );
                      })}

                      {/* Today vertical indicator */}
                      {(() => {
                        const todayIndex = stats.findIndex(
                          (s) => Number(s.day) === today.getDate(),
                        );
                        if (todayIndex < 0) return null;
                        const todayX =
                          stats.length === 1
                            ? lineLeft + chartWidth / 2
                            : lineLeft +
                              (todayIndex / (stats.length - 1)) * chartWidth;
                        return (
                          <line
                            x1={todayX}
                            x2={todayX}
                            y1={lineTop}
                            y2={lineTop + chartHeight}
                            stroke="#C35000"
                            strokeWidth="1"
                            strokeDasharray="4 3"
                            opacity="0.35"
                          />
                        );
                      })()}

                      {/* Gradient area fills */}
                      <path
                        d={areaPath(linePointCoords("booked"))}
                        fill="url(#bookedGrad)"
                      />
                      <path
                        d={areaPath(linePointCoords("completed"))}
                        fill="url(#completedGrad)"
                      />

                      {/* Smooth curve lines */}
                      <path
                        d={smoothPath(linePointCoords("booked"))}
                        fill="none"
                        stroke="#C35000"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={smoothPath(linePointCoords("completed"))}
                        fill="none"
                        stroke="#82AFC2"
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
                          fill="#C35000"
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
                          fill="#82AFC2"
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
                            : lineLeft +
                              (index / (stats.length - 1)) * chartWidth;
                        const isToday = Number(item.day) === today.getDate();
                        // Show every other day, plus first, last, and today
                        const showLabel =
                          index === 0 ||
                          index === stats.length - 1 ||
                          isToday ||
                          index % 2 === 0;
                        return showLabel ? (
                          <g key={item.day}>
                            <text
                              x={x}
                              y={lineHeight - 14}
                              textAnchor="middle"
                              className={`text-[11px] font-medium ${isToday ? "fill-burnt" : "fill-subtle"}`}
                            >
                              {item.day}
                            </text>
                            {isToday && (
                              <text
                                x={x}
                                y={lineHeight - 2}
                                textAnchor="middle"
                                className="fill-burnt text-[10px] font-semibold"
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
                        const sliceWidth =
                          stats.length === 1
                            ? chartWidth
                            : chartWidth / (stats.length - 1);
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
                                  linePointCoords("completed")[index].y,
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
                          <span className="font-semibold text-ink">
                            {hoveredPoint.booked}
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="inline-block size-2 rounded-full bg-sky" />
                          <span className="text-muted">Completed:</span>{" "}
                          <span className="font-semibold text-ink">
                            {hoveredPoint.completed}
                          </span>
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
                            style={{
                              height: `${item.booked > 0 ? (item.booked / maxVal) * 100 : 4}%`,
                            }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-subtle">
                              {item.booked}
                            </span>
                          </div>
                          <div
                            className="w-4 bg-sky rounded-t-sm transition-all duration-300 relative min-h-[4px] sm:w-7"
                            style={{
                              height: `${item.completed > 0 ? (item.completed / maxVal) * 100 : 4}%`,
                            }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-subtle">
                              {item.completed}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-medium sm:text-sm ${item.isToday ? "rounded-full bg-burnt px-2 text-white" : "text-muted"}`}
                        >
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
                  <h3 className="text-sm font-semibold text-ink tracking-wide">
                    Calendar
                  </h3>
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
                      onClick={() => changeCalendarMonth(-1)}
                      className="flex size-8 items-center justify-center rounded-md text-2xl leading-none text-glyph hover:bg-mist hover:text-ink"
                    >
                      ‹
                    </button>
                    <span className="font-semibold">{currentMonthLabel}</span>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() => changeCalendarMonth(1)}
                      className="flex size-8 items-center justify-center rounded-md text-2xl leading-none text-glyph hover:bg-mist hover:text-ink"
                    >
                      ›
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-subtle mb-2">
                    <span>S</span>
                    <span>M</span>
                    <span>T</span>
                    <span>W</span>
                    <span>T</span>
                    <span>F</span>
                    <span>S</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-body">
                    {calendarCells.map((day, index) => (
                      <button
                        type="button"
                        key={`${day ?? "empty"}-${index}`}
                        disabled={day === null}
                        onClick={() =>
                          day !== null && setSelectedCalendarDay(day)
                        }
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
                        <div
                          key={appointment.id}
                          className="flex items-start gap-1.5"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              appointment.status === "Completed"
                                ? "bg-sky"
                                : "bg-burnt"
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
                    completed appointment
                    {activeCompletedAppointments.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </Surface>
          </div>

          {/* Bottom Section: Today's Appointments Table */}
          <Surface className="!p-0">
            {/* Card Controls */}
            <div className="p-4 sm:p-6 border-b border-hairline flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="users" className="size-5 text-glyph" />
                  <h3 className="text-base font-semibold leading-6 text-ink">
                    Today&apos;s Appointments
                  </h3>
                </div>
                <span className="inline-flex items-center rounded-md bg-mist px-2 py-1 text-xs font-semibold leading-[18px] text-ink">
                  {appointments.length} appointments
                </span>
              </div>

              <div className="flex w-full items-center gap-2.5 sm:w-auto">
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    aria-label="Search customer or service"
                    placeholder="Search customer or service"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-lg border border-hairline bg-white pl-10 pr-3 text-sm text-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-burnt/40 sm:w-64"
                  />
                  <Icon
                    name="search"
                    className="size-4 text-glyph absolute left-3 top-3 pointer-events-none"
                  />
                </div>

                <div
                  className="relative shrink-0"
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && isFilterOpen) {
                      setIsFilterOpen(false);
                      filterTrigger.current?.focus();
                    }
                  }}
                >
                  <button
                    ref={filterTrigger}
                    type="button"
                    aria-expanded={isFilterOpen}
                    aria-controls="overview-appointment-filters"
                    aria-label={
                      activeFilterCount
                        ? `Filter, ${activeFilterCount} active`
                        : "Filter"
                    }
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="h-11 rounded-lg border border-hairline bg-white px-3 text-sm font-semibold text-ink hover:bg-mist flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
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
                    <span className="relative">
                      Filter
                      {activeFilterCount > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-1.5 top-0 size-1.5 rounded-full bg-burnt"
                        />
                      )}
                    </span>
                    <Icon
                      name="chevron-down"
                      className={`size-3.5 text-glyph transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isFilterOpen && (
                    <div
                      id="overview-appointment-filters"
                      className="absolute right-0 z-20 mt-1 w-56 divide-y divide-hairline overflow-hidden rounded-[10px] border border-hairline bg-white text-sm shadow-lg"
                    >
                      {filterFields.map(
                        ({ label, value, onChange, options, placeholder }) => (
                          <details
                            key={label}
                            name="overview-filter-section"
                            className="group"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-subtle hover:bg-mist [&::-webkit-details-marker]:hidden">
                              <span className="flex items-center gap-2">
                                {label}
                                {value && (
                                  <span
                                    aria-label="Filter active"
                                    className="size-1.5 rounded-full bg-burnt"
                                  />
                                )}
                              </span>
                              <span
                                aria-hidden="true"
                                className="group-open:hidden"
                              >
                                +
                              </span>
                              <span
                                aria-hidden="true"
                                className="hidden group-open:inline"
                              >
                                −
                              </span>
                            </summary>
                            <div className="max-h-48 overflow-y-auto pb-2">
                              {[
                                "",
                                ...(value && !options.includes(value)
                                  ? [value]
                                  : []),
                                ...options,
                              ].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  aria-pressed={value === option}
                                  onClick={() => onChange(option)}
                                  className={`w-full break-words px-4 py-2 text-left hover:bg-mist ${value === option ? "font-semibold text-burnt" : "text-body"}`}
                                >
                                  {option || placeholder}
                                </button>
                              ))}
                            </div>
                          </details>
                        ),
                      )}
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-burnt hover:bg-mist"
                          onClick={() => {
                            setFilterStatus("");
                            setFilterStaff("");
                            setFilterSource("");
                            filterTrigger.current?.focus();
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile appointment cards */}
            <div className="md:hidden divide-y divide-hairline">
              {filtered.length === 0 ? (
                <EmptyState
                  compact
                  title={
                    hasFilters
                      ? "No appointments match your search."
                      : "No appointments scheduled."
                  }
                  description={
                    hasFilters
                      ? "Try a different name, service, staff member, or status."
                      : "New bookings will appear here automatically."
                  }
                />
              ) : (
                filtered.map((row) => {
                  const isExpanded = expandedAppointmentId === row.id;
                  return (
                    <div key={row.id} className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedAppointmentId(isExpanded ? null : row.id)
                        }
                        className="w-full text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">
                              {row.customer}
                            </p>
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
                            <span>
                              Staff{" "}
                              <strong className="block text-ink">
                                {row.staff}
                              </strong>
                            </span>
                            <span>
                              Source{" "}
                              <strong className="block text-ink">
                                {row.source}
                              </strong>
                            </span>
                          </div>
                          {canManage && (
                            <AdminButton
                              size="xs"
                              variant="outline"
                              aria-haspopup="dialog"
                              onClick={() => setSelectedAppointmentId(row.id)}
                            >
                              Appointment details
                            </AdminButton>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table (QA #1: Empty state row when 0 appointments) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                  <col className="w-[12%]" />
                  <col className={canManage ? "w-32" : "w-[15%]"} />
                  {canManage && <col />}
                </colgroup>
                <thead className="bg-mist border-b border-hairline text-subtle font-semibold">
                  <tr>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">
                      Time
                    </th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">
                      Service
                    </th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">
                      Staff
                    </th>
                    <th className="px-6 py-4 text-[11px] leading-4 uppercase tracking-wide">
                      Source
                    </th>
                    <th className="py-4 pl-6 pr-2 text-[11px] leading-4 uppercase tracking-wide">
                      Status
                    </th>
                    {canManage && (
                      <th className="px-2 py-4 text-center text-[11px] leading-4 uppercase tracking-wide">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 7 : 6} className="px-5 py-2">
                        <EmptyState
                          compact
                          title={
                            hasFilters
                              ? "No appointments match your search."
                              : "No appointments scheduled."
                          }
                          description={
                            hasFilters
                              ? "Try a different name, service, staff member, or status."
                              : "New bookings will appear here automatically."
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-mist transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-body">
                          {row.time}
                        </td>
                        <td className="px-6 py-4 font-semibold text-ink">
                          {row.customer}
                        </td>
                        <td className="px-6 py-4 text-muted">{row.service}</td>
                        <td className="px-6 py-4 text-muted">{row.staff}</td>
                        <td className="px-6 py-4">
                          <span
                            className={
                              row.source === "Walk-In"
                                ? "text-burnt font-medium"
                                : "text-muted"
                            }
                          >
                            {row.source}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-4 pl-6 pr-2">
                          <AppointmentStatusPill status={row.status} />
                        </td>
                        {canManage && (
                          <td className="px-2 py-4 align-middle">
                            <button
                              type="button"
                              aria-label={`Appointment details for ${row.customer}`}
                              aria-haspopup="dialog"
                              onClick={() => setSelectedAppointmentId(row.id)}
                              className="mx-auto flex h-9 w-10 items-center justify-center rounded-lg transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 text-glyph"
                            >
                              <Icon
                                name="more"
                                weight="fill"
                                className="size-5"
                              />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 sm:p-6 border-t border-hairline flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Showing {filtered.length} of {appointments.length} appointments
                · All times in Asia/Manila (UTC+8)
              </span>
              <Link
                href={`${basePath}/dashboard/appointments`}
                className="text-burnt font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>View All Appointments</span>
                <span>→</span>
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
      {canManage && tenantId && selectedAppointmentId && (
        <AppointmentDetailsModal
          key={selectedAppointmentId}
          tenantId={tenantId}
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
          onUpdated={() => router.refresh()}
        />
      )}

      {/* New Appointment Modal (QA #4) */}
      <NewAppointmentModal
        isOpen={isNewBookingOpen}
        tenantId={tenantId}
        services={bookingOptions?.services}
        staff={bookingOptions?.staff}
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
