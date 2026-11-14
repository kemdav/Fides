import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

export type AdminClient = SupabaseClient<Database>;

export function getAdminClient(): AdminClient | null {
  const env = getServerEnv();
  const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !publicEnv.supabaseUrl) return null;

  return createSupabaseClient<Database>(publicEnv.supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createAdminClient(): AdminClient {
  const client = getAdminClient();
  if (!client) {
    throw new Error(
      "Supabase server credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local, then restart the dev server. Also check .env.local for duplicate lines or leftover <placeholder> values."
    );
  }
  return client;
}
