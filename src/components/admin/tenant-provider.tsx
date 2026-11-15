"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { accessAction, approveAction, deleteAction, planAction, rejectAction, remindAction, resendAction } from "@/app/(admin)/admin/actions";
import { isRenewingSoon, type PlanSummary, type Tenant, type TenantAccess } from "@/lib/admin/tenants";
import { AdminModal } from "./admin-modal";
import {
  BulkAccessDialog,
  DeleteTenantDialog,
  SchedulePlanDialog,
  SuspendDialog,
  TenantDialog,
  type BulkAccessMode,
  type TenantChange,
} from "./tenant-dialogs";
import { ApproveDialog, DeleteApplicationDialog, RejectDialog, ResultDialog } from "./verification-dialogs";

export type PendingAccount = { id: string; business: string; owner: string; email: string; plan: string; reference: string; submittedAt: string };

type DialogState =
  | { type: "tenant"; id: string }
  | { type: "suspend"; id: string }
  | { type: "delete"; id: string }
  | { type: "pending-approve"; id: string }
  | { type: "pending-reject"; id: string }
  | { type: "pending-delete"; id: string }
  | { type: "schedule"; id: string; plan: string; access: TenantAccess }
  | { type: "bulk"; mode: BulkAccessMode; ids: string[]; onApplied?: () => void }
  | { type: "result"; title: string; message: string };

type TenantsContextValue = {
  tenants: Tenant[];
  pending: PendingAccount[];
  plans: PlanSummary[];
  now: number;
  mailConfigured: boolean;
  busy: boolean;
  openDelete: (id: string) => void;
  openPending: (action: "approve" | "reject" | "delete", id: string) => void;
  openTenant: (id: string) => void;
  openBulkAccess: (mode: BulkAccessMode, ids: string[], onApplied?: () => void) => void;
  sendReminders: (ids: string[]) => void;
  showResult: (title: string, message: string) => void;
};

const TenantsContext = createContext<TenantsContextValue | null>(null);

export function useTenants() {
  const value = useContext(TenantsContext);
  if (!value) throw new Error("useTenants must be used inside TenantsProvider");
  return value;
}

export function TenantsProvider({
  tenants,
  pending = [],
  plans,
  now,
  mailConfigured,
  children,
}: {
  tenants: Tenant[];
  pending?: PendingAccount[];
  plans: PlanSummary[];
  now: number;
  mailConfigured: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const close = () => setDialog(null);
  const tenantFor = (id: string) => tenants.find((tenant) => tenant.id === id);
  const pendingFor = (id: string) => pending.find((item) => item.id === id);
  const currentPending = dialog && dialog.type.startsWith("pending-") ? pendingFor((dialog as { id: string }).id) : undefined;
  const current = dialog && (dialog.type === "tenant" || dialog.type === "suspend" || dialog.type === "schedule" || dialog.type === "delete")
    ? tenantFor(dialog.id)
    : undefined;

  function report(result: { ok: boolean; message?: string; warning?: string; error?: string }, title: string) {
    if (result.ok) {
      setDialog({ type: "result", title, message: [result.message, result.warning].filter(Boolean).join(" ") });
      router.refresh();
    } else {
      setDialog({ type: "result", title: "Action failed", message: result.error ?? "Something went wrong." });
    }
  }

  function setAccess(ids: string[], access: TenantAccess, reason: string, title: string, onApplied?: () => void) {
    startTransition(async () => {
      const result = await accessAction(ids, access, reason);
      if (result.ok) onApplied?.();
      report(result, title);
    });
  }

  function save(tenant: Tenant, change: TenantChange) {
    if (change.plan !== tenant.planCode) {
      setDialog({ type: "schedule", id: tenant.id, plan: change.plan, access: change.access });
      return;
    }
    setAccess([tenant.id], change.access, change.reason, "Tenant changes saved");
  }

  function showResult(title: string, message: string) {
    setDialog({ type: "result", title, message });
  }

  function remind(ids: string[]) {
    startTransition(async () => {
      report(await remindAction(ids), "Reminders sent");
    });
  }

  return (
    <TenantsContext.Provider
      value={{
        tenants,
        pending,
        plans,
        now,
        mailConfigured,
        busy,
        openDelete: (id) => setDialog({ type: "delete", id }),
        openPending: (action, id) =>
          setDialog(action === "approve" ? { type: "pending-approve", id } : action === "reject" ? { type: "pending-reject", id } : { type: "pending-delete", id }),
        openTenant: (id) => setDialog({ type: "tenant", id }),
        openBulkAccess: (mode, ids, onApplied) => setDialog({ type: "bulk", mode, ids, onApplied }),
        sendReminders: (ids) => {
          const due = tenants.filter((tenant) => ids.includes(tenant.id) && isRenewingSoon(tenant, now));
          if (due.length === 0) {
            showResult("Reminders not sent", "No selected tenant has a renewal due within 7 days.");
            return;
          }
          remind(due.map((tenant) => tenant.id));
        },
        showResult,
      }}
    >
      {children}
      <AdminModal open={dialog !== null} onClose={close}>
        {dialog?.type === "tenant" && current ? (
          <TenantDialog
            key={current.id + current.access}
            tenant={current}
            onClose={close}
            onSuspend={() => setDialog({ type: "suspend", id: current.id })}
            onResend={() => startTransition(async () => report(await resendAction(current.id), "Approval email"))}
            onDelete={() => setDialog({ type: "delete", id: current.id })}
            onSave={(change) => save(current, change)}
          />
        ) : null}
        {dialog?.type === "suspend" && current ? (
          <SuspendDialog
            tenant={current}
            onCancel={close}
            onConfirm={(reason) => setAccess([current.id], "suspended", reason, "Tenant changes saved")}
          />
        ) : null}
        {dialog?.type === "delete" && current ? (
          <DeleteTenantDialog
            tenant={current}
            onCancel={close}
            onConfirm={() => startTransition(async () => report(await deleteAction(current.id), "Account deleted"))}
          />
        ) : null}
        {dialog?.type === "schedule" && current ? (
          <SchedulePlanDialog
            tenant={current}
            plan={dialog.plan}
            onCancel={close}
            onConfirm={(plan, reason) =>
              startTransition(async () => {
                const result = await planAction(current.id, plan, reason);
                if (result.ok && dialog.access !== current.access) {
                  await accessAction([current.id], dialog.access, reason);
                }
                report(result, "Plan changed");
              })
            }
          />
        ) : null}
        {dialog?.type === "bulk" ? (
          <BulkAccessDialog
            mode={dialog.mode}
            tenants={dialog.ids.map(tenantFor).filter((tenant): tenant is Tenant => Boolean(tenant))}
            onCancel={close}
            onConfirm={(reason) =>
              setAccess(dialog.ids, dialog.mode === "suspend" ? "suspended" : "active", reason, "Tenant changes saved", dialog.onApplied)
            }
          />
        ) : null}
        {dialog?.type === "pending-approve" && currentPending ? (
          <ApproveDialog
            business={currentPending.business}
            busy={busy}
            onCancel={close}
            onConfirm={() => startTransition(async () => report(await approveAction(currentPending.id), "Merchant approved"))}
          />
        ) : null}
        {dialog?.type === "pending-reject" && currentPending ? (
          <RejectDialog
            business={currentPending.business}
            email={currentPending.email}
            busy={busy}
            onCancel={close}
            onConfirm={(reasons, custom) =>
              startTransition(async () => report(await rejectAction(currentPending.id, reasons, custom), "Submission rejected"))
            }
          />
        ) : null}
        {dialog?.type === "pending-delete" && currentPending ? (
          <DeleteApplicationDialog
            business={currentPending.business}
            busy={busy}
            onCancel={close}
            onConfirm={() => startTransition(async () => report(await deleteAction(currentPending.id), "Account deleted"))}
          />
        ) : null}
        {dialog?.type === "result" ? (
          <ResultDialog title={dialog.title} message={dialog.message} failed={dialog.title === "Action failed"} onDone={close} />
        ) : null}
      </AdminModal>
    </TenantsContext.Provider>
  );
}
