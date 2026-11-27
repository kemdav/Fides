import { NextResponse } from "next/server";
import { checkRequestedSlug } from "@/lib/applications/service";
import { limitByClient, MINUTES } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // public endpoint used before an applicant has an account
  if (await limitByClient("application-validate-slug", { limit: 60, windowMs: MINUTES })) {
    return NextResponse.json({ error: "Too many availability checks. Please try again later." }, { status: 429 });
  }
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  try {
    return NextResponse.json(await checkRequestedSlug(slug));
  } catch {
    return NextResponse.json({ error: "Could not check subdomain availability." }, { status: 503 });
  }
}
