import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDashboardProfile } from "@/lib/applications/service";
import { createClient } from "@/lib/supabase/server";
import { DashboardApp } from "./dashboard-app";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getDashboardProfile(user.id);
  if (!profile) redirect("/login");

  return (
    <DashboardApp
      owner={profile.app.full_name}
      email={profile.app.email}
      phone={profile.app.phone}
      business={{
        name: profile.business?.business_name ?? "Your business",
        type: profile.business?.business_type ?? "Service business",
        address: profile.business
          ? `${profile.business.street_address}, ${profile.business.city}, ${profile.business.province} ${profile.business.zip_code}`
          : "",
        established: profile.business?.established_year ?? null,
        logoUrl: profile.business?.logo_url ?? null,
      }}
      plan={{ name: profile.plan?.name ?? profile.app.plan_code, price: Number(profile.plan?.price_php ?? 0) }}
      reference={profile.app.reference_code}
    />
  );
}
