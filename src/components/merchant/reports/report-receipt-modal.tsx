import { useId } from "react";
import type { ReactElement } from "react";
import { Icon } from "@/components/admin/icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatPeso } from "@/lib/payments";
import { dayLabel, taxAmounts } from "./report-data";
import type { TaxClass } from "./report-data";
import { STAFF } from "./report-fixtures";
import type { Receipt } from "./report-fixtures";

export function ReportReceiptModal({ receipt, tax, onClose }: {
  receipt: Receipt;
  tax: TaxClass;
  onClose: () => void;
}): ReactElement {
  const titleId = useId();
  const totals = taxAmounts(receipt.grossCents, tax);
  const details = [
    ["Customer", receipt.customer],
    ["Staff", STAFF[receipt.staff].name],
    ["Service / qty", `${receipt.service.name} × ${receipt.quantity}`],
    ["Payment method", receipt.method],
  ];

  return (
    <Modal open unstyled labelledBy={titleId} onClose={onClose} closeOnBackdrop className="w-[min(38rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-2xl print:hidden">
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="font-display text-[26px] leading-[34px]">Payment receipt</h2>
            <p className="mt-1 text-sm text-muted">Receipt details · Asia/Manila</p>
          </div>
          <Button variant="ghost" className="size-10 shrink-0 p-0" aria-label="Close dialog" onClick={onClose}>
            <Icon name="close" className="size-5 text-glyph" />
          </Button>
        </div>
        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 text-sm sm:px-6">
          <dl className="flex flex-wrap justify-between gap-3 rounded-xl bg-mist p-4">
            <div>
              <dt className="text-xs text-muted">Receipt ref.</dt>
              <dd className="mt-1 break-all font-mono font-semibold">{receipt.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Date / time</dt>
              <dd className="mt-1 font-medium">{dayLabel(receipt.receiptDay)}, 2026 · {receipt.time}</dd>
            </div>
          </dl>
          <dl className="divide-y divide-hairline rounded-xl border border-hairline bg-white px-4">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2.5">
                <dt className="text-muted">{label}</dt>
                <dd className="min-w-0 text-right font-semibold wrap-break-word">{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="space-y-2 rounded-xl border border-hairline bg-mist p-4">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Tax classification</dt>
              <dd className="font-medium">{tax === "vat" ? "VAT (12%)" : "Non-VAT"}</dd>
            </div>
            {tax === "vat" && <div className="flex justify-between gap-3">
              <dt className="text-muted">Net sales</dt><dd className="tabular-nums">{formatPeso(totals.net)}</dd>
            </div>}
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{tax === "vat" ? "12% VAT" : "Recorded tax"}</dt>
              <dd className="tabular-nums">{formatPeso(totals.vat)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-hairline pt-2 font-bold">
              <dt>Gross total</dt><dd className="text-success-deep tabular-nums">{formatPeso(totals.gross)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex justify-end border-t border-hairline px-4 py-4 sm:px-6">
          <Button variant="brand" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
