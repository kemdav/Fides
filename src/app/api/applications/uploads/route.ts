import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/applications/service";
import { signDocumentUpload } from "@/lib/applications/staged-documents";

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    return NextResponse.json(await signDocumentUpload(raw));
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not authorize verification upload", error);
    return NextResponse.json({ error: "Could not start the upload. Please retry." }, { status: 500 });
  }
}
