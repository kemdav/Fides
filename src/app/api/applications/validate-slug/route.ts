import { NextResponse } from "next/server";
import { checkRequestedSlug } from "@/lib/applications/service";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  try {
    return NextResponse.json(await checkRequestedSlug(slug));
  } catch {
    return NextResponse.json({ error: "Could not check subdomain availability." }, { status: 503 });
  }
}
