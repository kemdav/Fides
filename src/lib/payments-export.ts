import type { PaymentRecordDTO } from "@/types/payments";

/**
 * Escapes a cell for RFC 4180 compliant CSV output.
 */
function escapeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Formats centavos into decimal string with 2 decimal places (e.g. 845000 -> "8450.00").
 */
function formatCentsToDecimal(cents: number): string {
  return ((cents || 0) / 100).toFixed(2);
}

/**
 * Generates a Philippine BIR-compliant Quarterly Sales Book CSV string
 * from a list of PaymentRecordDTO records.
 */
export function generateBirSalesBookCsv(records: PaymentRecordDTO[]): string {
  const headers = [
    "Date (Asia/Manila)",
    "Reference / Receipt #",
    "Customer",
    "Service(s)",
    "Payment Method",
    "Gross Amount (PHP)",
    "Net of VAT (PHP)",
    "VAT 12% (PHP)",
    "Status",
    "Recorded By",
  ];

  const rows = records.map((record) => {
    const receiptOrRef =
      record.referenceNumber ||
      `REC-${record.id.slice(0, 8).toUpperCase()}`;

    const grossPhp = formatCentsToDecimal(record.amountCents);
    const netPhp = formatCentsToDecimal(record.netCents);
    const vatPhp = formatCentsToDecimal(record.vatCents);

    return [
      escapeCsvCell(`${record.formattedDate} ${record.formattedTime}`),
      escapeCsvCell(receiptOrRef),
      escapeCsvCell(record.customerName),
      escapeCsvCell(record.serviceSummary),
      escapeCsvCell(record.methodLabel),
      escapeCsvCell(grossPhp),
      escapeCsvCell(netPhp),
      escapeCsvCell(vatPhp),
      escapeCsvCell(record.status.toUpperCase()),
      escapeCsvCell(record.recordedByName),
    ].join(",");
  });

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
}

/**
 * Client-side trigger to download the CSV file in browser.
 */
export function triggerCsvDownload(csvContent: string, filename = "bir-sales-book.csv"): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
