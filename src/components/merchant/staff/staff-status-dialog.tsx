"use client";

import { useState } from "react";
import { toggleStaffActiveAction } from "@/app/actions/staff";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";

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
    <Modal open unstyled onClose={() => { if (!saving) onClose(); }} labelledBy="staff-status-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[14px] border border-line bg-white px-5 py-6 text-center text-ink shadow-2xl sm:p-7">
      {staff.active && (
        <span className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-danger-bg text-danger">
          <Icon name="alert" weight="bold" className="size-9" />
        </span>
      )}
      <h2 id="staff-status-title" className="text-lg font-semibold">
        {protectedOwner ? "Last owner protected" : `${action} staff member?`}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-body">
        {protectedOwner
          ? `${staff.fullName} is the only active owner. Assign another active owner before deactivating this staff member or changing their owner role.`
          : `${staff.fullName} will be marked as ${staff.active ? "inactive" : "active"} in the staff roster.`}
      </p>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {protectedOwner ? (
          <AdminButton variant="primary" size="xs" onClick={onClose}>Keep owner role</AdminButton>
        ) : (
          <>
            <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>Cancel</AdminButton>
            <AdminButton variant={staff.active ? "danger" : "primary"} size="xs" onClick={confirm} disabled={saving}>
              {saving ? "Saving…" : action}
            </AdminButton>
          </>
        )}
      </div>
    </Modal>
  );
}
