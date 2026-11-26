import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardOnboardingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ step?: string | string[]; verification?: string | string[] }>;
}) {
  const { step, verification } = await searchParams;
  const query = new URLSearchParams();
  if (step === "branding") query.set("step", step);
  if (verification === "pending" || verification === "suspended") query.set("verification", verification);
  const path = query.size ? `/dashboard/onboarding?${query}` : "/dashboard/onboarding";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?${new URLSearchParams({ redirect: path })}`);

  const { data: profile } = await supabase.from("profiles").select("tenants(slug)")
    .eq("id", user.id).maybeSingle();
  let slug = profile?.tenants?.slug;
  if (!slug) {
    const { data: membership } = await supabase.from("tenant_memberships").select("tenants(slug)")
      .eq("profile_id", user.id).eq("role", "owner").order("tenant_id").limit(1).maybeSingle();
    slug = membership?.tenants?.slug;
  }

  redirect(slug ? `/${slug}${path}` : "/dashboard");
}
