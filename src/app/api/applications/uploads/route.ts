import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/applications/service";
import { signDocumentUpload } from "@/lib/applications/staged-documents";
import { limitByClient, MINUTES } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // public endpoint used before an applicant has an account
  if (await limitByClient("application-uploads", { limit: 45, windowMs: 15 * MINUTES })) {
    return NextResponse.json({ error: "Too many upload requests. Please try again later." }, { status: 429 });
  }
  try {
    const raw = await request.json().catch(() => null);
    return NextResponse.json(await signDocumentUpload(raw));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[application-uploads] could not authorize verification upload");
    return NextResponse.json({ error: "Could not start the upload. Please retry." }, { status: 500 });
  }
}
