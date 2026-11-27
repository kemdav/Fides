import { triggerCsvDownload } from "@/lib/payments-export";

export type CsvRow = readonly (number | string)[];

function csvCell(value: number | string): string {
  const safe = typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${String(safe).replaceAll('"', '""')}"`;
}

export function exportRows(filename: string, rows: readonly CsvRow[]): void {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  triggerCsvDownload(`\uFEFF${csv}`, filename);
}
