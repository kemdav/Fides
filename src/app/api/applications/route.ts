import { NextResponse } from "next/server";
import { DocumentUploadError, ServiceError, submitApplication, type DocumentUploads } from "@/lib/applications/service";
import { applicationDocumentsFor, BUSINESS_LOGO_REQUIRED, documentFieldName } from "@/lib/registration/options";
import { loadStagedDocuments } from "@/lib/applications/staged-documents";
import { hasRegistrationEmailProof } from "@/lib/auth/registration-email";
import { registrationSchema } from "@/lib/registration/schema";
import { limitByClient, MINUTES } from "@/lib/rate-limit";

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

    const parsed = registrationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application details." }, { status: 400 });
    }
    if (!hasRegistrationEmailProof(parsed.data.email, form.get("emailProof"))) {
      return NextResponse.json({
        error: "Verify your business email before submitting your application.",
        emailVerificationRequired: true,
      }, { status: 403 });
    }

    const logo = form.get("logo");
    if (!(logo instanceof File) || logo.size === 0) {
      return NextResponse.json({ error: BUSINESS_LOGO_REQUIRED }, { status: 400 });
    }
    const requiredDocuments = applicationDocumentsFor(parsed.data.businessType);
    if (form.has("uploadedDocuments")) {
      const staged = await loadStagedDocuments(form.get("uploadedDocuments"), requiredDocuments);
      const result = await submitApplication(parsed.data, logo, staged.documents);
      await staged.cleanup();
      return NextResponse.json(result, { status: 201 });
    }
    const documents: DocumentUploads = {};
    for (const doc of requiredDocuments) {
      const file = form.get(documentFieldName(doc.key));
      if (file instanceof File && file.size > 0) documents[doc.key] = file;
    }
    const result = await submitApplication(parsed.data, logo, documents);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      return NextResponse.json({ error: error.message, documentKey: error.key }, { status: error.status });
    }
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/applications]", error);
    const detail = process.env.NODE_ENV !== "production" && error instanceof Error ? ` (${error.message})` : "";
    return NextResponse.json({ error: `We could not submit your application. Please try again.${detail}` }, { status: 500 });
  }
}
