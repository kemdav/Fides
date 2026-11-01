import { NextRequest, NextResponse } from "next/server";
import { statusTransitionSchema } from "@/lib/account-request/schema";
import { updateAccountRequestStatus } from "@/lib/account-request/store";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = statusTransitionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid status transition.",
        },
        { status: 400 }
      );
    }

    const result = await updateAccountRequestStatus(
      id,
      parsed.data.status,
      parsed.data.reviewerNotes,
      parsed.data.reviewedBy
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update account request status.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
