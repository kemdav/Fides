export type Tier = {
  id: string;
  eyebrow: string;
  name: string;
  price: number;
  staffLimit: number;
  locationLimit: number;
  features: string[];
};

export type TierDraft = {
  name: string;
  price: string;
  staffLimit: string;
  locationLimit: string;
};

export type TierErrors = Partial<Record<keyof TierDraft, string>>;

export const defaultTiers: Tier[] = [
  {
    id: "basic",
    eyebrow: "ESSENTIALS",
    name: "Basic",
    price: 29,
    staffLimit: 3,
    locationLimit: 1,
    features: ["Online booking", "Client management", "Email reminders"],
  },
  {
    id: "business",
    eyebrow: "GROWING TEAMS",
    name: "Business",
    price: 79,
    staffLimit: 15,
    locationLimit: 3,
    features: ["Everything in Basic", "Advanced reporting", "Automated reminders"],
  },
  {
    id: "enterprise",
    eyebrow: "AT SCALE",
    name: "Enterprise",
    price: 199,
    staffLimit: 50,
    locationLimit: 10,
    features: ["Everything in Business", "Multi-location controls", "Priority support"],
  },
];

export const emptyDraft: TierDraft = { name: "", price: "", staffLimit: "", locationLimit: "" };

export function draftFromTier(tier: Tier): TierDraft {
  return {
    name: tier.name,
    price: String(tier.price),
    staffLimit: String(tier.staffLimit),
    locationLimit: String(tier.locationLimit),
  };
}

export function validateTier(draft: TierDraft, tiers: Tier[], editingId?: string): TierErrors {
  const errors: TierErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Enter a tier name.";
  else if (tiers.some((tier) => tier.id !== editingId && tier.name.toLowerCase() === name.toLowerCase())) {
    errors.name = "A tier with this name already exists.";
  }

  const price = Number(draft.price);
  if (!draft.price.trim() || !Number.isFinite(price) || price <= 0) errors.price = "Enter a monthly price above zero.";

  for (const key of ["staffLimit", "locationLimit"] as const) {
    const value = Number(draft[key]);
    if (!draft[key].trim() || !Number.isInteger(value) || value < 1) errors[key] = "Enter a whole number of 1 or more.";
  }
  return errors;
}

export function tierFromDraft(draft: TierDraft, base?: Tier): Tier {
  const name = draft.name.trim();
  return {
    id: base?.id ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    eyebrow: base?.eyebrow ?? "CUSTOM",
    name,
    price: Number(draft.price),
    staffLimit: Number(draft.staffLimit),
    locationLimit: Number(draft.locationLimit),
    features: base?.features ?? ["Online booking"],
  };
}

export function subscribedLabel(count: number): string {
  return `${count} subscribed ${count === 1 ? "tenant" : "tenants"}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
