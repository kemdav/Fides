import "server-only";
import { createHash } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import type { User } from "@supabase/supabase-js";

export const STAFF_EMAIL_LINK_MINUTES = 15;
export const STAFF_EMAIL_CHANGE_RECEIPT = "fides_staff_email_verified";
export const STAFF_EMAIL_CHANGE_COMPLETE_PATH = "/staff-email-change/complete";

export function canVerifyStaffEmail(user: User | null, request: { profile_id: string; current_email: string }) {
  return Boolean(user && user.id === request.profile_id && user.email_confirmed_at
    && user.email?.toLowerCase() === request.current_email.toLowerCase());
}

export function hashStaffEmailProof(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getPendingStaffEmailChange(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = getAdminClient();
  if (!db) return null;
  const { data, error } = await db.from("staff_email_change_requests")
    .select("profile_id, tenant_id, current_email, new_email, tenants!inner(name, slug, status, brand_color, secondary_color, accent_color)")
    .eq("token_hash", hashStaffEmailProof(token)).is("claimed_at", null)
    .eq("tenants.status", "active").gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data;
}
