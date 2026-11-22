"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/admin-button";
import { TextField } from "@/components/admin/fields";
import { accessStaffWorkspaceAction } from "@/app/actions/staff-invitations";

export function StaffAccessForm({ token, workspace, invitedEmail }: { token: string; workspace: string; invitedEmail?: string }) {
  const [create, setCreate] = useState(Boolean(invitedEmail));
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace);
  const [email, setEmail] = useState(invitedEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    form.set("intent", create ? "create" : "sign-in");
    try {
      const result = await accessStaffWorkspaceAction(form);
      if (result?.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="invite" value={token} />
      {workspace && !invitedEmail ? <input type="hidden" name="workspace" value={workspace} /> : null}
      {!workspace && !invitedEmail && (
        <TextField name="workspace" label="Workspace slug" placeholder="bella-vita" value={workspaceSlug} onChange={setWorkspaceSlug} required />
      )}
      <TextField label="Email address" type="email" name="email" autoComplete="email" value={email} onChange={setEmail} readOnly={Boolean(invitedEmail)} required />
      <TextField label="Password" type="password" name="password" autoComplete={create ? "new-password" : "current-password"}
        value={password} onChange={setPassword} minLength={create ? 8 : undefined} required />
      {create && (
        <TextField label="Confirm password" type="password" name="confirmPassword" autoComplete="new-password" value={confirmation} onChange={setConfirmation} required />
      )}
      {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{error}</p>}
      <AdminButton type="submit" className="w-full" disabled={busy}>
        {busy ? "Please wait…" : create ? "Create account and accept" : invitedEmail ? "Sign in and accept" : "Sign in"}
      </AdminButton>
      {invitedEmail && (
        <button type="button" disabled={busy} onClick={() => { setCreate(!create); setError(""); }}
          className="text-sm font-medium text-burnt hover:underline">
          {create ? "Already have an account? Sign in and accept" : "Create a new staff account"}
        </button>
      )}
    </form>
  );
}
