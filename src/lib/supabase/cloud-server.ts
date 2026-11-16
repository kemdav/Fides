import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudPublicEnv, cloudSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database.types";

export async function createCloudClient(): Promise<SupabaseClient<Database>> {
  if (!cloudSupabaseConfigured) {
    throw new Error(
      "Cloud Supabase URL and public key are missing. Set CLOUD_SUPABASE_URL and CLOUD_SUPABASE_PUBLIC_KEY in .env.local."
    );
  }

  const cookieStore = await cookies();
  return createServerClient<Database>(cloudPublicEnv.supabaseUrl, cloudPublicEnv.supabaseKey, {
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
          // Server Components cannot always write cookies; Proxy refreshes the session.
        }
      },
    },
  });
}
