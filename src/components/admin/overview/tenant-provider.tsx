"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { sampleTenants, type Tenant, type TenantAccess } from "@/lib/admin/tenants";
import { AdminModal } from "../admin-modal";
import { SchedulePlanDialog, SuspendDialog, TenantDialog, type TenantChange } from "../tenant-dialogs";
import { ResultDialog } from "../verification-dialogs";

type DialogState =
  | { type: "tenant"; id: string }
  | { type: "suspend"; id: string }
  | { type: "schedule"; id: string; plan: string; access: TenantAccess }
  | { type: "result"; title: string; message: string };

type TenantsContextValue = {
  tenants: Tenant[];
  openTenant: (id: string) => void;
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
  const current = dialog && dialog.type !== "result" ? tenantFor(dialog.id) : undefined;

  function setAccess(id: string, access: TenantAccess) {
    setTenants((list) => list.map((tenant) => (tenant.id === id ? { ...tenant, access } : tenant)));
  }

  function save(tenant: Tenant, change: TenantChange) {
    if (change.plan !== tenant.plan) {
      setDialog({ type: "schedule", id: tenant.id, plan: change.plan, access: change.access });
      return;
    }
    setAccess(tenant.id, change.access);
    setDialog({ type: "result", title: "Tenant changes saved", message: `${tenant.name} has been updated.` });
  }

  return (
    <TenantsContext.Provider value={{ tenants, openTenant: (id) => setDialog({ type: "tenant", id }) }}>
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
              setAccess(current.id, "suspended");
              setDialog({
                type: "result",
                title: "Tenant changes saved",
                message: `${current.name} has been suspended.`,
              });
            }}
          />
        ) : null}
        {dialog?.type === "schedule" && current ? (
          <SchedulePlanDialog
            tenant={current}
            plan={dialog.plan}
            onCancel={close}
            onConfirm={(plan) => {
              setAccess(current.id, dialog.access);
              setDialog({
                type: "result",
                title: "Plan change scheduled",
                message: `${current.name} moves to ${plan} at the next renewal.`,
              });
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
