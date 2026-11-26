import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AdminIdentity } from "./identity";

/** The signed-in platform administrator, or null. Checked against the database, once per request. */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("platform_admins")
    .select("display_name")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  return data ? { id: user.id, email: user.email ?? "", displayName: data.display_name } : null;
});

/** Admin pages: signed-in platform admin required, otherwise back to the admin login. */
export async function requireAdminPortal(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Admin server actions: refuse to run for anyone who is not an active platform admin. */
export async function assertAdminAction(): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Your admin session has expired. Please log in again.");
  return admin;
}
