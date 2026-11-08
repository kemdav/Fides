import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TenantData = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  display_name: string | null;
  about: string | null;
};

export async function getTenantBySlug(slug: string): Promise<TenantData | null> {
  if (!slug) return null;

  const supabase = getAdminClient() ?? (await createClient());

  const { data, error } = await supabase
    .from("tenants")
    .select(`
      id,
      name,
      slug,
      logo_url,
      brand_color,
      tenant_settings (
        display_name,
        about
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const settings = Array.isArray(data.tenant_settings)
    ? data.tenant_settings[0]
    : data.tenant_settings;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logo_url: data.logo_url,
    brand_color: data.brand_color,
    display_name: settings?.display_name ?? null,
    about: settings?.about ?? null,
  };
}
