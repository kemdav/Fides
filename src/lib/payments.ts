export const MANILA_TIMEZONE = "Asia/Manila";
import type { PaymentMethod } from "@/types/payments";

/**
 * Format integer centavos into standard Philippine Peso currency string.
 * Example: 845000 -> "₱8,450.00", 0 -> "₱0.00"
 */
export function formatPeso(cents: number): string {
  const pesos = (cents || 0) / 100;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pesos);
}

/**
 * Split gross centavos into net-of-VAT and VAT breakdown according to Philippine tax guidelines.
 * For 12% standard VAT: Net = round(Gross / 1.12), VAT = Gross - Net.
 * This guarantees: netCents + vatCents === grossCents.
 */
export function calculateVatSplit(
  grossCents: number,
  vatRatePercent = 12
): { grossCents: number; netCents: number; vatCents: number } {
  if (grossCents <= 0) {
    return { grossCents: 0, netCents: 0, vatCents: 0 };
  }
  const rateFactor = 1 + vatRatePercent / 100;
  const netCents = Math.round(grossCents / rateFactor);
  const vatCents = grossCents - netCents;
  return { grossCents, netCents, vatCents };
}

/**
 * Maps raw payment methods/channels to clean customer-facing UI labels.
 */
export function resolvePaymentMethodLabel(method: string | null | undefined): string {
  const m = (method || "").toLowerCase().trim();
  switch (m) {
    case "cash":
      return "Cash";
    case "ewallet":
    case "gcash":
    case "maya":
      return "E-wallet (GCash / Maya)";
    case "card":
      return "Card";
    case "bank_transfer":
      return "Bank Transfer";
    default:
      return "Cash";
  }
}

/**
 * Normalize payment method to standard PaymentMethod ("cash" | "ewallet" | "card").
 */
export function normalizePaymentMethod(method: string | null | undefined): PaymentMethod {
  const m = (method || "").toLowerCase().trim();
  if (m === "card") return "card";
  if (m === "ewallet" || m === "gcash" || m === "maya" || m === "bank_transfer") return "ewallet";
  return "cash";
}

/**
 * Formats date into readable Manila format: "Nov 24, 2026"
 */
export function formatDateManila(dateOrIso: string | Date): string {
  const date = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return "Nov 24, 2026";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Compute cash change and applied amount for a transaction.
 */
export function calculateChangeAndApplied(
  tenderedCents: number,
  balanceCents: number,
  method: PaymentMethod
): { appliedCents: number; changeCents: number; remainingCents: number } {
  if (method === "cash") {
    if (tenderedCents >= balanceCents) {
      return {
        appliedCents: balanceCents,
        changeCents: tenderedCents - balanceCents,
        remainingCents: 0,
      };
    }
    return {
      appliedCents: tenderedCents,
      changeCents: 0,
      remainingCents: balanceCents - tenderedCents,
    };
  }

  // Non-cash: cannot exceed balance
  const appliedCents = Math.min(tenderedCents, balanceCents);
  return {
    appliedCents,
    changeCents: 0,
    remainingCents: Math.max(0, balanceCents - appliedCents),
  };
}
