import { NextResponse } from "next/server";
import { limitByClient, MINUTES } from "@/lib/rate-limit";
import { ServiceError, submitApplication, type DocumentUploads } from "@/lib/applications/service";
import { ALL_DOCUMENTS, documentFieldName } from "@/lib/registration/options";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (await limitByClient("applications", { limit: 6, windowMs: 60 * MINUTES })) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }
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
    const documents: DocumentUploads = {};
    for (const doc of ALL_DOCUMENTS) {
      const file = form.get(documentFieldName(doc.key));
      if (file instanceof File && file.size > 0) documents[doc.key] = file;
    }
    const result = await submitApplication(raw, logo instanceof File && logo.size > 0 ? logo : null, documents);
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
