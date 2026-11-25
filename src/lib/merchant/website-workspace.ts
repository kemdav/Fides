import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { workspaceRoleFromLabel } from "@/lib/merchant/workspace-roles";
import { getStorefrontServices } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getWebsitePublished(supabase: SupabaseClient<Database>, tenantId: string) {
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("is_published, tagline, business_email, supporting_message, cover_photo_url")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) return null;
  // Provisioned tenants get an is_published default before any website content is saved.
  return Boolean(data?.is_published && (
    data.tagline?.trim() || data.business_email?.trim() ||
    data.supporting_message?.trim() || data.cover_photo_url
  ));
}

export async function loadWebsiteWorkspace(slug: string, returnTo: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?${new URLSearchParams({ redirect: returnTo })}`);

  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase.from("tenant_memberships").select("role").eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle(),
    supabase.from("profiles").select("tenant_id, role").eq("id", user.id).maybeSingle(),
  ]);
  const role = membership?.role ?? (profile?.tenant_id === tenant.id ? workspaceRoleFromLabel(profile.role) : undefined);
  if (role !== "owner") notFound();

  const catalog = await getStorefrontServices(tenant.id);
  return {
    user,
    tenantId: tenant.id,
    services: catalog.slice(0, 3).map(({ id, name, durationMinutes, priceCents }) => ({ id, name, durationMinutes, priceCents })),
  };
}
