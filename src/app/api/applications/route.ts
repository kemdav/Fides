import { NextResponse } from "next/server";
import { ServiceError, submitApplication } from "@/lib/applications/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const payload = form.get("payload");
    if (typeof payload !== "string") {
      return NextResponse.json({ error: "Missing application details." }, { status: 400 });
    }

    let raw: unknown;
    try {
      raw = JSON.parse(payload);
    } catch {
      return NextResponse.json({ error: "Invalid application details." }, { status: 400 });
    }

    const logo = form.get("logo");
    const result = await submitApplication(raw, logo instanceof File && logo.size > 0 ? logo : null);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/applications]", error);
    const detail = process.env.NODE_ENV !== "production" && error instanceof Error ? ` (${error.message})` : "";
    return NextResponse.json({ error: `We could not submit your application. Please try again.${detail}` }, { status: 500 });
  }
}
