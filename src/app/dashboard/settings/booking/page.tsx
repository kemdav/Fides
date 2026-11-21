import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardBookingSettingsRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/settings/booking");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  let tenantId = profile?.tenant_id ?? null;

  if (!tenantId) {
    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();
    tenantId = membership?.tenant_id ?? null;
  }

  if (!tenantId) {
    redirect("/dashboard");
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  redirect(
    tenant?.slug ? `/${tenant.slug}/dashboard/settings/booking` : "/dashboard",
  );
}
