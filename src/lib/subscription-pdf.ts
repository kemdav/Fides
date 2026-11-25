import { SUPPLIER_BILLING_INFO, type SubscriptionInvoice } from "@/types/subscription";

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function formatPhpPdf(cents: number, includeDecimals = false): string {
  const amount = cents / 100;
  return `PHP ${amount.toLocaleString("en-PH", {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDatePdf(iso: string | null, timeZone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

function formatPeriodPdf(startIso: string, endIso: string, timeZone: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startMonth = new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(start);
  const endMonth = new Intl.DateTimeFormat("en-US", { month: "long", timeZone }).format(end);
  const startDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone }).format(start);
  const endDay = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone }).format(end);
  const endYear = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(end);

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${endYear}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
}

function normalizePdfTimeZone(raw?: string | null): string {
  const candidate = raw?.split(/\s*\(/)[0]?.trim() || "Asia/Manila";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return "Asia/Manila";
  }
}

export function buildSubscriptionInvoicePdf(
  invoice: SubscriptionInvoice,
  timeZone = "Asia/Manila"
): Uint8Array {
  const safeTimeZone = normalizePdfTimeZone(timeZone);
  const statusLabel =
    invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  const lines: { text: string; size: number; bold?: boolean; x: number; y: number }[] = [];
  let y = 760;

  const pushLine = (text: string, opts?: { size?: number; bold?: boolean; x?: number; gap?: number }) => {
    const size = opts?.size ?? 10;
    const x = opts?.x ?? 52;
    lines.push({ text, size, bold: opts?.bold, x, y });
    y -= opts?.gap ?? (size + 6);
  };

  pushLine("Subscription Invoice", { size: 22, bold: true, gap: 26 });
  pushLine(`${invoice.invoiceNumber}  |  Status: ${statusLabel}`, { size: 11, gap: 24 });

  pushLine(SUPPLIER_BILLING_INFO.legalName.replace("·", "-"), { size: 11, bold: true, gap: 15 });
  pushLine(SUPPLIER_BILLING_INFO.address, { size: 9, gap: 13 });
  pushLine(`Supplier TIN: ${SUPPLIER_BILLING_INFO.tin}`, { size: 9, gap: 22 });

  pushLine(`Billed to: ${invoice.billedToName}`, { size: 11, bold: true, gap: 15 });
  if (invoice.billedToAddress) {
    pushLine(invoice.billedToAddress, { size: 9, gap: 13 });
  }
  if (invoice.billedToTin || invoice.billedToBranch) {
    const tinPart = invoice.billedToTin ? `TIN: ${invoice.billedToTin}` : "";
    const branchPart = invoice.billedToBranch ? `Branch: ${invoice.billedToBranch}` : "";
    pushLine([tinPart, branchPart].filter(Boolean).join("  |  "), { size: 9, gap: 13 });
  }
  pushLine(invoice.billedToEmail, { size: 9, gap: 26 });

  const rows: [string, string][] = [
    ["Invoice number", invoice.invoiceNumber],
    ["Billing period", formatPeriodPdf(invoice.billingPeriodStart, invoice.billingPeriodEnd, safeTimeZone)],
    ["Issued", formatDatePdf(invoice.issuedAt, safeTimeZone)],
    ["Due date", formatDatePdf(invoice.dueAt, safeTimeZone)],
  ];
  if (invoice.paidAt) {
    rows.push(["Paid date", formatDatePdf(invoice.paidAt, safeTimeZone)]);
  }
  rows.push(
    [`${invoice.tierName} subscription - 1 month`, formatPhpPdf(invoice.subtotalCents, true)],
    ["VAT - Illustrative 12%", formatPhpPdf(invoice.vatCents, true)],
    ["Total invoice amount", formatPhpPdf(invoice.totalCents)],
    ["Amount paid", formatPhpPdf(invoice.amountPaidCents)],
    ["Balance due", formatPhpPdf(invoice.balanceDueCents)]
  );

  for (const [label, value] of rows) {
    lines.push({ text: label, size: 10, x: 52, y });
    lines.push({ text: value, size: 10, bold: label.startsWith("Total") || label.startsWith("Balance"), x: 310, y });
    y -= 20;
  }

  y -= 14;
  pushLine("Payment Instructions (Bank Transfer)", { size: 11, bold: true, gap: 16 });
  pushLine(SUPPLIER_BILLING_INFO.bankName.replace("·", "-"), { size: 9, gap: 14 });
  pushLine(`Account: **** 6789 (sample)`, { size: 9, gap: 14 });
  pushLine(`Transfer reference: ${invoice.invoiceNumber}`, { size: 9, gap: 14 });
  pushLine(
    "Payment verification: allow up to 2 business days after submitting payment details.",
    { size: 9, gap: 14 }
  );

  const streamCommands = lines
    .map((line) => {
      const font = line.bold ? "/F2" : "/F1";
      return `BT ${font} ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj ET`;
    })
    .join("\n");

  const streamBytes = new TextEncoder().encode(streamCommands);

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamCommands}\nendstream\nendobj\n`,
  ];

  const encoder = new TextEncoder();
  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(encoder.encode(body).length);
    body += obj;
  }

  const xrefOffset = encoder.encode(body).length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(body);
}