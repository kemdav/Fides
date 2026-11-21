"use client";

import * as React from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { updateStaffMemberAction } from "@/app/actions/staff";

export function EditStaffModal<T extends { id: string; fullName: string; title: string }>({
  tenantId,
  staff,
  onClose,
  onUpdated,
  showToast,
}: {
  tenantId?: string;
  staff: T;
  onClose: () => void;
  onUpdated: (item: T) => void;
  showToast: (msg: string) => void;
}) {
  const [fullName, setFullName] = React.useState(staff.fullName);
  const [title, setTitle] = React.useState(staff.title);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      showToast("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateStaffMemberAction({
        staffId: staff.id,
        tenantId: tenantId ?? "",
        fullName: fullName.trim(),
        title: title.trim(),
      });
      if (!res.success) {
        showToast(res.error || "Failed to update.");
        return;
      }
      onUpdated({ ...staff, fullName: fullName.trim(), title: title.trim() });
      showToast(`${fullName.trim()} updated.`);
      onClose();
    } catch {
      showToast("Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-[10px] bg-white p-6 shadow-2xl border border-line">
        <h3 className="font-display text-[22px] leading-tight text-ink">Edit Staff Member</h3>
        <p className="mt-1 text-sm text-muted">Update {staff.fullName}&apos;s details.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Full name *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1">Public title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 rounded-lg border border-hairline bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-burnt/40" />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <AdminButton variant="outline" size="xs" onClick={onClose} disabled={saving}>Cancel</AdminButton>
          <AdminButton variant="primary" size="xs" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
