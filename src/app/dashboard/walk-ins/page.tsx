import { redirect } from "next/navigation";
import { resolveMerchantTenantId } from "@/lib/merchant/walk-ins";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardWalkInsRedirect() {
  const supabase = await createClient();
  const tenantId = await resolveMerchantTenantId(supabase);
  if (!tenantId) redirect("/login");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  redirect(tenant?.slug ? "/" + tenant.slug + "/dashboard/walk-ins" : "/dashboard");
}
