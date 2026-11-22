"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-button";
import { ManageStaffModal, type ManagedStaff } from "./manage-staff-modal";
import { StaffStatusDialog } from "./staff-status-dialog";
import { StaffSuccessDialog, type StaffSuccessDetails } from "./staff-confirmation-dialog";

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
  const [success, setSuccess] = useState<StaffSuccessDetails | null>(null);
  const action = staff.active ? "Deactivate" : "Activate";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="primary" size="xs" aria-haspopup="dialog" onClick={() => setEditing(true)}>Edit Staff</AdminButton>
        <AdminButton variant="outline" size="xs" aria-haspopup="dialog" onClick={() => setConfirming(true)}>
          {action} Staff
        </AdminButton>
      </div>
      {success && <StaffSuccessDialog {...success} onClose={() => setSuccess(null)} />}
      {editing && (
        <ManageStaffModal
          tenantId={tenantId}
          basePath={basePath}
          staff={staff}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSuccess({ title: "Staff changes saved", description: "The staff profile has been updated." });
            router.refresh();
          }}
        />
      )}
      {confirming && (
        <StaffStatusDialog tenantId={tenantId} staff={staff} lastOwnerProtected={lastOwnerProtected}
          onClose={() => setConfirming(false)}
          onChanged={(active) => {
            setConfirming(false);
            setSuccess({
              title: active ? "Staff member activated" : "Staff member deactivated",
              description: `${staff.fullName} is now marked as ${active ? "active" : "inactive"} in the roster.`,
            });
            router.refresh();
          }} />
      )}
    </div>
  );
}
