import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LegacyAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("tenant_memberships").select("tenants(slug)")
    .eq("profile_id", user.id).order("tenant_id").limit(1).maybeSingle();
  redirect(membership?.tenants?.slug ? `/${membership.tenants.slug}/dashboard/account` : "/login");
}
