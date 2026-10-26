import { NextRequest, NextResponse } from "next/server";
import { validateSlugAvailability } from "@/lib/account-request/store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  const excludeId = searchParams.get("excludeId") ?? undefined;

  const result = validateSlugAvailability(slug, excludeId);
  return NextResponse.json(result);
}
