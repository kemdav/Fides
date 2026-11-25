"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { PageContent, Surface } from "@/components/admin/primitives";
import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";
import type { CompletionItem } from "./completion-checklist";
import { LiveSitePreview } from "./live-site-preview";
import { SetupDialog } from "./setup-dialog";
import { SetupProgress } from "./setup-progress";
import { mockCheckAddress, settingsForPublish, stepIssue, websiteAddress, type PreviewService, type SetupStep, type SettingsPatch, type VerificationState } from "./setup-data";
import { StepWelcome } from "./step-welcome";
import { StepBrandIdentity } from "./step-brand-identity";
import { StepHomepage } from "./step-homepage";
import { StepBusinessDetails } from "./step-business-details";
import { StepWebsiteAddress } from "./step-website-address";
import { StepSearchSharing } from "./step-search-sharing";
import { StepPreviewPublish } from "./step-preview-publish";
import { useWebsiteDraft } from "./use-website-draft";

const stepCopy = [
  ["Let's get your website ready", "Give customers a place to discover your business and book online."],
  ["Make it yours", "A consistent name, logo, and palette help customers recognize your business."],
  ["Say hello to your customers", "Your homepage gives visitors a first impression and a clear way to book."],
  ["Help customers find and reach you", "Accurate contact details and hours help customers plan their visit."],
  ["Your link to share", "A memorable address makes it easier to share your website with customers."],
  ["Look good on Google and social", "Clear titles and descriptions help people understand your website when they find or share it."],
  ["See it, then go live", "Review your website on both devices and complete the checklist before publishing."],
] as const;
const required: { step: SetupStep; label: string }[] = [
  { step: 1, label: "Brand identity" },
  { step: 2, label: "Homepage headline" },
  { step: 3, label: "Business email and phone" },
  { step: 4, label: "Confirmed website address" },
];

export function SetupWizard({ userId, services, entryStep, verification = "ready", checkSubdomain = mockCheckAddress, onPublish }: {
  userId: string;
  services: PreviewService[];
  entryStep?: SetupStep;
  verification?: VerificationState;
  checkSubdomain?: (address: string) => Promise<boolean>;
  onPublish?: (data: WebsiteSettingsData) => Promise<void>;
}) {
  const { tenant, draft, setDraft, ready, savedDraft, saveError, persist } = useWebsiteDraft(userId, entryStep);
  const router = useRouter();
  const dashboardPath = `/${tenant.slug}/dashboard`;
  const [stepError, setStepError] = React.useState("");
  const [reviewError, setReviewError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [modal, setModal] = React.useState<"preview" | "exit" | "review" | "published" | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  const { data, step } = draft;
  const simulated = !onPublish;
  const setupFinished = draft.published !== null;

  React.useEffect(() => {
    if (!ready || setupFinished || draft === savedDraft) return;
    const timer = window.setTimeout(() => void persist(draft).catch(() => undefined), 400);
    return () => window.clearTimeout(timer);
  }, [draft, persist, ready, savedDraft, setupFinished]);

  React.useEffect(() => {
    if (!ready || setupFinished) return;
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [step, ready, setupFinished]);

  React.useEffect(() => {
    if (ready && setupFinished && modal !== "published") router.replace(dashboardPath);
  }, [dashboardPath, modal, ready, router, setupFinished]);

  const checkAddress = React.useCallback((address: string) =>
    address === tenant.slug ? Promise.resolve(true) : checkSubdomain(address), [checkSubdomain, tenant.slug]);

  function checklist(value: WebsiteSettingsData): CompletionItem[] {
    return [
      ...required.map(({ label, step }) => ({ label, step, issue: stepIssue(step, value, draft.confirmedSubdomain) })),
      { label: "At least one active service", href: `${dashboardPath}/services`, issue: services.length ? undefined : "Add at least one service to publish" },
      ...(stepIssue(5, value, draft.confirmedSubdomain) ? [{ label: "Search & sharing", step: 5 as const, issue: stepIssue(5, value, draft.confirmedSubdomain) }] : []),
    ];
  }

  const items = checklist(data);
  const completed = items.slice(0, required.length).filter((item) => !item.issue).length + Number(draft.searchReviewed) + Number(setupFinished);
  const publishBlocked = items.some((item) => item.issue) || verification !== "ready";

  const patch: SettingsPatch = (values) => {
    setDraft((current) => ({
      ...current,
      data: { ...current.data, ...values },
      confirmedSubdomain: values.subdomain !== undefined && values.subdomain.trim().toLowerCase() !== current.confirmedSubdomain ? "" : current.confirmedSubdomain,
    }));
    if (stepError) setStepError("");
  };

  function confirmSubdomain(address: string) {
    setDraft((current) => ({ ...current, data: { ...current.data, subdomain: address }, confirmedSubdomain: address }));
    setStepError("");
  }

  function goTo(next: SetupStep) {
    const url = new URL(window.location.href);
    if (next !== 1 && url.searchParams.get("step") === "branding") {
      url.searchParams.delete("step");
      window.history.replaceState(null, "", url);
    }
    setStepError("");
    setDraft((current) => ({ ...current, step: next }));
  }

  function advance() {
    const issue = stepIssue(step, data, draft.confirmedSubdomain);
    if (issue) {
      setStepError(issue);
      return;
    }
    if (step === 5) setDraft((current) => ({ ...current, step: 6, searchReviewed: true }));
    else if (step < 5) goTo((step + 1) as SetupStep);
  }

  function skipSearch() {
    setStepError("");
    setDraft((current) => ({ ...current, step: 6, searchReviewed: true }));
  }

  async function finishLater() {
    setBusy(true);
    try {
      await persist(draft);
      setModal("exit");
    } catch { /* The autosave status displays the error. */ }
    finally { setBusy(false); }
  }

  function publishIssue(value: WebsiteSettingsData) {
    if (verification === "pending") return "Complete business verification to publish.";
    if (verification === "suspended") return "Publishing is suspended for this workspace.";
    return checklist(value).find((item) => item.issue)?.issue;
  }

  async function confirmPublish() {
    setBusy(true);
    setReviewError("");
    try {
      const issue = publishIssue(data);
      if (issue) throw new Error(issue);
      const normalized = settingsForPublish(data);
      const snapshot = { ...draft, data: normalized, published: normalized, searchReviewed: true };
      await onPublish?.(normalized);
      await persist(snapshot);
      setDraft(snapshot);
      setModal("published");
    } catch (error) {
      setModal("review");
      setReviewError(error instanceof Error ? error.message : "Could not complete the publish preview.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || (setupFinished && modal !== "published")) {
    return <main className="grid min-h-dvh place-items-center bg-powder p-4 text-sm text-muted"><p role="status">{ready ? "Returning to your dashboard…" : "Loading website setup…"}</p></main>;
  }

  const stepProps = { data, onChange: patch };
  const preview = () => setModal("preview");

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink">
      <header className="sticky top-0 z-30 border-b border-hairline bg-white/95 shadow-xs backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl leading-none text-burnt">Fides</span>
              <span className="border-l border-line pl-3 text-sm font-semibold text-body">Website setup</span>
            </div>
            <AdminButton size="xs" variant="outline" disabled={busy} onClick={() => void finishLater()}>Finish later</AdminButton>
          </div>
          <div className="border-t border-hairline py-3"><SetupProgress step={step} completed={completed} /></div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1">
        <PageContent>
          <div className={`grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:gap-10 ${step === 0 ? "lg:py-6" : ""}`}>
            <div className="min-w-0 space-y-5">
              <div className="space-y-2.5">
                {step === 0 && <p className="text-sm font-semibold text-burnt">Your first booking website</p>}
                <h1 ref={heading} tabIndex={-1} className={`font-display leading-[1.08] outline-none ${step === 0 ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>{stepCopy[step][0]}</h1>
                <p className="max-w-lg text-sm leading-relaxed text-body sm:text-base">{stepCopy[step][1]}</p>
              </div>
              {step === 0 ? (
                <div className="space-y-5">
                  <StepWelcome />
                  <AdminButton size="sm" disabled={busy} onClick={advance}>Start setup</AdminButton>
                </div>
              ) : (
                <Surface className="space-y-5 border border-hairline">
                  {step === 1 && <StepBrandIdentity {...stepProps} />}
                  {step === 2 && <StepHomepage {...stepProps} />}
                  {step === 3 && <StepBusinessDetails {...stepProps} />}
                  {step === 4 && <StepWebsiteAddress {...stepProps} confirmedSubdomain={draft.confirmedSubdomain} onConfirm={confirmSubdomain} checkAddress={checkAddress} />}
                  {step === 5 && <StepSearchSharing {...stepProps} />}
                  {step === 6 && <StepPreviewPublish items={items} onStep={goTo} verification={verification} onPreview={preview} />}
                  {stepError && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">{stepError}</p>}
                </Surface>
              )}
            </div>
            <aside aria-label="Live website preview" className="min-w-0 rounded-2xl bg-burnt/8 p-2.5 sm:p-3.5 lg:sticky lg:top-36">
              <LiveSitePreview data={data} services={services} onExpand={preview} />
            </aside>
          </div>
        </PageContent>
      </div>

      <footer className="sticky bottom-0 z-20 mt-auto border-t border-hairline bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
          <div className="space-y-1 text-xs text-muted">
            <p>You can change any of this later in Website settings.</p>
            <p role="status" className={saveError ? "font-semibold text-danger" : "flex items-center gap-1 font-semibold text-success"}>
              {!saveError && <Icon name={draft === savedDraft ? "check" : "clock"} className="size-3.5" />}
              {saveError || (draft === savedDraft ? "Saved just now" : "Saving...")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {step > 0 && <AdminButton size="xs" variant="outline" disabled={busy} onClick={() => goTo((step - 1) as SetupStep)}>Back</AdminButton>}
            {step === 5 && <button type="button" onClick={skipSearch} className="rounded px-1.5 py-2 text-xs font-semibold text-body hover:text-burnt focus-visible:outline-2 focus-visible:outline-burnt">Skip for now</button>}
            {step > 0 && step < 6 && <AdminButton size="xs" disabled={busy} onClick={advance}>Save & continue</AdminButton>}
            {step === 6 && (
              <AdminButton size="xs" disabled={busy || publishBlocked} onClick={() => { setReviewError(""); setModal("review"); }}>Publish</AdminButton>
            )}
          </div>
        </div>
      </footer>

      {modal === "preview" && (
        <SetupDialog title="Full website preview" wide onClose={() => setModal(null)}>
          <LiveSitePreview data={data} services={services} large />
        </SetupDialog>
      )}
      {modal === "exit" && (
        <SetupDialog title="Draft saved" onClose={() => setModal(null)} actions={
          <>
            <AdminButton size="xs" variant="outline" onClick={() => setModal(null)}>Keep editing</AdminButton>
            <AdminButton size="xs" onClick={() => router.push(dashboardPath)}>Back to dashboard</AdminButton>
          </>
        }>
          <p>Your draft and current step are saved in this browser. Return from your dashboard whenever you’re ready.</p>
        </SetupDialog>
      )}
      {modal === "review" && (
        <SetupDialog title={simulated ? "Review your publish preview" : "Publish your first website?"} onClose={() => { if (!busy) setModal(null); }} actions={
          <>
            <AdminButton size="xs" variant="outline" disabled={busy} onClick={() => setModal(null)}>Keep editing</AdminButton>
            <AdminButton size="xs" disabled={busy} onClick={confirmPublish}>{busy ? "Publishing…" : "Publish website"}</AdminButton>
          </>
        }>
          <p>{simulated ? "This publish preview is saved in this browser." : "Your booking website will be available to customers."}</p>
          <p className="break-all font-mono text-xs">{websiteAddress(data.subdomain)}</p>
          {reviewError && <p role="alert" className="text-danger">{reviewError}</p>}
        </SetupDialog>
      )}
      {modal === "published" && (
        <SetupDialog title={simulated ? "Publish preview complete" : "Your website is live"} onClose={() => router.replace(dashboardPath)} actions={
          <AdminButton size="xs" onClick={() => router.replace(dashboardPath)}>Back to dashboard</AdminButton>
        }>
          <p>{simulated ? "Your website setup is saved in this browser." : websiteAddress(data.subdomain)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-burnt">
            <Link className="hover:underline" href={`${dashboardPath}/services`}>Manage your services</Link>
            <Link className="hover:underline" href={`${dashboardPath}/staff`}>Invite your team</Link>
          </div>
        </SetupDialog>
      )}
    </div>
  );
}
