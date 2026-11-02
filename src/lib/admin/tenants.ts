export type TenantAccess = "active" | "suspended";

export type Tenant = {
  id: string;
  name: string;
  reference: string;
  email: string;
  plan: string;
  price: number;
  access: TenantAccess;
};

export const planPrices: Record<string, number> = { Basic: 29, Business: 79, Enterprise: 199 };

export const planOptions = Object.entries(planPrices).map(([value, price]) => ({
  value,
  label: value,
  detail: `$${price}/month`,
}));

export const accessOptions = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
] as const;

export const sampleTenants: Tenant[] = [
  {
    id: "olive-and-oak-spa",
    name: "Olive & Oak Spa",
    reference: "FID-1036",
    email: "isabella@olive.example",
    plan: "Business",
    price: 79,
    access: "active",
  },
  {
    id: "aura-skin-clinic",
    name: "Aura Skin Clinic",
    reference: "FID-1024",
    email: "amelia@aura.example",
    plan: "Enterprise",
    price: 199,
    access: "suspended",
  },
];

export const REASON_MIN = 10;
export const REASON_MAX = 500;

export function validReason(value: string): boolean {
  const length = value.trim().length;
  return length >= REASON_MIN && length <= REASON_MAX;
}
