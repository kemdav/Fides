"use server";

// thin entry points for the admin portal. rules live in the service, the guard and
// input checks in adminAction.
import { revalidatePath } from "next/cache";
import {
  applicationInput,
  changePlanInput,
  documentLinkInput,
  rejectApplicationInput,
  remindersInput,
  saveTierInput,
  tenantAccessInput,
  tierInput,
} from "@/features/admin/schema";
import { adminAction } from "@/lib/admin/action";
import type { AdminOutcome } from "@/features/admin/run";
import {
  approveApplication,
  changePlan,
  createDocumentLink,
  deactivatePlan,
  deleteApplication,
  rejectApplication,
  resendApprovalEmail,
  savePlan,
  sendReminders,
  setAccess,
  type DecisionResult,
  type DocumentLink,
} from "@/lib/applications/service";
import type { ActionResult } from "@/lib/result";

export type DecisionValue = { warning?: string };

/** pages that show plan names and prices */
function refreshPlanPages(): void {
  for (const path of ["/", "/register", "/request-account", "/llms.txt"]) revalidatePath(path);
}

/** a finished decision refreshes every admin screen */
async function decided(result: Promise<DecisionResult>): Promise<AdminOutcome<DecisionValue>> {
  const { message, warning } = await result;
  revalidatePath("/admin", "layout");
  return { value: { warning }, message };
}

export async function approveApplicationAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("approve", applicationInput, input, ({ applicationId }, admin) => decided(approveApplication(applicationId, admin)));
}

export async function rejectApplicationAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("reject", rejectApplicationInput, input, ({ applicationId, reason }, admin) =>
    decided(rejectApplication(applicationId, reason, admin))
  );
}

export async function resendApprovalEmailAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("resend-approval", applicationInput, input, ({ applicationId }) => decided(resendApprovalEmail(applicationId)));
}

export async function deleteApplicationAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("delete-application", applicationInput, input, ({ applicationId }, admin) =>
    decided(deleteApplication(applicationId, admin))
  );
}

export async function setTenantAccessAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("tenant-access", tenantAccessInput, input, ({ applicationIds, access, reason }, admin) =>
    decided(setAccess(applicationIds, access, reason, admin))
  );
}

export async function changeTenantPlanAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("change-plan", changePlanInput, input, ({ applicationId, planCode, reason }, admin) =>
    decided(changePlan(applicationId, planCode, reason, admin))
  );
}

export async function sendBillingRemindersAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("billing-reminders", remindersInput, input, ({ applicationIds }) => decided(sendReminders(applicationIds)));
}

export async function saveTierAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("save-tier", saveTierInput, input, async (tier, admin) => {
    const outcome = await decided(savePlan(tier, admin));
    refreshPlanPages();
    return outcome;
  });
}

export async function deactivateTierAction(input: unknown): Promise<ActionResult<DecisionValue>> {
  return adminAction("deactivate-tier", tierInput, input, async ({ code }, admin) => {
    const outcome = await decided(deactivatePlan(code, admin));
    refreshPlanPages();
    return outcome;
  });
}

export async function documentLinkAction(input: unknown): Promise<ActionResult<DocumentLink>> {
  return adminAction("document-link", documentLinkInput, input, async ({ documentId, download }) => ({
    value: await createDocumentLink(documentId, download),
  }));
}
