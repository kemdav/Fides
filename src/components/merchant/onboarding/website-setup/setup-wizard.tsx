"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/admin/icon";
import { Surface } from "@/components/admin/primitives";
import { LivePreviewModal } from "@/components/merchant/website-settings/live-preview-modal";
import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";
import type { CompletionItem } from "./completion-checklist";
import { LiveSitePreview } from "./live-site-preview";
import { SetupDialog } from "./setup-dialog";
import { SetupProgress } from "./setup-progress";
import { STEP_LABELS, mockCheckAddress, settingsForPublish, stepIssue, websiteAddress, type PreviewService, type SetupStep, type SettingsPatch, type VerificationState } from "./setup-data";
import { StepWelcome } from "./step-welcome";
import { StepBrandIdentity } from "./step-brand-identity";
import { StepHomepage } from "./step-homepage";
import { StepBusinessDetails } from "./step-business-details";
import { StepWebsiteAddress } from "./step-website-address";
import { StepSearchSharing } from "./step-search-sharing";
import { StepPreviewPublish } from "./step-preview-publish";
import { previewFonts } from "./typography-select";
import { useWebsiteDraft } from "./use-website-draft";

const stepDescriptions = [
  "Give customers a place to discover your business and book online.",
  "Set the logo, display name, typography, and colors used across your website.",
  "Choose the headline, cover photo, and information customers see first.",
  "Add your public profile, contact details, location, and opening hours.",
  "Choose the address customers use to find and share your website.",
  "Set how your website appears in search results and on social media.",
  "Review your website on desktop and mobile before publishing.",
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
  const workspace = React.useRef<HTMLDivElement>(null);
  const { data, step } = draft;
  const simulated = !onPublish;
  const setupFinished = !simulated && draft.published !== null;

  React.useEffect(() => {
    if (!ready || setupFinished || draft === savedDraft) return;
    const timer = window.setTimeout(() => void persist(draft).catch(() => undefined), 400);
    return () => window.clearTimeout(timer);
  }, [draft, persist, ready, savedDraft, setupFinished]);

  React.useEffect(() => {
    if (!ready || setupFinished) return;
    workspace.current?.scrollTo(0, 0);
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
      { label: "Search & sharing", step: 5, issue: stepIssue(5, value, draft.confirmedSubdomain) },
    ];
  }

  const items = checklist(data);
  const completedSteps = required.filter((_, index) => !items[index].issue).map(({ step }) => step);
  if (draft.searchReviewed) completedSteps.push(5);
  if (draft.published) completedSteps.push(6);
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
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <aside aria-label="Website setup" className="shrink-0 border-b border-hairline bg-white lg:flex lg:w-[15.5rem] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-5 lg:pt-6 lg:pb-5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 lg:flex-col lg:gap-1">
            <span className="font-display text-2xl leading-tight text-burnt lg:text-[28px]">Fides</span>
            <span className="text-sm font-semibold text-body">Website setup</span>
          </div>
          <Button size="xs" variant="secondary" className="lg:hidden" disabled={busy} onClick={() => void finishLater()}>Finish later</Button>
        </div>
        <div className="border-t border-hairline px-4 py-3 sm:px-6 lg:mx-4 lg:px-0 lg:py-4">
          <SetupProgress step={step} completedSteps={completedSteps} onStep={goTo} disabled={busy} />
        </div>
        <div className="mt-auto hidden border-t border-hairline p-4 lg:block">
          <Button size="xs" variant="secondary" className="w-full" disabled={busy} onClick={() => void finishLater()}>Finish later</Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div ref={workspace} className="min-h-0 flex-1 lg:overflow-y-auto">
          <main className="space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
            <div className="space-y-1">
              <h1 ref={heading} tabIndex={-1} className="font-display text-[28px] leading-[38px] outline-none sm:text-[32px] sm:leading-[42px]">
                {step === 0 ? "Let's get your website ready" : STEP_LABELS[step]}
              </h1>
              <p className="max-w-[780px] text-sm leading-[21px] text-muted">{stepDescriptions[step]}</p>
            </div>

            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] 2xl:gap-6">
              <div className="min-w-0 space-y-4">
                <Surface className="space-y-5 border border-hairline">
                  {step === 0 && (
                    <>
                      <StepWelcome />
                      <Button variant="brand" size="form" disabled={busy} onClick={advance}>Start setup</Button>
                    </>
                  )}
                  {step === 1 && <StepBrandIdentity {...stepProps} />}
                  {step === 2 && <StepHomepage {...stepProps} />}
                  {step === 3 && <StepBusinessDetails {...stepProps} />}
                  {step === 4 && <StepWebsiteAddress {...stepProps} confirmedSubdomain={draft.confirmedSubdomain} onConfirm={confirmSubdomain} checkAddress={checkAddress} />}
                  {step === 5 && <StepSearchSharing {...stepProps} />}
                  {step === 6 && <StepPreviewPublish items={items} onStep={goTo} verification={verification} />}
                  {stepError && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">{stepError}</p>}
                </Surface>
              </div>
              <aside aria-label="Live website preview" className="min-w-0 lg:sticky lg:top-6">
                <LiveSitePreview data={data} services={services} onExpand={preview} />
              </aside>
            </div>
          </main>
        </div>

        <footer className="sticky bottom-0 z-20 mt-auto flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-hairline bg-white/95 px-4 py-3 shadow-[0_-2px_12px_rgb(44_58_75/0.06)] backdrop-blur sm:px-6 lg:static lg:px-8">
          <div className="min-w-0 space-y-1 text-xs text-muted">
            <p role="status" className={saveError ? "font-semibold text-danger" : "flex items-center gap-1 font-semibold text-success"}>
              {!saveError && <Icon name={draft === savedDraft ? "check" : "clock"} className="size-3.5" />}
              {saveError || (draft === savedDraft ? "Draft saved" : "Saving draft...")}
            </p>
            <p className="hidden sm:block">You can change these details later in Website Settings.</p>
          </div>
          {step > 0 && (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Button size="xs" variant="secondary" disabled={busy} onClick={() => goTo((step - 1) as SetupStep)}>Back</Button>
              {step === 5 && <button type="button" onClick={skipSearch} className="rounded px-1.5 py-2 text-xs font-semibold text-body hover:text-burnt focus-visible:outline-2 focus-visible:outline-burnt">Skip for now</button>}
              {step < 6 && <Button variant="brand" size="xs" disabled={busy} onClick={advance}>Save & continue</Button>}
              {step === 6 && (
                <Button variant="brand" size="xs" disabled={busy || publishBlocked} onClick={() => { setReviewError(""); setModal("review"); }}>Publish</Button>
              )}
            </div>
          )}
        </footer>
      </div>

      <LivePreviewModal
        isOpen={modal === "preview"}
        onClose={() => setModal(null)}
        data={data}
        services={services}
        fonts={previewFonts(data.typography)}
      />
      {modal === "exit" && (
        <SetupDialog title="Draft saved" onClose={() => setModal(null)} actions={
          <>
            <Button size="xs" variant="secondary" onClick={() => setModal(null)}>Keep editing</Button>
            <Button variant="brand" size="xs" onClick={() => router.push(dashboardPath)}>Back to dashboard</Button>
          </>
        }>
          <p>Your draft and current step are saved in this browser. Return from your dashboard whenever you’re ready.</p>
        </SetupDialog>
      )}
      {modal === "review" && (
        <SetupDialog title={simulated ? "Review your publish preview" : "Publish your first website?"} onClose={() => { if (!busy) setModal(null); }} actions={
          <>
            <Button size="xs" variant="secondary" disabled={busy} onClick={() => setModal(null)}>Keep editing</Button>
            <Button variant="brand" size="xs" disabled={busy} onClick={confirmPublish}>{busy ? "Publishing…" : "Publish website"}</Button>
          </>
        }>
          <p>{simulated ? "This publish preview is saved in this browser." : "Your booking website will be available to customers."}</p>
          <p className="break-all font-mono text-xs">{websiteAddress(data.subdomain)}</p>
          {reviewError && <p role="alert" className="text-danger">{reviewError}</p>}
        </SetupDialog>
      )}
      {modal === "published" && (
        <SetupDialog title={simulated ? "Publish preview complete" : "Your website is live"} onClose={() => router.replace(dashboardPath)} actions={
          <Button variant="brand" size="xs" onClick={() => router.replace(dashboardPath)}>Back to dashboard</Button>
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
