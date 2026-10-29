import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, requireServerEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client.
 *
 * Bypasses Row Level Security, so it must only be imported by server-only code
 * (route handlers, server actions, scheduled jobs) that performs its own
 * authorization — never by anything running in the browser.
 *
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not defined.
 */
export function createAdminClient(): SupabaseClient<Database> {
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

/**
 * Safe accessor for the service-role client.
 * Returns null if the service role key is not configured or is a placeholder.
 */
export function getAdminClient(): SupabaseClient<Database> | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (
    !serviceKey ||
    serviceKey.startsWith("<") ||
    !publicEnv.supabaseUrl ||
    publicEnv.supabaseUrl.startsWith("<")
  ) {
    return null;
  }

  try {
    return createSupabaseClient<Database>(publicEnv.supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch {
    return null;
  }
}
