import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LegacyWebsiteSettingsRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.tenant_id) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  redirect(
    tenant?.slug ? `/${tenant.slug}/dashboard/settings/website` : "/login",
  );
}
