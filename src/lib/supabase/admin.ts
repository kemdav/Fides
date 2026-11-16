import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudPublicEnv, getServerEnv, publicEnv } from "@/lib/env";
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
      "Supabase server credentials are missing. Set FIDES_DB=CLOUD or FIDES_DB=DOCKER in .env.local and fill in the values for that database (see .env.example), then restart the dev server. Also check .env.local for duplicate lines or leftover <placeholder> values."
    );
  }
  return client;
}

export function getCloudAdminClient(): AdminClient | null {
  const env = getServerEnv();
  const secret = env.CLOUD_SUPABASE_SECRET_KEY;
  if (!secret || !cloudPublicEnv.supabaseUrl) return null;

  return createSupabaseClient<Database>(cloudPublicEnv.supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createCloudAdminClient(): AdminClient {
  const client = getCloudAdminClient();
  if (!client) {
    throw new Error(
      "Cloud Supabase credentials are missing. Set CLOUD_SUPABASE_URL, CLOUD_SUPABASE_PUBLIC_KEY, and CLOUD_SUPABASE_SECRET_KEY in .env.local, then restart the dev server."
    );
  }
  return client;
}
