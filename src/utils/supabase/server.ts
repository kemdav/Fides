import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Creates a server-side Supabase client for Server Components, Server Actions,
 * and Route Handlers using `@supabase/ssr`.
 *
 * In Next.js App Router (Next.js 15+ / 16), `cookies()` is asynchronous.
 * Cookie mutations via `setAll` take effect in Server Actions and Route Handlers,
 * while being safely caught in Server Components where cookies are read-only.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  const supabaseUrl =
    publicEnv.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    publicEnv.supabaseKey ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
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
          // The `setAll` method was called from a Server Component.
          // This can be safely ignored if session refresh is handled in proxy/middleware.
        }
      },
    },
  });
}
