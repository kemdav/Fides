import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppointmentsView } from "@/components/merchant/appointments/appointments-view";
import { createClient } from "@/lib/supabase/server";

interface MerchantAppointmentsPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Appointments · Merchant Workspace · Fides",
  description: "Manage bookings, approvals, and appointment outcomes.",
};

export default async function MerchantAppointmentsPage({
  params,
}: MerchantAppointmentsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/appointments`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  return (
    <AppointmentsView
      businessName={tenant.name}
      userEmail={user.email ?? "Merchant staff"}
      tenantId={tenant.id}
      basePath={`/${slug}`}
    />
  );
}
