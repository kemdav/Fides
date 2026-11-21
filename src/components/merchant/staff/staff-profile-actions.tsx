"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-button";
import { ManageStaffModal, type ManagedStaff } from "./manage-staff-modal";
import { StaffStatusDialog } from "./staff-status-dialog";

interface StaffProfileActionsProps {
  tenantId: string;
  basePath: string;
  staff: ManagedStaff;
  lastOwnerProtected: boolean;
}

export function StaffProfileActions({ tenantId, basePath, staff, lastOwnerProtected }: StaffProfileActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const action = staff.active ? "Deactivate" : "Activate";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="primary" size="xs" aria-haspopup="dialog" onClick={() => { setMessage(""); setEditing(true); }}>Edit Staff</AdminButton>
        <AdminButton variant="outline" size="xs" aria-haspopup="dialog" onClick={() => {
          setMessage("");
          setConfirming(true);
        }}>
          {action} Staff
        </AdminButton>
      </div>
      {message && (
        <p role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-ink px-4 py-3 text-xs text-white shadow-lg">{message}</p>
      )}
      {editing && (
        <ManageStaffModal
          tenantId={tenantId}
          basePath={basePath}
          staff={staff}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setMessage("Staff changes saved.");
            router.refresh();
          }}
        />
      )}
      {confirming && (
        <StaffStatusDialog tenantId={tenantId} staff={staff} lastOwnerProtected={lastOwnerProtected}
          onClose={() => setConfirming(false)}
          onChanged={(active) => {
            setConfirming(false);
            setMessage(active ? "Staff member activated." : "Staff member deactivated.");
            router.refresh();
          }} />
      )}
    </div>
  );
}
