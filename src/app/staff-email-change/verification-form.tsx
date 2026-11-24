"use client";

import { useActionState } from "react";
import { verifyStaffEmailChangeAction } from "@/app/actions/staff-email-change";
import { AdminButton } from "@/components/admin/admin-button";
import { fieldOutlineClasses } from "@/components/admin/fields";
import { PasswordInput } from "@/components/ui/password-input";

export function StaffEmailVerificationForm({ token, email }: {
  token: string;
  email: string;
}) {
  const [{ error }, verify, busy] = useActionState(verifyStaffEmailChangeAction, { error: null });

  return (
    <form action={verify} className="space-y-5" aria-busy={busy}>
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <label htmlFor="staff-verification-email" className="block text-sm font-semibold">New sign-in email</label>
        <input id="staff-verification-email" type="email" autoComplete="username" value={email} readOnly
          className={`${fieldOutlineClasses} h-11 w-full cursor-default bg-mist px-3 text-sm text-muted`} />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-verification-password" className="block text-sm font-semibold">Current password</label>
        <PasswordInput id="staff-verification-password" name="password" autoComplete="current-password"
          inputClassName={`${fieldOutlineClasses} h-11 w-full px-3 text-sm`}
          aria-describedby="staff-verification-help" required disabled={busy} />
        <p id="staff-verification-help" className="text-xs leading-relaxed text-muted">Use the password you already sign in to Fides with.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{error}</p>}
      <AdminButton type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? "Verifying and signing in…" : "Verify Email"}
      </AdminButton>
    </form>
  );
}
