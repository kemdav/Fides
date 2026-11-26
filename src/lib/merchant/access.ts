import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const OPERATIONAL_ROLES = ["owner", "admin", "receptionist", "staff"] as const;

export type TenantAccess = { userId: string; tenantId: string; role: string };

/**
 * Resolves the business the signed-in user may operate on.
 * A client-supplied tenant id is only accepted when the user is a member of it.
 */
export async function resolveTenantAccess(supabase: Supabase, tenantIdParam?: string): Promise<TenantAccess | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("tenant_id, role").eq("id", user.id).maybeSingle();

  let membership = supabase.from("tenant_memberships").select("tenant_id, role").eq("profile_id", user.id).in("role", OPERATIONAL_ROLES);
  if (tenantIdParam) membership = membership.eq("tenant_id", tenantIdParam);
  const { data: member } = await membership.limit(1).maybeSingle();
  if (member?.tenant_id) return { userId: user.id, tenantId: member.tenant_id, role: member.role };

  const profileTenant = profile?.tenant_id ?? null;
  if (profileTenant && (!tenantIdParam || tenantIdParam === profileTenant) && (OPERATIONAL_ROLES as readonly string[]).includes(profile?.role ?? "")) {
    return { userId: user.id, tenantId: profileTenant, role: profile?.role ?? "staff" };
  }
  return null;
}
