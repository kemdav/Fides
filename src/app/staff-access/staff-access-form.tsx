"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { fieldOutlineClasses, TextField } from "@/components/admin/fields";
import { PasswordInput } from "@/components/ui/password-input";
import { accessStaffWorkspaceAction } from "@/app/actions/staff-invitations";

export function StaffAccessForm({ token, workspace, invitedEmail }: {
  token: string; workspace: string; invitedEmail?: string;
}) {
  const [create, setCreate] = useState(Boolean(invitedEmail));
  const [workspaceSlug, setWorkspaceSlug] = useState(workspace);
  const [email, setEmail] = useState(invitedEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const passwordClass = `${fieldOutlineClasses} h-11 w-full px-3 text-sm text-ink disabled:bg-mist`;
  const title = create ? "Create your staff account" : invitedEmail ? "Sign in to accept the invitation" : "Sign in to your staff workspace";
  const description = create
    ? "Choose a password for the email address below. Creating your account also accepts the invitation and opens your staff workspace."
    : invitedEmail
      ? "Use the password for your existing Fides account. Signing in with the invited email accepts the invitation and opens your staff workspace."
      : "Enter your workspace and the email and password you use for staff access.";
  const submitLabel = create ? "Create account and accept" : invitedEmail ? "Sign in and accept" : "Sign in";

  function selectMode(nextCreate: boolean) {
    if (busy || create === nextCreate) return;
    setCreate(nextCreate);
    setPassword("");
    setConfirmation("");
    setError("");
  }

  async function submit(form: FormData) {
    if (create && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
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
    <section aria-labelledby="staff-access-heading" className="min-w-0 px-6 py-7 sm:px-10 md:py-10">
      <header className="space-y-2">
        <h1 id="staff-access-heading" className="font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </header>

      {invitedEmail && (
        <div role="group" aria-label="How to accept this invitation" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-mist p-1">
          {[
            { create: true, label: "Create account" },
            { create: false, label: "I already have an account" },
          ].map((option) => (
            <button key={option.label} type="button" aria-pressed={create === option.create} disabled={busy}
              onClick={() => selectMode(option.create)}
              className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 sm:px-3 ${create === option.create ? "bg-white text-burnt-dark shadow-sm" : "text-muted hover:text-ink"}`}>
              {option.label}
            </button>
          ))}
        </div>
      )}

      <form action={submit} className="mt-6 space-y-4" aria-busy={busy}>
        <input type="hidden" name="invite" value={token} />
        {!invitedEmail && (
          <TextField name="workspace" label="Workspace slug" autoComplete="off" placeholder="bella-vita"
            value={workspaceSlug} onChange={setWorkspaceSlug} required disabled={busy} />
        )}
        <TextField label={invitedEmail ? "Invited email address" : "Email address"} type="email" name="email"
          autoComplete="username" value={email} onChange={setEmail} readOnly={Boolean(invitedEmail)} required disabled={busy} />
        <div className="space-y-2">
          <label htmlFor="staff-password" className="block text-sm font-semibold">{create ? "Create password" : "Password"}</label>
          <PasswordInput key={create ? "create" : "sign-in"} id="staff-password" name="password"
            autoComplete={create ? "new-password" : "current-password"} value={password}
            onChange={(event) => setPassword(event.target.value)} inputClassName={passwordClass}
            aria-describedby={create ? "staff-password-help" : undefined} minLength={create ? 8 : undefined} required disabled={busy} />
          {create && <p id="staff-password-help" className="text-xs text-muted">Use at least 8 characters.</p>}
        </div>
        {create && (
          <div className="space-y-2">
            <label htmlFor="staff-password-confirmation" className="block text-sm font-semibold">Confirm password</label>
            <PasswordInput id="staff-password-confirmation" name="confirmPassword" fieldLabel="password confirmation"
              autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              inputClassName={passwordClass} minLength={8} required disabled={busy} />
          </div>
        )}
        {error && <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{error}</p>}
        <Button variant="brand" size="form" type="submit" className="w-full" disabled={busy}>
          {busy ? (create ? "Creating account…" : "Signing in…") : submitLabel}
        </Button>
      </form>
    </section>
  );
}
