import "server-only";
import type { AdminClient } from "@/lib/supabase/admin";

/** A plan in the one catalog (`subscription_tiers`), with its limits. `null` limit = unlimited. */
export type PlanTier = {
  id: string;
  code: string;
  name: string;
  eyebrow: string;
  /** pesos */
  price: number;
  billingInterval: string;
  staffLimit: number | null;
  locationLimit: number | null;
  features: string[];
  active: boolean;
  sortOrder: number;
};

export async function listTiers(admin: AdminClient): Promise<PlanTier[]> {
  const [tiers, limits] = await Promise.all([
    admin.from("subscription_tiers").select("*").order("sort_order").order("price_cents"),
    admin.from("tier_features").select("tier_id, feature_key, limit_value").in("feature_key", ["staff_accounts", "branches"]),
  ]);
  if (tiers.error) throw new Error(`Could not load subscription tiers: ${tiers.error.message}`);
  if (limits.error) throw new Error(`Could not load tier limits: ${limits.error.message}`);

  const limitOf = new Map(limits.data.map((row) => [`${row.tier_id}:${row.feature_key}`, row.limit_value]));
  return tiers.data.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    eyebrow: row.eyebrow,
    price: row.price_cents / 100,
    billingInterval: row.billing_interval,
    staffLimit: limitOf.get(`${row.id}:staff_accounts`) ?? null,
    locationLimit: limitOf.get(`${row.id}:branches`) ?? null,
    features: row.features,
    active: row.active,
    sortOrder: row.sort_order,
  }));
}

export async function findTier(admin: AdminClient, code: string): Promise<PlanTier | null> {
  return (await listTiers(admin)).find((tier) => tier.code === code) ?? null;
}

export async function setTierLimits(admin: AdminClient, tierId: string, staffLimit: number | null, locationLimit: number | null): Promise<void> {
  const { error } = await admin.from("tier_features").upsert(
    [
      { tier_id: tierId, feature_key: "staff_accounts", enabled: true, limit_value: staffLimit },
      { tier_id: tierId, feature_key: "branches", enabled: true, limit_value: locationLimit },
    ],
    { onConflict: "tier_id,feature_key" }
  );
  if (error) throw new Error(`Could not save the tier limits: ${error.message}`);
}
