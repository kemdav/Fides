export type Tier = {
  id: string;
  eyebrow: string;
  name: string;
  price: number;
  staffLimit: number | null;
  locationLimit: number | null;
  features: string[];
  subscribed: number;
};

export type TierDraft = {
  name: string;
  price: string;
  staffLimit: string;
  locationLimit: string;
};

export type TierErrors = Partial<Record<keyof TierDraft, string>>;

export const emptyDraft: TierDraft = { name: "", price: "", staffLimit: "", locationLimit: "" };

export function draftFromTier(tier: Tier): TierDraft {
  return {
    name: tier.name,
    price: String(tier.price),
    staffLimit: tier.staffLimit === null ? "" : String(tier.staffLimit),
    locationLimit: tier.locationLimit === null ? "" : String(tier.locationLimit),
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
    const raw = draft[key].trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) errors[key] = "Enter a whole number of 1 or more, or leave blank.";
  }
  return errors;
}

export function subscribedLabel(count: number): string {
  return `${count} subscribed ${count === 1 ? "tenant" : "tenants"}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
