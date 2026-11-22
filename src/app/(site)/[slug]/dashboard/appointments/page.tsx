import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SchedulePage } from "./schedule-page";

interface MerchantAppointmentsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ staff?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: MerchantAppointmentsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} Appointments`
      : "Merchant Appointments",
    description: "Manage bookings, approvals, and appointment outcomes.",
  };
}

export default SchedulePage;
