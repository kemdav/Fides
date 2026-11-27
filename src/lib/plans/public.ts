import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { logError } from "@/lib/log";
import type { Database } from "@/types/database.types";
import { FALLBACK_TIERS, toPublicPlan, type PublicPlan } from "./catalog";

/**
 * The active plans for the public pages. Reads with the public key and no cookies
 * (the catalog is public), so those pages can stay prerendered and revalidated.
 */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  if (publicEnv.supabaseUrl && publicEnv.supabaseKey) {
    try {
      const supabase = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase
        .from("subscription_tiers")
        .select("code, name, price_cents, description, features")
        .eq("active", true)
        .order("sort_order")
        .order("price_cents");
      if (error) throw new Error(error.message);
      if (data.length) return data.map(toPublicPlan);
    } catch (error) {
      logError("plans.public", error);
    }
  }
  return FALLBACK_TIERS.map(toPublicPlan);
}
