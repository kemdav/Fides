import { DAY_MS, RENEWAL_WINDOW_DAYS } from "@/lib/billing";

export type TenantAccess = "active" | "suspended";

export type Tenant = {
  id: string;
  name: string;
  reference: string;
  owner: string;
  email: string;
  nextBilling: string | null;
  planCode: string;
  plan: string;
  price: number;
  access: TenantAccess;
};

export type PlanSummary = {
  code: string;
  name: string;
  price: number;
};

export const accessOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export function daysUntilBilling(tenant: Tenant, now: number): number {
  if (!tenant.nextBilling) return Number.POSITIVE_INFINITY;
  return Math.ceil((Date.parse(tenant.nextBilling) - now) / DAY_MS);
}

export function isRenewingSoon(tenant: Tenant, now: number): boolean {
  return tenant.access === "active" && daysUntilBilling(tenant, now) <= RENEWAL_WINDOW_DAYS;
}

export function formatNextBilling(tenant: Tenant): string {
  if (!tenant.nextBilling) return "—";
  return new Date(tenant.nextBilling).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatPrice(price: number): string {
  return `₱${price.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

export const REASON_MIN = 10;
export const REASON_MAX = 500;

export function validReason(value: string): boolean {
  const length = value.trim().length;
  return length >= REASON_MIN && length <= REASON_MAX;
}
