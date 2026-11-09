import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Tenant dashboard",
};

/**
 * Protected tenant dashboard Server Component.
 *
 * Verifies active session with `supabase.auth.getUser()`.
 * Redirects to login if not authenticated.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch profile and memberships to display user context
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id, full_name")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("profile_id", user.id);

  // Fetch all tenant records visible to the user
  const tenantIds = Array.from(
    new Set(
      [
        profile?.tenant_id,
        ...(memberships?.map((m) => m.tenant_id) || []),
      ].filter(Boolean),
    ),
  ) as string[];

  let tenantDetails: {
    id: string;
    name: string;
    slug: string;
    status: string;
    brand_color: string | null;
    accent_color: string | null;
  }[] = [];
  if (tenantIds.length > 0) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug, status, brand_color, accent_color")
      .in("id", tenantIds);
    if (tData) {
      tenantDetails = tData;
    }
  }

  // Get the primary tenant (first active one or first one)
  const primaryTenant = tenantDetails.find((t) => t.status === "active") || tenantDetails[0];

  return (
    <DashboardClient
      user={user}
      profile={profile}
      memberships={memberships || []}
      tenantDetails={tenantDetails}
      primaryTenant={primaryTenant}
    />
  );
}