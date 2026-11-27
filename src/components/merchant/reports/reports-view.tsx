"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { PageContent, PageHeading } from "@/components/admin/primitives";
import { Button, buttonClasses } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/utils";
import { BUSINESS_RANGE, OPERATIONAL_RANGE, filterAppointments, grossTrend, rangeLabel, sourceSplit, summarize } from "./report-data";
import type { DateRange, SourceFilter } from "./report-data";
import { SOURCE_LABELS } from "./report-fixtures";
import { exportRows } from "./report-export";
import type { CsvRow } from "./report-export";
import { BusinessReport, OperationalReport, OUTCOMES } from "./report-panels";
import { DateRangeFilter, SegmentedControl, fieldLabel } from "./report-ui";
import { ExportConfirmation, ReportExportDialog } from "./report-export-dialog";
import type { ExportFormat, ExportSection } from "./report-export-dialog";
import styles from "./reports.module.css";

const modes = [{ value: "operational", label: "Operational Reports" }, { value: "business", label: "Business Reports" }] as const;
const sources = [
  { value: "all", label: "All sources" },
  { value: "online", label: SOURCE_LABELS.online },
  { value: "walkIn", label: SOURCE_LABELS.walkIn },
  { value: "phone", label: SOURCE_LABELS.phone },
] as const;

type Mode = (typeof modes)[number]["value"];

function reportRows(mode: Mode, range: DateRange, source: SourceFilter, section: ExportSection): CsvRow[] {
  const result = summarize(filterAppointments(range, source));
  const rows: CsvRow[] = [
    [mode === "business" ? "Business Report" : "Operational Report"],
    ["Start date", range.start, "End date", range.end, "Timezone", "Asia/Manila"],
    ["Booking source", source === "all" ? "All sources" : SOURCE_LABELS[source]],
    [],
    ["Outcome", "Count"],
    ...OUTCOMES.map(({ id, label }) => [label, result.counts[id]]),
  ];
  if (mode === "business") {
    rows.push(["Gross sales (PHP)", result.gross / 100], ["Earned commissions (PHP)", result.commissions / 100]);
    rows.push([], ["Month", "Gross sales (PHP)"], ...grossTrend(range, source).map((point) => [point.key.slice(0, 7), point.gross / 100]));
    if (section === "all") {
      rows.push([], ["Staff", "Services rendered", "Service revenue (PHP)", "Commission rule", "Earned commission (PHP)"]);
      rows.push(...result.staff.filter((member) => member.quantity > 0).map((member) => [member.name, member.quantity, member.revenue / 100, member.rule, member.commission / 100]));
    }
  } else {
    rows.push(["Active staff", result.staff.filter((member) => member.counts.completed > 0).length]);
    rows.push([], ["Booking source", "Completed", "Gross (PHP)"], ...sourceSplit(result.completed).map(({ source: item, count, gross }) => [item.split, count, gross / 100]));
    const days = [...new Set(result.completed.map((row) => row.day))].sort();
    rows.push([], ["Date", "Online", "Walk-in", "Phone", "Total"]);
    rows.push(...days.map((day) => {
      const matching = result.completed.filter((row) => row.day === day);
      return [day, ...sourceSplit(matching).map(({ count }) => count), matching.length];
    }));
    if (section === "all") {
      rows.push([], ["Staff member", "Completed", "Cancelled", "No-show"]);
      rows.push(...result.staff.map(({ name, counts }) => [name, counts.completed, counts.cancelled, counts.noShow]));
      rows.push(["Total", result.counts.completed, result.counts.cancelled, result.counts.noShow]);
    }
  }
  return rows;
}

export function ReportsView({ slug, initialMode }: { slug: string; initialMode: Mode }): ReactElement {
  const [mode, setMode] = useState(initialMode);
  const [operationalRange, setOperationalRange] = useState(OPERATIONAL_RANGE);
  const [draftRange, setDraftRange] = useState(BUSINESS_RANGE);
  const [draftSource, setDraftSource] = useState<SourceFilter>("all");
  const [applied, setApplied] = useState<{ range: DateRange; source: SourceFilter }>({ range: BUSINESS_RANGE, source: "all" });
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [summaryOnly, setSummaryOnly] = useState(false);
  const business = mode === "business";
  const range = business ? applied.range : operationalRange;
  const source = business ? applied.source : "all";
  const sourceLabel = source === "all" ? "All sources" : SOURCE_LABELS[source];
  const summary = summarize(filterAppointments(range, source));
  const reportsPath = `/${encodeURIComponent(slug)}/dashboard/reports`;
  const scope = `${rangeLabel(range)} · ${sourceLabel}`;

  function runExport(format: ExportFormat, section: ExportSection): void {
    if (format === "csv") {
      exportRows(`${mode}-report-${range.start}-${range.end}.csv`, reportRows(mode, range, source, section));
      setExportOpen(false);
    } else {
      flushSync(() => {
        setExportOpen(false);
        setSummaryOnly(section === "summary");
      });
      try {
        window.print();
      } finally {
        setSummaryOnly(false);
      }
    }
    setConfirmation("Report export prepared");
  }

  return (
    <div className={cn(summaryOnly && styles.summaryOnly)}>
      <PageContent>
        <PageHeading
          title="Reports"
          description="Sales, appointment outcomes and staff commissions · Asia/Manila"
          actions={<Button variant="outline" className="rounded-lg border-line bg-white" onClick={() => setExportOpen(true)}>Export report</Button>}
        />
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <SegmentedControl label="Report type" options={modes} value={mode} onChange={setMode} />
          {business ? (
            <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:w-auto xl:flex xl:flex-wrap xl:items-end">
              <div className="col-span-2 min-w-0 sm:col-span-1 xl:w-45"><DateRangeFilter key="business" value={draftRange} onChange={setDraftRange} /></div>
              <div className="col-span-2 min-w-0 sm:col-span-1 xl:w-48">
                <label htmlFor="report-booking-source" className={fieldLabel}>Booking source</label>
                <SelectField id="report-booking-source" options={sources} value={draftSource} onChange={setDraftSource} compact />
              </div>
              <Button variant="outline" className="h-11 self-end rounded-lg border-hairline bg-white px-2 sm:px-4" onClick={() => setApplied({ range: draftRange, source: draftSource })}>Apply filters</Button>
              <Link href={`${reportsPath}/bir`} className={buttonClasses({ variant: "brand", className: "h-11 self-end rounded-lg px-2 sm:px-4" })}>BIR Sales Journal</Link>
            </div>
          ) : (
            <div className="w-full sm:w-48"><DateRangeFilter key="operational" placement="end" value={operationalRange} onChange={setOperationalRange} /></div>
          )}
        </div>
        <p className="hidden text-sm print:block">{business ? "Business Reports" : "Operational Reports"} · {scope}</p>

        {business ? <BusinessReport range={range} summary={summary} sourceLabel={sourceLabel} trend={grossTrend(range, source)} /> : <OperationalReport range={range} summary={summary} />}
      </PageContent>
      {exportOpen && <ReportExportDialog mode={business ? "Business" : "Operational"} scope={scope} onClose={() => setExportOpen(false)} onExport={runExport} />}
      {confirmation && <ExportConfirmation title={confirmation} onClose={() => setConfirmation("")} />}
    </div>
  );
}
