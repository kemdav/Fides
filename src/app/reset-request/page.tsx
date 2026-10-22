"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { Container } from "@/components/layout/container";
import {
  BUSINESS_CATEGORIES,
  type AccountRequestRecord,
  type AuthScope,
  type BusinessCategory,
  type DispatchedEmailRecord,
  STAFF_SIZE_TIERS,
  type StaffSizeTier,
} from "@/lib/account-request/schema";

type ResetMode = "password" | "application";

function ResetRequestContent() {
  const searchParams = useSearchParams();
  const initialMode: ResetMode =
    searchParams.get("mode") === "application" || searchParams.get("ref")
      ? "application"
      : "password";

  const [mode, setMode] = React.useState<ResetMode>(initialMode);

  // Mode A: Account Credential Reset
  const [accountScope, setAccountScope] =
    React.useState<AuthScope>("client_owner");
  const [tenantSlug, setTenantSlug] = React.useState("apexdental");
  const [resetEmail, setResetEmail] = React.useState(
    searchParams.get("email") ?? "elena@apexdental.ph"
  );
  const [issuedToken, setIssuedToken] = React.useState<string | null>(
    searchParams.get("token")
  );
  const [tokenInput, setTokenInput] = React.useState(
    searchParams.get("token") ?? ""
  );
  const [newPassword, setNewPassword] = React.useState("");
  const [passwordStatus, setPasswordStatus] = React.useState<string | null>(
    null
  );
  const [passwordEmailLog, setPasswordEmailLog] =
    React.useState<DispatchedEmailRecord | null>(null);
  const [loadingPasswordAction, setLoadingPasswordAction] =
    React.useState(false);

  // Mode B: Onboarding Application Lookup & Reset
  const [lookupInput, setLookupInput] = React.useState(
    searchParams.get("ref") ?? "REQ-2026-3910"
  );
  const [foundRequest, setFoundRequest] =
    React.useState<AccountRequestRecord | null>(null);
  const [editingRevision, setEditingRevision] = React.useState(false);
  const [revBusinessName, setRevBusinessName] = React.useState("");
  const [revCategory, setRevCategory] =
    React.useState<BusinessCategory>("dental");
  const [revSlug, setRevSlug] = React.useState("");
  const [revOwnerName, setRevOwnerName] = React.useState("");
  const [revOwnerEmail, setRevOwnerEmail] = React.useState("");
  const [revPhone, setRevPhone] = React.useState("");
  const [revAddress, setRevAddress] = React.useState("");
  const [revStaff, setRevStaff] = React.useState<StaffSizeTier>("1-5");
  const [revNotes, setRevNotes] = React.useState("");
  const [appStatusMessage, setAppStatusMessage] = React.useState<string | null>(
    null
  );
  const [appEmailLog, setAppEmailLog] =
    React.useState<DispatchedEmailRecord | null>(null);
  const [loadingAppAction, setLoadingAppAction] = React.useState(false);

  const populateRevisionForm = (record: AccountRequestRecord) => {
    setRevBusinessName(record.businessName);
    setRevCategory(record.category);
    setRevSlug(record.slug);
    setRevOwnerName(record.ownerName);
    setRevOwnerEmail(record.ownerEmail);
    setRevPhone(record.phone);
    setRevAddress(record.address);
    setRevStaff(record.estimatedStaff);
    setRevNotes(record.notes);
  };

  const handleLookupApplication = React.useCallback(
    async (identifierToLookup: string) => {
      if (!identifierToLookup.trim()) return;
      setLoadingAppAction(true);
      setAppStatusMessage(null);
      try {
        const res = await fetch("/api/account-requests/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "lookup_application",
            identifier: identifierToLookup.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFoundRequest(null);
          setAppStatusMessage(data.error ?? "Application not found.");
          return;
        }
        setFoundRequest(data.record);
        populateRevisionForm(data.record);
      } catch {
        setAppStatusMessage("Network error while looking up application.");
      } finally {
        setLoadingAppAction(false);
      }
    },
    []
  );

  React.useEffect(() => {
    const targetToLoad = searchParams.get("ref") ?? "REQ-2026-3910";
    let active = true;
    fetch("/api/account-requests/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "lookup_application",
        identifier: targetToLoad,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.record) {
          setFoundRequest(data.record);
          populateRevisionForm(data.record);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [searchParams]);

  const handleRequestPasswordToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPasswordAction(true);
    setPasswordStatus(null);
    try {
      const res = await fetch("/api/account-requests/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_password_reset",
          email: resetEmail,
          scope: accountScope,
          tenantSlug: accountScope === "fides_admin" ? undefined : tenantSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus(data.error ?? "Could not issue password reset request.");
        return;
      }

      setIssuedToken(data.resetToken);
      setTokenInput(data.resetToken);
      setPasswordEmailLog(data.emailDispatched);
      setPasswordStatus(
        `Recovery token ${data.resetToken} generated for ${resetEmail}. Enter it below to set a new password.`
      );
    } catch {
      setPasswordStatus("Failed to request password reset.");
    } finally {
      setLoadingPasswordAction(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPasswordAction(true);
    setPasswordStatus(null);
    try {
      const res = await fetch("/api/account-requests/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_password_reset",
          email: resetEmail,
          resetToken: tokenInput,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus(data.error ?? "Failed to update password.");
        return;
      }

      setIssuedToken(null);
      setNewPassword("");
      setPasswordStatus(
        `Password updated for ${data.account.fullName} (${data.account.email}). You can now sign in on the Log In page.`
      );
    } catch {
      setPasswordStatus("Network error while completing password reset.");
    } finally {
      setLoadingPasswordAction(false);
    }
  };

  const handleResendActivation = async () => {
    if (!foundRequest) return;
    setLoadingAppAction(true);
    setAppStatusMessage(null);
    try {
      const res = await fetch("/api/account-requests/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend_activation",
          requestId: foundRequest.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppStatusMessage(data.error ?? "Unable to resend activation token.");
        return;
      }

      setFoundRequest(data.record);
      setAppEmailLog(data.emailDispatched);
      setAppStatusMessage(
        `Fresh activation token (${data.record.resetToken}) sent to ${data.record.ownerEmail}.`
      );
    } catch {
      setAppStatusMessage("Failed to resend activation email.");
    } finally {
      setLoadingAppAction(false);
    }
  };

  const handleResetAndReviseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundRequest) return;
    setLoadingAppAction(true);
    setAppStatusMessage(null);
    try {
      const res = await fetch("/api/account-requests/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_and_revise_application",
          requestId: foundRequest.id,
          businessName: revBusinessName,
          category: revCategory,
          slug: revSlug,
          ownerName: revOwnerName,
          ownerEmail: revOwnerEmail,
          phone: revPhone,
          address: revAddress,
          estimatedStaff: revStaff,
          notes: revNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppStatusMessage(data.error ?? "Unable to revise application.");
        return;
      }

      setFoundRequest(data.record);
      setAppEmailLog(data.emailDispatched);
      setEditingRevision(false);
      setAppStatusMessage(
        `Application ${data.record.referenceCode} reset to Pending Review (Revision #${data.record.revisionCount}).`
      );
    } catch {
      setAppStatusMessage("Network error while revising application.");
    } finally {
      setLoadingAppAction(false);
    }
  };

  return (
    <Container className="flex flex-col gap-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-900 underline underline-offset-4">
          Fides Home
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">Reset Account Request (CPG-62)</span>
        <span>·</span>
        <Link href="/request-account" className="hover:text-neutral-900 underline underline-offset-4">
          Request Account (CPG-61)
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          CPG-62 · Temporary Recovery Surface
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
          Reset Account Request
        </h1>
        <p className="max-w-2xl text-base text-neutral-600">
          Request a credential password reset for any account scope (Client
          Business, Users under a Client, or Fides Admin) or reset and revise a
          pending clinic onboarding request.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant={mode === "password" ? "solid" : "outline"}
            onClick={() => setMode("password")}
          >
            Account Credential Reset
          </Button>
          <Button
            variant={mode === "application" ? "solid" : "outline"}
            onClick={() => setMode("application")}
          >
            Onboarding Request Reset
          </Button>
        </div>
      </header>

      {mode === "password" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <form onSubmit={handleRequestPasswordToken}>
              <CardHeader>
                <CardTitle>Step 1: Request Recovery Token</CardTitle>
                <CardDescription>
                  Select the account scope and enter the registered email.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {passwordStatus && (
                  <div
                    role="status"
                    className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900"
                  >
                    {passwordStatus}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={accountScope === "client_owner" ? "solid" : "outline"}
                    onClick={() => {
                      setAccountScope("client_owner");
                      setTenantSlug("apexdental");
                      setResetEmail("elena@apexdental.ph");
                    }}
                  >
                    Client Business (Owner)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={accountScope === "client_user" ? "solid" : "outline"}
                    onClick={() => {
                      setAccountScope("client_user");
                      setTenantSlug("apexdental");
                      setResetEmail("sofia.cruz@apexdental.ph");
                    }}
                  >
                    User Under Client
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={accountScope === "fides_admin" ? "solid" : "outline"}
                    onClick={() => {
                      setAccountScope("fides_admin");
                      setResetEmail("admin@fides.app");
                    }}
                  >
                    Fides Admin
                  </Button>
                </div>

                {accountScope !== "fides_admin" && (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="resetTenantSlug"
                      className="text-sm font-medium text-neutral-900"
                    >
                      Clinic Tenant Subdomain
                    </label>
                    <select
                      id="resetTenantSlug"
                      value={tenantSlug}
                      onChange={(e) => setTenantSlug(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                    >
                      <option value="apexdental">
                        Apex Dental Clinic (apexdental.fides.app)
                      </option>
                      <option value="luminaortho">
                        Lumina Orthodontics (luminaortho.fides.app)
                      </option>
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="resetEmail"
                    className="text-sm font-medium text-neutral-900"
                  >
                    Account Email Address *
                  </label>
                  <Input
                    id="resetEmail"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loadingPasswordAction}>
                  {loadingPasswordAction
                    ? "Sending..."
                    : "Send Reset Account Request"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <form onSubmit={handleCompletePasswordReset}>
              <CardHeader>
                <CardTitle>Step 2: Complete Credential Reset</CardTitle>
                <CardDescription>
                  {issuedToken
                    ? `Active token issued: ${issuedToken}`
                    : "Enter the recovery token and your new password."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="tokenInput"
                    className="text-sm font-medium text-neutral-900"
                  >
                    Recovery Token *
                  </label>
                  <Input
                    id="tokenInput"
                    required
                    placeholder="PWD-XXXXXX"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="newPassword"
                    className="text-sm font-medium text-neutral-900"
                  >
                    New Password (min 8 characters) *
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                {passwordEmailLog && (
                  <div className="rounded-md border border-neutral-200 p-3 text-xs text-neutral-600">
                    <p className="font-medium text-neutral-900">
                      {passwordEmailLog.subject}
                    </p>
                    <p className="mt-1">{passwordEmailLog.summary}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap justify-between gap-2">
                <Link
                  href="/request-account"
                  className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                >
                  Request New Account (CPG-61)
                </Link>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={loadingPasswordAction || !tokenInput}
                >
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Lookup Onboarding Request</CardTitle>
                  <CardDescription>
                    Enter a Reference ID, work email, or subdomain slug.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["REQ-2026-3910", "REQ-2026-4821", "REQ-2026-1042"].map(
                    (code) => (
                      <Button
                        key={code}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLookupInput(code);
                          handleLookupApplication(code);
                        }}
                      >
                        {code}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookupApplication(lookupInput);
                }}
                className="flex gap-2"
              >
                <Input
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                  placeholder="REQ-2026-XXXX or email"
                />
                <Button type="submit" disabled={loadingAppAction}>
                  Lookup
                </Button>
              </form>

              {appStatusMessage && (
                <div
                  role="status"
                  className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900"
                >
                  {appStatusMessage}
                </div>
              )}
            </CardContent>
          </Card>

          {foundRequest && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {foundRequest.businessName} ({foundRequest.referenceCode})
                </CardTitle>
                <CardDescription>
                  Subdomain: {foundRequest.slug}.fides.app · Status:{" "}
                  {foundRequest.status} · Revision #{foundRequest.revisionCount}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm text-neutral-600">
                <div>
                  <strong className="text-neutral-900">Owner:</strong>{" "}
                  {foundRequest.ownerName} ({foundRequest.ownerEmail}) ·{" "}
                  {foundRequest.phone}
                </div>

                {foundRequest.reviewerNotes && (
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <strong className="text-neutral-900">Reviewer Notes:</strong>{" "}
                    {foundRequest.reviewerNotes}
                  </div>
                )}

                {appEmailLog && (
                  <div className="rounded-md border border-neutral-200 p-3 text-xs">
                    <p className="font-medium text-neutral-900">
                      {appEmailLog.subject}
                    </p>
                    <p className="mt-1">{appEmailLog.summary}</p>
                  </div>
                )}

                {editingRevision && (
                  <form
                    onSubmit={handleResetAndReviseSubmit}
                    className="grid gap-4 border-t border-neutral-200 pt-4 sm:grid-cols-2"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Business Name *
                      </label>
                      <Input
                        required
                        value={revBusinessName}
                        onChange={(e) => setRevBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Subdomain Slug *
                      </label>
                      <Input
                        required
                        value={revSlug}
                        onChange={(e) => setRevSlug(e.target.value.toLowerCase())}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Category *
                      </label>
                      <select
                        value={revCategory}
                        onChange={(e) =>
                          setRevCategory(e.target.value as BusinessCategory)
                        }
                        className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                      >
                        {BUSINESS_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Staff Size *
                      </label>
                      <select
                        value={revStaff}
                        onChange={(e) =>
                          setRevStaff(e.target.value as StaffSizeTier)
                        }
                        className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                      >
                        {STAFF_SIZE_TIERS.map((t) => (
                          <option key={t} value={t}>
                            {t} members
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Owner Name *
                      </label>
                      <Input
                        required
                        value={revOwnerName}
                        onChange={(e) => setRevOwnerName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Owner Email *
                      </label>
                      <Input
                        type="email"
                        required
                        value={revOwnerEmail}
                        onChange={(e) => setRevOwnerEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Phone *
                      </label>
                      <Input
                        required
                        value={revPhone}
                        onChange={(e) => setRevPhone(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Address *
                      </label>
                      <Input
                        required
                        value={revAddress}
                        onChange={(e) => setRevAddress(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-neutral-900">
                        Updated Notes
                      </label>
                      <Input
                        value={revNotes}
                        onChange={(e) => setRevNotes(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end gap-2">
                      <Button type="submit" disabled={loadingAppAction}>
                        Submit Revised Request
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingAppAction}
                  onClick={handleResendActivation}
                >
                  Resend Activation Link
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditingRevision((prev) => !prev)}
                >
                  {editingRevision
                    ? "Cancel Revision"
                    : "Reset & Revise Application"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      )}
    </Container>
  );
}

export default function ResetRequestPage() {
  return (
    <main className="min-h-dvh py-16">
      <Suspense
        fallback={
          <Container>
            <p className="text-sm text-neutral-500">Loading Reset Request...</p>
          </Container>
        }
      >
        <ResetRequestContent />
      </Suspense>
    </main>
  );
}
