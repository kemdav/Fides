import type { ReactElement } from "react";
import { Icon } from "@/components/admin/icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayLabel, decimalMoney, ledgerDay, ledgerTotals, taxAmounts } from "./report-data";
import type { BookType, TaxClass } from "./report-data";
import type { Receipt } from "./report-fixtures";
import { numeric, ReportTable } from "./report-ui";

export type LedgerSort = "newest" | "oldest";
export const PAGE_SIZE = 4;

const baseHeaders = ["Date / time", "Customer", "Receipt ref.", "Service / qty", "Method"];
const grossColumn = "Gross (PHP)";
const vatHeaders = ["Net Sales (PHP)", "12% VAT (PHP)", grossColumn];
const nonVatHeaders = [grossColumn, "Tax"];

function receiptCells(row: Receipt, book: BookType): string[] {
  return [`${dayLabel(ledgerDay(row, book))} · ${row.time}`, row.customer, row.id, `${row.service.name} × ${row.quantity}`, row.method];
}

export function ledgerCsvRows(rows: readonly Receipt[], book: BookType, tax: TaxClass): (string | number)[][] {
  return [
    [...baseHeaders, ...(tax === "vat" ? vatHeaders : nonVatHeaders)],
    ...rows.map((row) => {
      const { net, vat, gross } = taxAmounts(row.grossCents, tax);
      const details = receiptCells(row, book);
      return tax === "vat" ? [...details, (net / 100).toFixed(2), (vat / 100).toFixed(2), (gross / 100).toFixed(2)] : [...details, (gross / 100).toFixed(2), "Non-VAT"];
    }),
  ];
}

export function BirLedgerTable({ rows, page, book, tax, sort, onSort, onReceipt }: {
  rows: readonly Receipt[];
  page: number;
  book: BookType;
  tax: TaxClass;
  sort: LedgerSort;
  onSort: () => void;
  onReceipt: (row: Receipt, trigger: HTMLButtonElement) => void;
}): ReactElement {
  const isVat = tax === "vat";
  const taxHeaders = isVat ? vatHeaders : nonVatHeaders;
  const totals = ledgerTotals(rows, tax);
  const pageStart = (page - 1) * PAGE_SIZE;
  return (
    <div className="mt-4">
      <Button variant="ghost" className="mb-2 min-[54rem]:hidden print:hidden" onClick={onSort}>
        {sort === "newest" ? "Newest first" : "Oldest first"}
        <Icon name="chevron-down" className={cn("size-4", sort === "oldest" && "rotate-180")} />
      </Button>
      <ReportTable label={book === "sales" ? "Sales Journal ledger" : "Cash Receipts Book ledger"} stack>
        <thead><tr>
          <th scope="col" aria-sort={sort === "newest" ? "descending" : "ascending"}>
            <span className="hidden max-[53.99rem]:inline print:hidden">Date / time</span>
            <button type="button" className="flex min-h-10 items-center gap-1 text-left focus-visible:outline-2 focus-visible:outline-burnt max-[53.99rem]:hidden" onClick={onSort}>
              Date / time <Icon name="chevron-down" className={cn("size-3.5 print:hidden", sort === "oldest" && "rotate-180")} />
            </button>
          </th>
          {baseHeaders.slice(1).map((header) => <th scope="col" key={header}>{header}</th>)}
          {taxHeaders.map((header) => <th scope="col" key={header} className={numeric}>{header}</th>)}
          <th scope="col" className="text-center" data-action>Action</th>
        </tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const { net, vat, gross } = taxAmounts(row.grossCents, tax);
            const cells = receiptCells(row, book);
            const taxCells = isVat ? [decimalMoney(net), decimalMoney(vat), decimalMoney(gross)] : [decimalMoney(gross), "Non-VAT"];
            const visible = index >= pageStart && index < pageStart + PAGE_SIZE;
            return (
              <tr key={row.id} data-page-hidden={visible ? undefined : true} className={cn("hover:bg-mist", !visible && "hidden print:table-row")}>
                {cells.map((cell, cellIndex) => (
                  <td key={baseHeaders[cellIndex]} data-label={baseHeaders[cellIndex]} className={cellIndex === 2 ? "font-mono text-xs" : undefined}>{cell}</td>
                ))}
                {taxCells.map((cell, cellIndex) => <td key={taxHeaders[cellIndex]} data-label={taxHeaders[cellIndex]} className={numeric}>{cell}</td>)}
                <td data-label="Action" className="text-center" data-action>
                  {visible && <Button variant="ghost" aria-label={`View receipt ${row.id}`} className="size-10 rounded-lg p-0 text-glyph" onClick={(event) => onReceipt(row, event.currentTarget)}>
                    <Icon name="eye" className="size-5" />
                  </Button>}
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={baseHeaders.length + taxHeaders.length + 1}>No receipts match the selected filters.</td></tr>}
        </tbody>
        <tfoot className="bg-info-bg"><tr>
          <th scope="row" colSpan={baseHeaders.length}>Period Total</th>
          {(isVat ? [totals.net, totals.vat, totals.gross] : [totals.gross, totals.vat]).map((value, index) =>
            <td key={taxHeaders[index]} data-label={taxHeaders[index]} className={numeric}>{decimalMoney(value)}</td>,
          )}
          <td data-action className="max-[53.99rem]:hidden" />
        </tr></tfoot>
      </ReportTable>
    </div>
  );
}
