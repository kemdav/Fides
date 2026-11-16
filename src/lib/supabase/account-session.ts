import "server-only";
import type { User } from "@supabase/supabase-js";
import { cloudPublicEnv, cloudSupabaseConfigured, publicEnv } from "@/lib/env";
import { createCloudAdminClient, createAdminClient, type AdminClient } from "@/lib/supabase/admin";
import { createCloudClient } from "@/lib/supabase/cloud-server";
import { createClient } from "@/lib/supabase/server";

export type AccountSession = {
  user: User;
  admin: AdminClient;
  client: Awaited<ReturnType<typeof createClient>>;
};

export async function getAccountSession(): Promise<AccountSession | null> {
  if (cloudSupabaseConfigured) {
    const client = await createCloudClient();
    const { data: { user } } = await client.auth.getUser();
    if (user) return { user, client, admin: createCloudAdminClient() };
  }

  if (cloudSupabaseConfigured && cloudPublicEnv.supabaseUrl === publicEnv.supabaseUrl) return null;

  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const admin = cloudSupabaseConfigured && cloudPublicEnv.supabaseUrl === publicEnv.supabaseUrl
    ? createCloudAdminClient()
    : createAdminClient();
  return { user, client, admin };
}
