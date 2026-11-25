import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { buildSubscriptionInvoicePdf } from "@/lib/subscription-pdf";
import type { SubscriptionInvoice } from "@/types/subscription";

interface RouteContext {
  params: Promise<{ invoiceId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { invoiceId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const client = supabase as unknown as SupabaseClient;
  const { data: inv, error } = await client
    .from("subscription_invoices")
    .select(
      "id, tenant_id, invoice_number, invoice_kind, tier_name, billing_period_start, billing_period_end, issued_at, due_at, paid_at, subtotal_cents, vat_cents, total_cents, amount_paid_cents, status, billed_to_name, billed_to_address, billed_to_tin, billed_to_branch, billed_to_email"
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !inv) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", inv.tenant_id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { data: settingsRow } = await client
    .from("tenant_settings")
    .select("time_zone")
    .eq("tenant_id", inv.tenant_id)
    .maybeSingle();

  const timeZone =
    typeof settingsRow?.time_zone === "string" && settingsRow.time_zone.trim()
      ? settingsRow.time_zone.trim()
      : "Asia/Manila";

  const invoice: SubscriptionInvoice = {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    invoiceKind: inv.invoice_kind,
    tierName: inv.tier_name,
    billingPeriodStart: inv.billing_period_start,
    billingPeriodEnd: inv.billing_period_end,
    issuedAt: inv.issued_at,
    dueAt: inv.due_at,
    paidAt: inv.paid_at,
    subtotalCents: inv.subtotal_cents,
    vatCents: inv.vat_cents,
    totalCents: inv.total_cents,
    amountPaidCents: inv.amount_paid_cents,
    balanceDueCents: Math.max(0, inv.total_cents - inv.amount_paid_cents),
    status: inv.status,
    billedToName: inv.billed_to_name,
    billedToAddress: inv.billed_to_address,
    billedToTin: inv.billed_to_tin,
    billedToBranch: inv.billed_to_branch,
    billedToEmail: inv.billed_to_email,
    latestPaymentSubmission: null,
  };

  const pdfBytes = buildSubscriptionInvoicePdf(invoice, timeZone);

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}