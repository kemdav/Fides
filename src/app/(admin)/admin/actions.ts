"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/admin/session";
import { composeRejectionReason } from "@/lib/admin/rejection";
import { assertAdminAction } from "@/lib/admin/access";
import {
  approveApplication,
  changePlan,
  createDocumentLink,
  type DocumentLink,
  deactivatePlan,
  deleteApplication,
  rejectApplication,
  resendApprovalEmail,
  savePlan,
  sendReminders,
  ServiceError,
  setAccess,
  type DecisionResult,
  type PlanInput,
} from "@/lib/applications/service";

export type ActionResult = { ok: true; message: string; warning?: string } | { ok: false; error: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run(task: () => Promise<DecisionResult>): Promise<ActionResult> {
  try {
    await assertAdminAction();
    const result = await task();
    revalidatePath("/admin", "layout");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

function checkId(id: string) {
  if (!uuid.test(id)) throw new ServiceError("Invalid account reference.", 400);
}

function checkReason(reason: string) {
  const length = reason.trim().length;
  if (length < 10 || length > 500) throw new ServiceError("Enter a reason between 10 and 500 characters.", 400);
}

export async function approveAction(id: string) {
  return run(async () => {
    checkId(id);
    return approveApplication(id);
  });
}

/** Reject = email the applicant the reason + a link to register again, then erase everything submitted. */
export async function rejectAction(id: string, reasons: string[], custom: string) {
  return run(async () => {
    checkId(id);
    const reason = composeRejectionReason(reasons, custom);
    if (!reason) throw new ServiceError("Choose at least one reason or write a custom reason.", 400);
    return rejectApplication(id, reason);
  });
}

export async function deleteAction(id: string) {
  return run(async () => {
    checkId(id);
    return deleteApplication(id);
  });
}

export async function accessAction(ids: string[], access: "active" | "suspended", reason: string) {
  return run(async () => {
    ids.forEach(checkId);
    checkReason(reason);
    return setAccess(ids, access, reason.trim());
  });
}

export async function planAction(id: string, planCode: string, reason: string) {
  return run(async () => {
    checkId(id);
    checkReason(reason);
    return changePlan(id, planCode, reason.trim());
  });
}

export async function remindAction(ids: string[]) {
  return run(async () => {
    ids.forEach(checkId);
    return sendReminders(ids);
  });
}

export async function resendAction(id: string) {
  return run(async () => {
    checkId(id);
    return resendApprovalEmail(id);
  });
}

export async function savePlanAction(input: PlanInput) {
  return run(async () => savePlan(input));
}

export async function removePlanAction(code: string) {
  return run(async () => deactivatePlan(code));
}

export async function signOutAdminAction(): Promise<void> {
  await clearAdminSession();
  redirect("/login");
}

export type DocumentLinkResult = ({ ok: true } & DocumentLink) | { ok: false; error: string };

/** Signed, short-lived link to one private application document (view or download). */
export async function documentLinkAction(documentId: string, download = false): Promise<DocumentLinkResult> {
  try {
    await assertAdminAction();
    checkId(documentId);
    const link = await createDocumentLink(documentId, download);
    return { ok: true, ...link };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    return { ok: false, error: error instanceof Error ? error.message : "Could not open the document." };
  }
}
