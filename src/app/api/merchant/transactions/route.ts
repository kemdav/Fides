import { NextRequest, NextResponse } from "next/server";
import { getMerchantTransactions } from "@/lib/merchant/overview";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (profileError) {
      return NextResponse.json(
        { error: `Failed to resolve merchant: ${profileError.message}` },
        { status: 500 }
      );
    }
    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "No active merchant tenant." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const page = Number(params.get("page") ?? "1");
    const pageSize = Number(params.get("pageSize") ?? "25");
    const search = params.get("search")?.trim() || undefined;
    const statusParam = params.get("status");
    const status = ["pending", "paid", "refunded", "voided", "failed"].includes(statusParam ?? "")
      ? statusParam as Database["public"]["Enums"]["payment_status"]
      : undefined;
    const sortParam = params.get("sort");
    const sort = sortParam === "amount_cents" || sortParam === "status"
      ? sortParam
      : "paid_at";
    const direction = params.get("direction") === "asc" ? "asc" : "desc";

    const result = await getMerchantTransactions(supabase, {
      tenantId: profile.tenant_id,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25,
      search,
      status,
      sort,
      direction,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[GET /api/merchant/transactions]", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
