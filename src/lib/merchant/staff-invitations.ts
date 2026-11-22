import "server-only";
import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";

export function hashStaffInvitation(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getStaffInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const admin = getAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.from("staff_invitations")
    .select("email, full_name, role, tenants!inner(slug, name)")
    .eq("token_hash", hashStaffInvitation(token)).is("accepted_at", null).is("cancelled_at", null)
    .gt("expires_at", new Date().toISOString()).eq("tenants.status", "active").maybeSingle();
  if (error) throw error;
  return data;
}
