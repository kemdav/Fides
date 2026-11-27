import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type PaymentsDashboardClient = Awaited<ReturnType<typeof createClient>>;

export async function readViewerName(db: PaymentsDashboardClient, userId: string): Promise<string | undefined> {
  const { data } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name?.trim() || undefined;
}

type DashboardPayment = Pick<Tables<"payments">,
  "id" | "appointment_id" | "customer_id" | "amount_cents" | "method" | "status" |
  "reference" | "reference_number" | "notes" | "paid_at" | "created_by" | "created_at" |
  "recorded_by" | "void_reason" | "voided_at" | "refund_reason" | "refunded_at" | "net_cents" | "vat_cents"
>;

type DashboardAppointment = Pick<Tables<"appointments">,
  "id" | "starts_at" | "status" | "total_cents" | "notes" | "customer_id"
> & {
  customers: Pick<Tables<"customers">, "full_name"> | null;
  staff_members: Pick<Tables<"staff_members">, "full_name"> | null;
  appointment_services: { services: Pick<Tables<"services">, "name"> | null }[];
  payments: Pick<Tables<"payments">, "amount_cents" | "status">[];
};

export async function readDashboardRows(db: PaymentsDashboardClient, tenantId: string): Promise<{
  vatRatePercent: number;
  paymentsList: DashboardPayment[];
  appointmentsList: DashboardAppointment[];
}> {
  const [settings, payments, appointments] = await Promise.all([
    db.from("tenant_settings").select("vat_rate_percent").eq("tenant_id", tenantId).maybeSingle(),
    db.from("payments").select(
      "id, appointment_id, customer_id, amount_cents, method, status, reference, reference_number, notes, paid_at, created_by, created_at, recorded_by, void_reason, voided_at, refund_reason, refunded_at, net_cents, vat_cents",
    ).eq("tenant_id", tenantId)
      .order("paid_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    db.from("appointments").select(`
      id, starts_at, status, total_cents, notes, customer_id,
      customers(full_name), staff_members(full_name),
      appointment_services(services(name)), payments(amount_cents, status)
    `).eq("tenant_id", tenantId).neq("status", "cancelled").order("starts_at", { ascending: false }),
  ]);

  if (settings.error || payments.error || appointments.error) {
    throw new Error("Could not load the payments dashboard.");
  }
  return {
    vatRatePercent: Number(settings.data?.vat_rate_percent ?? 12),
    paymentsList: payments.data,
    appointmentsList: appointments.data,
  };
}

export async function readDashboardNames(
  db: PaymentsDashboardClient,
  tenantId: string,
  customerIds: string[],
  recorderIds: string[],
): Promise<{ customerMap: Map<string, string>; profileMap: Map<string, string> }> {
  const [customers, profiles] = await Promise.all([
    customerIds.length ? db.from("customers").select("id, full_name").eq("tenant_id", tenantId).in("id", customerIds) : null,
    recorderIds.length ? db.from("profiles").select("id, full_name").in("id", recorderIds) : null,
  ]);
  return {
    customerMap: new Map((customers?.data ?? []).map(({ id, full_name }) => [id, full_name?.trim() ?? ""])),
    profileMap: new Map((profiles?.data ?? []).map(({ id, full_name }) => [id, full_name?.trim() ?? ""])),
  };
}
