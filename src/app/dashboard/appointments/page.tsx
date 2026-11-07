import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsView, AppointmentItem } from "@/components/merchant/appointments/appointments-view";

/**
 * Merchant Appointments Page (`/dashboard/appointments`).
 *
 * Pixel-matched to design specifications (Screenshot 2026-11-07 160513).
 * Fetches real appointments from Supabase for authenticated tenant.
 */
export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tenant?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/appointments");
  }

  const { tenant: tenantSlugParam } = (await searchParams) || {};

  // Fetch profile to resolve active tenant
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  let tenantId = profile?.tenant_id;
  let businessName = "Bella Vita";

  if (tenantSlugParam) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("slug", tenantSlugParam)
      .single();
    if (tData) {
      tenantId = tData.id;
      businessName = tData.name;
    }
  } else if (tenantId) {
    const { data: tData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();
    if (tData) {
      businessName = tData.name;
    }
  }

  let dbItems: AppointmentItem[] | undefined = undefined;

  if (tenantId) {
    const { data: appData } = await supabase
      .from("appointments")
      .select(`
        id,
        starts_at,
        source,
        status,
        customers (first_name, last_name)
      `)
      .eq("tenant_id", tenantId)
      .order("starts_at", { ascending: true })
      .limit(20);

    if (appData && appData.length > 0) {
      dbItems = appData.map((row) => {
        const timeStr = new Date(row.starts_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        // Supabase returns relation as array or object depending on schema
        const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
        const customerName = cust
          ? `${cust.first_name || ""} ${cust.last_name || ""}`.trim()
          : "Customer";

        const sourceVal: AppointmentItem["source"] =
          row.source === "walk_in" ? "Walk-In" : "Online";

        let statusVal: AppointmentItem["status"] = "Confirmed";
        if (row.status === "pending_approval") statusVal = "Pending approval";
        else if (row.status === "checked_in") statusVal = "Check In";

        return {
          id: row.id,
          time: timeStr || "09:00",
          customer: customerName || "Client",
          service: "Signature service",
          staff: "Staff Specialist",
          source: sourceVal,
          status: statusVal,
        };
      });
    }
  }

  return (
    <AppointmentsView
      businessName={businessName}
      userEmail={user.email ?? "Maria Santos"}
      initialItems={dbItems}
    />
  );
}
