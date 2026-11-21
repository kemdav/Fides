"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleStaffActiveAction } from "@/app/actions/staff";
import { AdminButton } from "@/components/admin/admin-button";
import { Modal } from "@/components/ui/modal";
import { ManageStaffModal, type ManagedStaff } from "./manage-staff-modal";

interface StaffProfileActionsProps {
  tenantId: string;
  basePath: string;
  staff: ManagedStaff;
}

export function StaffProfileActions({ tenantId, basePath, staff }: StaffProfileActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const action = staff.active ? "Deactivate" : "Activate";

  async function changeStatus() {
    setSaving(true);
    setError("");
    try {
      const result = await toggleStaffActiveAction({ tenantId, staffId: staff.id, active: !staff.active });
      if (!result.success) {
        setError(result.error || "Unable to update staff status.");
        return;
      }
      setConfirming(false);
      setMessage(staff.active ? "Staff member deactivated." : "Staff member activated.");
      router.refresh();
    } catch {
      setError("Unable to update staff status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="primary" size="xs" aria-haspopup="dialog" onClick={() => { setMessage(""); setEditing(true); }}>Edit Staff</AdminButton>
        <AdminButton variant="outline" size="xs" aria-haspopup="dialog" onClick={() => {
          setMessage("");
          setError("");
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
      <Modal
        open={confirming}
        onClose={() => { if (!saving) setConfirming(false); }}
        labelledBy="staff-status-title"
        className="m-auto max-w-sm"
      >
        <h2 id="staff-status-title" className="font-display text-[22px] text-ink">{action} staff member?</h2>
        <p className="mt-2 text-sm text-muted">
          {staff.active ? "Mark" : "Restore"} {staff.fullName} as {staff.active ? "inactive" : "active"} in the staff roster.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <AdminButton variant="outline" size="xs" disabled={saving} onClick={() => setConfirming(false)}>Cancel</AdminButton>
          <AdminButton variant={staff.active ? "danger" : "primary"} size="xs" disabled={saving} onClick={changeStatus}>
            {saving ? "Saving…" : action}
          </AdminButton>
        </div>
      </Modal>
    </div>
  );
}
