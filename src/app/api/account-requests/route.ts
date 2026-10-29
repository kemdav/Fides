import { NextRequest, NextResponse } from "next/server";
import {
  accountRequestSchema,
  type TenantStatus,
} from "@/lib/account-request/schema";
import {
  createAccountRequest,
  getActiveTenants,
  listAccountRequests,
  listPlatformAccounts,
} from "@/lib/account-request/store";


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? "all";
  const searchParam = searchParams.get("search") ?? "";
  const tenantSlug = searchParams.get("tenant") ?? undefined;

  const validStatuses = ["all", "pending", "active", "suspended", "archived"];
  const status = (
    validStatuses.includes(statusParam) ? statusParam : "all"
  ) as TenantStatus | "all";

  const data = listAccountRequests({ status, search: searchParam });
  const activeTenants = getActiveTenants();
  const accounts = listPlatformAccounts(tenantSlug);

  return NextResponse.json({
    ...data,
    activeTenants,
    accounts,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = accountRequestSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstIssue?.message ?? "Invalid account request data.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const result = await createAccountRequest(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to submit account request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
