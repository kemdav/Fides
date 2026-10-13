import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route
 * Handlers. A new client is created per request so no session leaks between
 * requests.
 *
 * Session refresh and cookie writes are handled in `src/proxy.ts`; the write
 * path below is best-effort because Server Components cannot always set cookies.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore because the proxy refreshes the session.
          }
        },
      },
    }
  );
}
