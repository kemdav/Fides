"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toggleStaffActiveAction } from "@/app/actions/staff";
import { StaffConfirmationDialog } from "./staff-confirmation-dialog";

export function StaffStatusDialog({ tenantId, staff, lastOwnerProtected = false, onClose, onChanged }: {
  tenantId: string;
  staff: { id: string; fullName: string; active: boolean };
  lastOwnerProtected?: boolean;
  onClose: () => void;
  onChanged: (active: boolean) => void;
}) {
  const [protectedOwner, setProtectedOwner] = useState(lastOwnerProtected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const action = staff.active ? "Deactivate" : "Activate";

  async function confirm() {
    if (saving || protectedOwner) return;
    setSaving(true);
    setError("");
    try {
      const result = await toggleStaffActiveAction({ tenantId, staffId: staff.id, active: !staff.active });
      if (result.lastOwnerProtected) setProtectedOwner(true);
      else if (result.success) onChanged(!staff.active);
      else setError(result.error ?? "Staff status could not be changed.");
    } catch {
      setError("Staff status could not be changed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaffConfirmationDialog
      title={protectedOwner ? "Last owner protected" : `${action} staff member?`}
      tone={staff.active ? "warning" : undefined}
      busy={saving}
      onClose={onClose}
      error={error}
      description={protectedOwner
          ? `${staff.fullName} is the only active owner. Assign another active owner before deactivating this staff member or changing their owner role.`
          : `${staff.fullName} will be marked as ${staff.active ? "inactive" : "active"} in the staff roster.`}
    >
        {protectedOwner ? (
          <Button variant="brand" size="xs" onClick={onClose}>Keep owner role</Button>
        ) : (
          <>
            <Button variant="secondary" size="xs" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="xs" variant={staff.active ? "danger" : "brand"} onClick={confirm} disabled={saving}>
              {saving ? "Saving…" : action}
            </Button>
          </>
        )}
    </StaffConfirmationDialog>
  );
}
