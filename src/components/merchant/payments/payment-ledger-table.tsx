import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPeso } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { PaymentRecordDTO, UnsettledAppointmentDTO } from "@/types/payments";
import { StatusBadge } from "./payment-modals";

const historyColumns = ["Method", "Reference", "Recorded by", "Amount"];
const unsettledColumns = ["Staff", "Total", "Paid", "Balance"];

type LedgerDetail = { value: string; numeric?: boolean; className?: string; onClick?: () => void };

type LedgerProps =
  | {
      tab: "history";
      records: PaymentRecordDTO[];
      renderActions: (record: PaymentRecordDTO) => React.ReactNode;
      onViewReceipt: (record: PaymentRecordDTO) => void;
    }
  | {
      tab: "unsettled";
      records: UnsettledAppointmentDTO[];
      renderActions: (record: UnsettledAppointmentDTO) => React.ReactNode;
    };

export function PaymentLedgerTable({
  ledger,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  ledger: LedgerProps;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
}) {
  const columns = ledger.tab === "history" ? historyColumns : unsettledColumns;
  const rows = ledger.tab === "history"
    ? ledger.records.map((record) => ({
        id: record.id,
        customer: record.customerName,
        service: record.serviceSummary,
        date: record.formattedDate,
        time: record.formattedTime,
        status: record.status,
        onDetails: () => ledger.onViewReceipt(record),
        renderActions: () => ledger.renderActions(record),
        details: [
          { value: record.methodLabel },
          { value: record.referenceNumber || "—", onClick: () => ledger.onViewReceipt(record) },
          { value: record.recordedByName },
          { value: formatPeso(record.amountCents), numeric: true, className: "font-semibold text-ink" },
        ] as LedgerDetail[],
      }))
    : ledger.records.map((appointment) => ({
        id: appointment.appointmentId,
        customer: appointment.customerName,
        service: appointment.serviceSummary,
        date: appointment.formattedDate,
        time: appointment.formattedTime,
        status: appointment.paymentStatus,
        onDetails: undefined,
        renderActions: () => ledger.renderActions(appointment),
        details: [
          { value: appointment.staffName },
          { value: formatPeso(appointment.totalCents), numeric: true },
          { value: formatPeso(appointment.paidCents), numeric: true },
          { value: formatPeso(appointment.balanceCents), numeric: true, className: "font-semibold text-burnt-dark" },
        ] as LedgerDetail[],
      }));

  if (rows.length === 0) {
    return (
      <div className="px-5 py-6 text-center sm:py-8">
        <EmptyState compact title={emptyTitle} description={emptyDescription} />
        {emptyAction}
      </div>
    );
  }

  const detailLink = "rounded text-left underline-offset-2 hover:text-burnt-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40";

  return (
    <div className="w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Payment ledger table">
      <table className="w-full min-w-[760px] text-left text-sm" aria-label={ledger.tab === "history" ? "Payment history" : "Unsettled appointments"}>
        <thead className="border-b border-hairline bg-mist text-[11px] font-semibold uppercase leading-4 tracking-wide text-subtle">
          <tr>
            <th scope="col" className="px-5 py-3">Date</th>
            <th scope="col" className="px-5 py-3">Customer & Service</th>
            {columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={cn("px-5 py-3", (ledger.tab === "unsettled" ? index > 0 : index === 3) && "text-right")}
              >
                {column}
              </th>
            ))}
            <th scope="col" className="px-5 py-3 text-center">Status</th>
            <th scope="col" className="px-5 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-mist">
              <td className="whitespace-nowrap px-5 py-3.5">
                <p className="font-medium text-body">{row.date}</p>
                <p className="text-xs text-muted">{row.time}</p>
              </td>
              <td className="min-w-40 px-5 py-3.5">
                {row.onDetails ? (
                  <button type="button" aria-haspopup="dialog" onClick={row.onDetails} className={cn(detailLink, "font-semibold text-ink")}>
                    {row.customer}
                  </button>
                ) : (
                  <p className="font-semibold text-ink">{row.customer}</p>
                )}
                <p className="text-xs text-muted">{row.service}</p>
              </td>
              {row.details.map((detail, index) => (
                <td
                  key={columns[index]}
                  className={cn("px-5 py-3.5 text-muted", detail.numeric && "whitespace-nowrap text-right tabular-nums", detail.className)}
                >
                  {detail.onClick ? (
                    <button type="button" aria-haspopup="dialog" onClick={detail.onClick} className={detailLink}>
                      {detail.value}
                    </button>
                  ) : detail.value}
                </td>
              ))}
              <td className="whitespace-nowrap px-5 py-3.5 text-center"><StatusBadge status={row.status} /></td>
              <td className="px-5 py-3.5">{row.renderActions()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
