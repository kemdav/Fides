"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ForgotPasswordFlow } from "@/app/login/forgot-password-flow";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@/components/ui";

export function ResetRequestFlow({ initialMode, initialEmail, initialReference }: {
  initialMode: "password" | "application";
  initialEmail: string;
  initialReference: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [reference, setReference] = useState(initialReference);
  const [recovering, setRecovering] = useState(false);
  const [lookingUp, startLookup] = useTransition();

  return (
    <main className="min-h-dvh bg-powder px-4 py-12 sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/login" className="text-sm font-semibold text-burnt hover:underline">Back to login</Link>
        <h1 className="font-display text-4xl text-ink">Reset request</h1>
        <div className="flex flex-wrap gap-2">
          <Button aria-pressed={mode === "password"} variant={mode === "password" ? "solid" : "outline"} onClick={() => setMode("password")}>
            Account credential reset
          </Button>
          <Button aria-pressed={mode === "application"} variant={mode === "application" ? "solid" : "outline"} onClick={() => setMode("application")}>
            Onboarding request
          </Button>
        </div>
        {mode === "password" ? (
          <Card>
            <CardHeader>
              <CardTitle>Reset your password</CardTitle>
              <CardDescription>Use your registered email to receive a recovery code.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); setRecovering(true); }}>
                <label htmlFor="reset-email" className="text-sm font-medium">Account email</label>
                <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                <Button type="submit" className="w-fit">Continue</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Find your application</CardTitle>
              <CardDescription>Use the reference from your submission confirmation to see your current status and next steps.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3" onSubmit={(event) => {
                event.preventDefault();
                const code = reference.trim().toUpperCase();
                if (code) startLookup(() => router.push(`/request-account/status/${encodeURIComponent(code)}`));
              }}>
                <label htmlFor="application-reference" className="text-sm font-medium">Application reference</label>
                <Input id="application-reference" required maxLength={80} value={reference} onChange={(event) => setReference(event.target.value)} />
                <Button type="submit" disabled={lookingUp} className="w-fit">{lookingUp ? "Checking status…" : "Check application status"}</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <ForgotPasswordFlow open={recovering} initialEmail={email} onClose={() => setRecovering(false)} />
    </main>
  );
}
