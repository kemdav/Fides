"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactElement } from "react";
import Link from "next/link";
import { Icon } from "@/components/admin/icon";
import { PageContent, PageHeading, StatusPill } from "@/components/admin/primitives";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, inputClasses } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/utils";
import { decimalMoney, inRange, ledgerDay, ledgerTotals, QUARTERS } from "./report-data";
import type { BookType, Quarter, TaxClass } from "./report-data";
import { CATEGORIES, METHODS, RECEIPTS } from "./report-fixtures";
import type { Receipt } from "./report-fixtures";
import { BirLedgerTable, ledgerCsvRows, PAGE_SIZE } from "./bir-ledger-table";
import type { LedgerSort } from "./bir-ledger-table";
import { exportRows } from "./report-export";
import { ExportConfirmation } from "./report-export-dialog";
import { FilterPopover, ReportCard, ReportTable, SegmentedControl, fieldLabel, numeric } from "./report-ui";
import { ReportReceiptModal } from "./report-receipt-modal";
import styles from "./reports.module.css";

const books = [{ value: "sales", label: "Sales Journal" }, { value: "cash", label: "Cash Receipts Book" }] as const;
const taxes = [{ value: "nonVat", label: "Non-VAT" }, { value: "vat", label: "VAT (12%)" }] as const;
const periods = QUARTERS.map(({ id }) => ({ value: id, label: `${id} 2026` }));
const methods = [{ value: "all", label: "All methods" } as const, ...METHODS.map((value) => ({ value, label: value }))];
const categories = [{ value: "all", label: "All categories" } as const, ...CATEGORIES.map((value) => ({ value, label: value }))];
type Method = (typeof methods)[number]["value"];
type Category = (typeof categories)[number]["value"];

function QuarterlyConsolidation({ book, tax, period, onSelect }: {
  book: BookType;
  tax: TaxClass;
  period: Quarter;
  onSelect: (quarter: Quarter) => void;
}): ReactElement {
  return (
    <ReportCard title="Quarterly Consolidation">
      <div className="mt-4">
        <ReportTable label="Quarterly Consolidation" stack>
          <thead><tr>
            <th scope="col">Quarter</th>
            <th scope="col" className={numeric}>Gross sales (PHP)</th>
            <th scope="col" className={numeric}>Recorded tax (PHP)</th>
            <th scope="col" className={numeric}>Records</th>
            <th scope="col" className="text-right">Status</th>
          </tr></thead>
          <tbody>
            {QUARTERS.map((quarter) => {
              const rows = RECEIPTS.filter((row) => inRange(ledgerDay(row, book), quarter));
              const totals = ledgerTotals(rows, tax);
              return (
                <tr key={quarter.id} className={cn("relative hover:bg-mist", quarter.id === period && "bg-info-bg")}>
                  <th scope="row">
                    <Button variant="ghost" aria-pressed={quarter.id === period} className="h-auto min-h-10 px-0 text-left font-semibold whitespace-normal hover:bg-transparent after:absolute after:inset-0 after:cursor-pointer" onClick={() => onSelect(quarter.id)}>
                      {quarter.label}
                    </Button>
                  </th>
                  <td className={numeric} data-label="Gross sales (PHP)">{decimalMoney(totals.gross)}</td>
                  <td className={numeric} data-label="Recorded tax (PHP)">{decimalMoney(totals.vat)}</td>
                  <td className={numeric} data-label="Records">{rows.length}</td>
                  <td className="text-right" data-label="Status">
                    <StatusPill tone={quarter.id === "Q4" ? "warning" : "success"} className="rounded-full">
                      {quarter.id === "Q4" ? "In progress" : "Closed period"}
                    </StatusPill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ReportTable>
      </div>
    </ReportCard>
  );
}

export function BirReportView({ slug }: { slug: string }): ReactElement {
  const [book, setBook] = useState<BookType>("sales");
  const [period, setPeriod] = useState<Quarter>("Q4");
  const [tax, setTax] = useState<TaxClass>("nonVat");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<Method>("all");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<LedgerSort>("newest");
  const [page, setPage] = useState(1);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const receiptTrigger = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const bookId = useId();
  const periodId = useId();
  const methodId = useId();
  const categoryId = useId();
  const reportPath = `/${encodeURIComponent(slug)}/dashboard/reports`;
  const quarter = QUARTERS.find(({ id }) => id === period) ?? QUARTERS[3];
  const bookLabel = book === "sales" ? "Sales Journal" : "Cash Receipts Book";
  const query = search.trim().toLowerCase();
  const rows = RECEIPTS.filter((row) =>
    inRange(ledgerDay(row, book), quarter) &&
    (method === "all" || row.method === method) &&
    (category === "all" || row.service.category === category) &&
    (row.customer.toLowerCase().includes(query) || row.id.toLowerCase().includes(query)),
  ).sort((left, right) => {
    const comparison = ledgerDay(left, book).localeCompare(ledgerDay(right, book)) || left.time.localeCompare(right.time) || left.id.localeCompare(right.id);
    return sort === "newest" ? -comparison : comparison;
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(page * PAGE_SIZE, rows.length);
  const recordCount = rows.length ? `Showing ${start + 1}–${end} of ${rows.length} records` : "Showing 0 records";

  useEffect(() => {
    if (!receipt) receiptTrigger.current?.focus();
  }, [receipt]);

  function selectPeriod(value: Quarter): void {
    setPeriod(value);
    setPage(1);
  }

  function exportCsv(): void {
    exportRows(`${book === "sales" ? "sales-journal" : "cash-receipts-book"}-${period}-2026-page-${page}.csv`, ledgerCsvRows(rows.slice(start, end), book, tax));
    setConfirmation("CSV export prepared");
  }

  return (
    <div className={styles.ledgerPrint}>
      <PageContent>
        <Link href={`${reportPath}?view=business`} className={buttonClasses({ variant: "ghost", className: "w-fit text-burnt print:hidden" })}>
          <Icon name="arrow-left" className="size-4" /> Back to Reports
        </Link>
        <PageHeading
          title="BIR Report View"
          description="Review sales records and prepare a columnar export for internal filing."
          actions={
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" className="rounded-lg border-hairline bg-white" disabled={!rows.length} onClick={exportCsv}>Export CSV</Button>
              <Button variant="brand" className="rounded-lg" onClick={() => {
                window.print();
                setConfirmation("Printable column sheet prepared");
              }}>Print / PDF</Button>
            </div>
          }
        />
        <div className="rounded-xl border border-info/10 bg-info-bg p-4 text-sm leading-relaxed text-info sm:p-5">
          <Icon name="alert" className="mr-2 inline size-5 align-text-bottom" />
          <strong>BIR compliance notice:</strong>{" "}Fides is an operational management and record consolidation tool. Generated books and quarterly tax summaries are provided for internal reference and filing preparation only. Fides does not transmit electronic returns directly to the Bureau of Internal Revenue.
        </div>
        <ReportCard title={bookLabel}>
          <div className="mt-4 grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap">
            <div className="min-w-0 xl:w-46 print:hidden">
              <label htmlFor={bookId} className={fieldLabel}>Book type</label>
              <SelectField id={bookId} compact value={book} options={books} onChange={(value) => { setBook(value); setPage(1); }} />
            </div>
            <div className="min-w-0 xl:w-32 print:hidden">
              <label htmlFor={periodId} className={fieldLabel}>Period</label>
              <SelectField id={periodId} compact value={period} options={periods} onChange={selectPeriod} />
            </div>
            <div className="min-w-0 print:hidden">
              <span className={fieldLabel}>Tax classification</span>
              <SegmentedControl label="Tax classification" options={taxes} value={tax} onChange={(value) => { setTax(value); setPage(1); }} />
            </div>
            <div className="relative min-w-0 flex-1 xl:min-w-56 print:hidden">
              <Icon name="search" className="pointer-events-none absolute left-3 top-3.5 size-4 text-glyph" />
              <Input unstyled type="search" aria-label="Search customer or receipt" placeholder="Search customer or receipt..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className={cn(inputClasses(), "h-11 border-hairline pl-9 font-normal placeholder:font-normal")} />
            </div>
            <div className="min-w-0 xl:w-32 print:hidden">
              <FilterPopover label="Filters" filterIcon active={method !== "all" || category !== "all"}>
                {(close) => (
                  <div className="grid gap-3">
                    <div>
                      <label htmlFor={methodId} className={fieldLabel}>Payment Method</label>
                      <SelectField id={methodId} compact options={methods} value={method} onChange={(value) => { setMethod(value); setPage(1); }} />
                    </div>
                    <div>
                      <label htmlFor={categoryId} className={fieldLabel}>Service Category</label>
                      <SelectField id={categoryId} compact options={categories} value={category} onChange={(value) => { setCategory(value); setPage(1); }} />
                    </div>
                    <Button variant="outline" onClick={() => {
                      setMethod("all"); setCategory("all"); setPage(1); close();
                    }}>Reset filters</Button>
                  </div>
                )}
              </FilterPopover>
            </div>
            <p className="hidden text-sm print:block">{period} 2026 · {tax === "vat" ? "VAT (12%)" : "Non-VAT"} · Asia/Manila</p>
          </div>
          <BirLedgerTable rows={rows} page={page} book={book} tax={tax} sort={sort} onSort={() => {
            setSort(sort === "newest" ? "oldest" : "newest"); setPage(1);
          }} onReceipt={(record, trigger) => {
            receiptTrigger.current = trigger;
            setReceipt(record);
          }} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted print:hidden">
            <p role="status">{recordCount}</p>
            <div aria-label="Ledger pagination" className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="border-hairline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs tabular-nums sm:text-sm">Page {page} of {pageCount}</span>
              <Button variant="outline" className="border-hairline" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
                Next <Icon name="arrow-right" className="size-3.5" />
              </Button>
            </div>
          </div>
        </ReportCard>
        <QuarterlyConsolidation book={book} tax={tax} period={period} onSelect={(value) => {
          selectPeriod(value);
          document.getElementById(periodId)?.focus();
        }} />
        {receipt && <ReportReceiptModal receipt={receipt} tax={tax} onClose={() => setReceipt(null)} />}
        {confirmation && <ExportConfirmation title={confirmation} onClose={() => setConfirmation("")} />}
      </PageContent>
    </div>
  );
}
