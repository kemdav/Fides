import { defaultTiers } from "./tiers";
import { DAY_MS, SAMPLE_TODAY } from "./verification";

export type TenantAccess = "active" | "suspended";

export type Tenant = {
  id: string;
  name: string;
  reference: string;
  owner: string;
  email: string;
  nextBilling: string;
  plan: string;
  price: number;
  access: TenantAccess;
};

export const planOptions = defaultTiers.map((tier) => ({
  value: tier.name,
  label: tier.name,
  detail: `$${tier.price}/month`,
}));

export const accessOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export const sampleTenants: Tenant[] = [
  {
    id: "aura-skin-clinic",
    name: "Aura Skin Clinic",
    reference: "FID-1024",
    owner: "Amelia Go",
    email: "amelia@aura.example",
    nextBilling: "2026-10-15",
    plan: "Enterprise",
    price: 199,
    access: "suspended",
  },
  {
    id: "olive-and-oak-spa",
    name: "Olive & Oak Spa",
    reference: "FID-1036",
    owner: "Isabella Chua",
    email: "isabella@olive.example",
    nextBilling: "2026-10-12",
    plan: "Business",
    price: 79,
    access: "active",
  },
];

const RENEWAL_WINDOW_DAYS = 7;

export function daysUntilBilling(tenant: Tenant): number {
  const billing = new Date(`${tenant.nextBilling}T00:00:00`);
  return Math.round((billing.getTime() - SAMPLE_TODAY.getTime()) / DAY_MS);
}

export function isRenewingSoon(tenant: Tenant): boolean {
  return tenant.access === "active" && daysUntilBilling(tenant) <= RENEWAL_WINDOW_DAYS;
}

export function formatNextBilling(tenant: Tenant): string {
  return new Date(`${tenant.nextBilling}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const REASON_MIN = 10;
export const REASON_MAX = 500;

export function validReason(value: string): boolean {
  const length = value.trim().length;
  return length >= REASON_MIN && length <= REASON_MAX;
}
