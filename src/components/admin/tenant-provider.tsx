"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { isRenewingSoon, sampleTenants, type Tenant, type TenantAccess } from "@/lib/admin/tenants";
import { pluralize } from "@/lib/admin/tiers";
import { AdminModal } from "./admin-modal";
import {
  BulkAccessDialog,
  SchedulePlanDialog,
  SuspendDialog,
  TenantDialog,
  type BulkAccessMode,
  type TenantChange,
} from "./tenant-dialogs";
import { ResultDialog } from "./verification-dialogs";

type DialogState =
  | { type: "tenant"; id: string }
  | { type: "suspend"; id: string }
  | { type: "schedule"; id: string; plan: string; access: TenantAccess }
  | { type: "bulk"; mode: BulkAccessMode; ids: string[]; onApplied?: () => void }
  | { type: "result"; title: string; message: string };

type TenantsContextValue = {
  tenants: Tenant[];
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

export function TenantsProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState(sampleTenants);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const close = () => setDialog(null);
  const tenantFor = (id: string) => tenants.find((tenant) => tenant.id === id);
  const current = dialog && (dialog.type === "tenant" || dialog.type === "suspend" || dialog.type === "schedule")
    ? tenantFor(dialog.id)
    : undefined;

  function setAccess(ids: string[], access: TenantAccess) {
    setTenants((list) => list.map((tenant) => (ids.includes(tenant.id) ? { ...tenant, access } : tenant)));
  }

  function save(tenant: Tenant, change: TenantChange) {
    if (change.plan !== tenant.plan) {
      setDialog({ type: "schedule", id: tenant.id, plan: change.plan, access: change.access });
      return;
    }
    setAccess([tenant.id], change.access);
    setDialog({ type: "result", title: "Tenant changes saved", message: `${tenant.name} has been updated.` });
  }

  function showResult(title: string, message: string) {
    setDialog({ type: "result", title, message });
  }

  return (
    <TenantsContext.Provider
      value={{
        tenants,
        openTenant: (id) => setDialog({ type: "tenant", id }),
        openBulkAccess: (mode, ids, onApplied) => setDialog({ type: "bulk", mode, ids, onApplied }),
        sendReminders: (ids) => {
          const due = tenants.filter((tenant) => ids.includes(tenant.id) && isRenewingSoon(tenant));
          const skipped = ids.length - due.length;
          showResult(
            "Reminders sent",
            `Billing reminders were sent to ${pluralize(due.length, "tenant")}.${skipped ? ` ${skipped} skipped: no renewal due within 7 days.` : ""}`
          );
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
            onSave={(change) => save(current, change)}
          />
        ) : null}
        {dialog?.type === "suspend" && current ? (
          <SuspendDialog
            tenant={current}
            onCancel={close}
            onConfirm={() => {
              setAccess([current.id], "suspended");
              showResult("Tenant changes saved", `${current.name} has been suspended.`);
            }}
          />
        ) : null}
        {dialog?.type === "schedule" && current ? (
          <SchedulePlanDialog
            tenant={current}
            plan={dialog.plan}
            onCancel={close}
            onConfirm={(plan) => {
              setAccess([current.id], dialog.access);
              showResult("Plan change scheduled", `${current.name} moves to ${plan} at the next renewal.`);
            }}
          />
        ) : null}
        {dialog?.type === "bulk" ? (
          <BulkAccessDialog
            mode={dialog.mode}
            tenants={dialog.ids.map(tenantFor).filter((tenant): tenant is Tenant => Boolean(tenant))}
            onCancel={close}
            onConfirm={() => {
              setAccess(dialog.ids, dialog.mode === "suspend" ? "suspended" : "active");
              dialog.onApplied?.();
              showResult(
                "Tenant changes saved",
                `${pluralize(dialog.ids.length, "tenant")} ${dialog.mode === "suspend" ? "suspended" : "reactivated"}.`
              );
            }}
          />
        ) : null}
        {dialog?.type === "result" ? (
          <ResultDialog title={dialog.title} message={dialog.message} onDone={close} />
        ) : null}
      </AdminModal>
    </TenantsContext.Provider>
  );
}
