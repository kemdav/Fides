import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client.
 *
 * Bypasses Row Level Security, so it must only be imported by server-only code
 * (route handlers, server actions, scheduled jobs) that performs its own
 * authorization — never by anything running in the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.supabaseUrl,
    requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
