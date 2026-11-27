import type { ReactElement } from "react";
import { MetricCard } from "@/components/admin/metric-card";
import type { IconName } from "@/components/admin/icon";
import { formatPeso } from "@/lib/payments";
import { money, percentage, rangeLabel } from "./report-data";
import type { DateRange, grossTrend, summarize } from "./report-data";
import type { Outcome } from "./report-fixtures";
import { DailyAppointments, SalesTrend, SourceDonut } from "./report-charts";
import { numeric, ReportCard, ReportTable } from "./report-ui";

export const OUTCOMES = [
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "noShow", label: "No-show" },
] as const satisfies readonly { id: Outcome; label: string }[];

type Summary = ReturnType<typeof summarize>;
type Metric = { label: string; value: string | number; caption: string; icon: IconName };

function Metrics({ metrics }: { metrics: readonly Metric[] }): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4 [&>div]:min-h-0 [&>div]:gap-2 [&>div]:rounded-xl [&>div]:border [&>div]:border-hairline [&>div]:p-3 sm:[&>div]:p-5 [&>div:first-child>p:last-child]:text-on-burnt">
      {metrics.map((metric, index) => <MetricCard key={metric.label} {...metric} featured={index === 0} />)}
    </div>
  );
}

function StaffActivity({ summary }: { summary: Summary }): ReactElement {
  return (
    <div data-detail>
      <ReportCard title="Staff activity summary" description="Appointment outcomes by assigned staff member">
        <div className="mt-4">
          <ReportTable label="Staff activity summary" stack>
            <thead><tr>
              <th scope="col">Staff member</th>
              {OUTCOMES.map(({ id, label }) => <th scope="col" key={id} className={numeric}>{label}</th>)}
            </tr></thead>
            <tbody>
              {summary.staff.map((member) => (
                <tr key={member.id}>
                  <th scope="row" className="font-semibold">{member.name}</th>
                  {OUTCOMES.map(({ id, label }) => <td key={id} data-label={label} className={numeric}>{member.counts[id]}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-mist"><tr>
              <th scope="row">Total</th>
              {OUTCOMES.map(({ id, label }) => <td key={id} data-label={label} className={numeric}>{summary.counts[id]}</td>)}
            </tr></tfoot>
          </ReportTable>
        </div>
      </ReportCard>
    </div>
  );
}

export function OperationalReport({ range, summary }: { range: DateRange; summary: Summary }): ReactElement {
  const { counts, completed, staff } = summary;
  const total = counts.completed + counts.cancelled + counts.noShow;
  return (
    <>
      <Metrics metrics={[
        { label: "Completed appointments", value: counts.completed, caption: "Finished appointments", icon: "calendar" },
        { label: "Total cancellations", value: counts.cancelled, caption: "Cancelled before service", icon: "list" },
        { label: "No-shows", value: counts.noShow, caption: "Customer did not attend", icon: "users" },
        { label: "Active staff", value: staff.filter((member) => member.counts.completed > 0).length, caption: "Staff with completed appointments", icon: "clock" },
      ]} />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.15fr_1fr_0.85fr]">
        <ReportCard title="Appointments by source & day" description={`Completed appointments · ${rangeLabel(range)}`}>
          <DailyAppointments rows={completed} />
        </ReportCard>
        <ReportCard title="Booking source split" description="Share of completed appointments and revenue">
          <SourceDonut rows={completed} />
        </ReportCard>
        <ReportCard title="Appointment outcome breakdown" description={`${total} appointments with a recorded outcome`}>
          <div className="mt-4">
            <ReportTable label="Appointment outcome breakdown">
              <thead><tr><th scope="col">Outcome</th><th scope="col" className={numeric}>Count</th><th scope="col" className={numeric}>Percentage</th></tr></thead>
              <tbody>
                {OUTCOMES.map(({ id, label }) => (
                  <tr key={id}>
                    <th scope="row" className="font-medium">{label}</th>
                    <td className={numeric}>{counts[id]}</td>
                    <td className={numeric}>{percentage(counts[id], total)}</td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
          </div>
        </ReportCard>
      </div>
      <StaffActivity summary={summary} />
    </>
  );
}

function CommissionTable({ summary, sourceLabel }: { summary: Summary; sourceLabel: string }): ReactElement {
  return (
    <div data-detail>
      <ReportCard title="Staff performance & commission" description={sourceLabel}>
        <div className="mt-4">
          <ReportTable label="Staff performance and commission" stack>
            <thead><tr>
              <th scope="col">Staff</th>
              <th scope="col" className={numeric}>Services rendered</th>
              <th scope="col" className={numeric}>Service revenue</th>
              <th scope="col">Commission rule</th>
              <th scope="col" className={numeric}>Earned commission</th>
            </tr></thead>
            <tbody>
              {summary.staff.filter((member) => member.quantity > 0).map((member) => (
                <tr key={member.id}>
                  <th scope="row" className="font-semibold">{member.name}</th>
                  <td data-label="Services rendered" className={numeric}>{member.quantity}</td>
                  <td data-label="Service revenue" className={numeric}>{formatPeso(member.revenue)}</td>
                  <td data-label="Commission rule">{member.rule}</td>
                  <td data-label="Earned commission" className={numeric}>{formatPeso(member.commission)}</td>
                </tr>
              ))}
              {!summary.completed.length && <tr><td colSpan={5}>No services were completed in this period.</td></tr>}
            </tbody>
          </ReportTable>
        </div>
        <p className="mt-4 text-sm text-muted">Fixed and percentage commissions follow the rules configured for each staff member.</p>
      </ReportCard>
    </div>
  );
}

export function BusinessReport({ range, summary, sourceLabel, trend }: {
  range: DateRange; summary: Summary; sourceLabel: string; trend: ReturnType<typeof grossTrend>;
}): ReactElement {
  const { counts, gross, commissions } = summary;
  const total = counts.completed + counts.cancelled + counts.noShow;
  return (
    <>
      <Metrics metrics={[
        { label: "Gross sales", value: money(gross), caption: "Before refunds and deductions", icon: "card" },
        { label: "Completed appointments", value: counts.completed, caption: "In the applied date and source scope", icon: "calendar" },
        { label: "Cancelled / no-shows", value: `${counts.cancelled} / ${counts.noShow}`, caption: `${percentage(counts.cancelled, total)} cancelled · ${percentage(counts.noShow, total)} no-show`, icon: "chart" },
        { label: "Earned commissions", value: money(commissions), caption: "Based on staff rules", icon: "card" },
      ]} />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <ReportCard title="Gross sales trend" description={`${sourceLabel} · Prior months shown in full`}>
          <SalesTrend points={trend} />
        </ReportCard>
        <ReportCard title="Period benchmark" description={sourceLabel}>
          <p className="mt-4 text-[32px] leading-9 font-semibold text-body tabular-nums">{money(gross)}</p>
          <p className="mt-2 text-sm text-muted">Gross sales · {rangeLabel(range)}</p>
          <div className="mt-4 rounded-lg bg-blush p-4 text-sm font-semibold text-body">
            {counts.completed} completed appointments
          </div>
          <p className="mt-4 text-xs text-muted">Reporting timezone · Asia/Manila (UTC+8)</p>
        </ReportCard>
      </div>
      <CommissionTable summary={summary} sourceLabel={sourceLabel} />
    </>
  );
}
