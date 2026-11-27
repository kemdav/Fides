import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const SUSPENDED_MESSAGE = "This business is suspended. Changes are turned off until it is reactivated.";

/**
 * Whether the business may be operated on. The database blocks writes from signed-in users on its
 * own; call this before writing with the server key. Unreadable counts as closed.
 */
export async function isTenantOpen(client: SupabaseClient<Database>, tenantId: string): Promise<boolean> {
  const { data, error } = await client.from("tenants").select("status").eq("id", tenantId).maybeSingle();
  return !error && data !== null && data.status !== "suspended" && data.status !== "archived";
}
