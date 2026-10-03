"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Browser-side Supabase client.
 *
 * Safe to call from any Client Component; a single instance is reused so
 * Realtime subscriptions and auth state remain consistent across the tab.
 */
export function createClient(): SupabaseClient<Database> {
  browserClient ??= createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey
  );
  return browserClient;
}
