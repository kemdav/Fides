import { NextRequest, NextResponse } from "next/server";
import { resetRequestActionSchema } from "@/lib/account-request/schema";
import {
  completeAccountPasswordReset,
  lookupApplicationByIdentifier,
  requestAccountPasswordReset,
  resendApplicationActivation,
  resetAndReviseApplication,
} from "@/lib/account-request/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetRequestActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Invalid reset account request payload.",
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    switch (payload.action) {
      case "request_password_reset": {
        const result = await requestAccountPasswordReset({
          email: payload.email,
          scope: payload.scope,
          tenantSlug: payload.tenantSlug,
        });
        return NextResponse.json({
          mode: "request_password_reset",
          ...result,
        });
      }

      case "complete_password_reset": {
        const account = await completeAccountPasswordReset({
          email: payload.email,
          resetToken: payload.resetToken,
          newPassword: payload.newPassword,
        });
        return NextResponse.json({
          mode: "complete_password_reset",
          account,
        });
      }

      case "lookup_application": {
        const record = lookupApplicationByIdentifier(payload.identifier);
        if (!record) {
          return NextResponse.json(
            {
              error: `No onboarding request found matching "${payload.identifier}". Try REQ-2026-4821, REQ-2026-3910, or camille@brightsmiles.ph.`,
            },
            { status: 404 }
          );
        }
        return NextResponse.json({
          mode: "lookup_application",
          record,
        });
      }

      case "resend_activation": {
        const result = await resendApplicationActivation(payload.requestId);
        return NextResponse.json({
          mode: "resend_activation",
          ...result,
        });
      }

      case "reset_and_revise_application": {
        const result = await resetAndReviseApplication(payload.requestId, {
          businessName: payload.businessName,
          category: payload.category,
          slug: payload.slug,
          ownerName: payload.ownerName,
          ownerEmail: payload.ownerEmail,
          phone: payload.phone,
          address: payload.address,
          estimatedStaff: payload.estimatedStaff,
          notes: payload.notes,
        });
        return NextResponse.json({
          mode: "reset_and_revise_application",
          ...result,
        });
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process reset account request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
