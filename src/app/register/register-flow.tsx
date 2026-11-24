"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sendRegistrationCodeAction } from "@/app/actions/registration-email";
import { adminButtonClasses } from "@/components/admin/admin-button";
import { Icon, type IconName } from "@/components/admin/icon";
import { CalendarPicker, calendarDateKey } from "@/components/ui/calendar-picker";
import { Listbox } from "@/components/ui/listbox";
import { StaffSuccessDialog } from "@/components/merchant/staff/staff-confirmation-dialog";
import { Card as BaseCard } from "@/components/ui";
import { MascotLoadingDialog } from "@/components/ui/mascot-loading-dialog";
import {
  ALL_DOCUMENTS,
  BUSINESS_TYPES,
  DOCUMENT_SLOTS,
  FILE_LIMITS,
  IDENTITY_DOCUMENT_SLOTS,
  documentByteLimit,
  ID_TYPES,
  PLAN_OPTIONS,
  TRIAL_DAYS,
  type BusinessDocumentKey,
  type IdentityDocumentKey,
  type DocumentKey,
} from "@/lib/registration/options";
import {
  accountStepSchema,
  businessStepSchema,
  registrationPasswordRules,
  identityStepSchema,
  planStepSchema,
  registrationSchema,
  validateStep,
} from "@/lib/registration/schema";
import { cn } from "@/lib/utils";
import { philippineCities } from "@/lib/registration/philippine-cities";
import { PlanCardGrid, PlanComparisonRow, SelectedPlanSummary } from "./plan-selection";
import { EmailVerificationStep } from "./email-verification-step";
import { SlugBadge } from "./slug-badge";
import { uploadDocument } from "./upload-document";
import { normalizeSlugInput } from "@/lib/account-request/schema";
import {
  DocumentCard,
  documentFileProblem,
  FilePreviewDialog,
  formatBytes,
  IdUpload,
  releaseObjectUrl,
} from "./controls";
import {
  Field,
  InfoNote,
  MobileProgress,
  PasswordInput,
  SecureFooter,
  Sidebar,
  STEPS,
  TextInput,
  useObjectUrl,
  validateFile,
} from "./parts";

type DocMap = Partial<Record<DocumentKey, File>>;
type UploadReceipt = Awaited<ReturnType<typeof uploadDocument>>;
type UploadState = { file: File; percent: number; receipt?: UploadReceipt; error?: string };
type Uploads = Partial<Record<DocumentKey, UploadState>>;

type Values = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  ownerLegalName: string;
  dateOfBirth: string;
  idType: string;
  businessName: string;
  requestedSlug: string;
  businessType: string;
  establishedYear: string;
  streetAddress: string;
  city: string;
  province: string;
  zipCode: string;
  planCode: string;
  confirmAccuracy: boolean;
};

const initialValues: Values = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
  ownerLegalName: "",
  dateOfBirth: "",
  idType: "passport",
  businessName: "",
  requestedSlug: "",
  businessType: BUSINESS_TYPES[0],
  establishedYear: "",
  streetAddress: "",
  city: "",
  province: "",
  zipCode: "",
  planCode: "professional",
  confirmAccuracy: false,
};

type Errors = Partial<Record<string, string>>;

const documentSizeMb = FILE_LIMITS.documentBytes / (1024 * 1024);
const stepSchemas = [accountStepSchema, identityStepSchema, businessStepSchema, null, planStepSchema, null] as const;
const allowStepPreview = process.env.NODE_ENV === "development";

const primaryButton = adminButtonClasses({ size: "md", className: "gap-2 disabled:cursor-not-allowed" });
const secondaryButton = adminButtonClasses({ variant: "outline-accent", size: "md", className: "gap-2 disabled:cursor-not-allowed disabled:hover:bg-transparent" });

export function RegisterFlow({ requestAccount = false }: { requestAccount?: boolean }) {
  const draftKey = requestAccount ? "fides-account-request-draft" : "fides-registration-draft";
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocMap>({});
  const [docErrors, setDocErrors] = useState<Errors>({});
  const [preview, setPreview] = useState<{ file: File; title: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Uploads>({});
  const [uploading, setUploading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [emailChallenge, setEmailChallenge] = useState<{ email: string; retryAt: number } | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<{ email: string; proof: string } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousStep = useRef(step);
  const busy = uploading || submitting || sendingCode;
  const email = values.email.trim().toLowerCase();
  const emailProof = verifiedEmail?.email === email ? verifiedEmail.proof : null;
  const navigationLocked = busy || showEmailVerification;
  const accessibleStep = navigationLocked ? -1 : allowStepPreview ? STEPS.length - 1 : emailProof ? furthest : 0;
  const completed = emailProof ? completedSteps : completedSteps.filter((index) => index !== 0);
  const payload = { ...values, requestedSlug: requestAccount ? values.requestedSlug : undefined };

  function missingIdentityDocuments(): Errors {
    return Object.fromEntries(IDENTITY_DOCUMENT_SLOTS
      .filter(({ key }) => !docs[key])
      .map(({ key, side }) => [key, `Upload the ${side.toLowerCase()} of your government-issued ID to continue.`]));
  }

  const hasDraft = useSyncExternalStore(
    () => () => {},
    () => window.sessionStorage.getItem(draftKey) !== null,
    () => false
  );

  function restoreDraft() {
    try {
      const saved = window.sessionStorage.getItem(draftKey);
      if (saved) setValues((current) => ({ ...current, ...(JSON.parse(saved) as Partial<Values>), password: "", confirmPassword: "" }));
    } catch {
      window.sessionStorage.removeItem(draftKey);
    }
  }

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    window.scrollTo({ top: 0 });
    mainRef.current?.querySelector("h1")?.focus({ preventScroll: true });
  }, [step]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => {
      const requestedSlug = requestAccount && key === "businessName" && current.requestedSlug === normalizeSlugInput(current.businessName).replace(/-$/, "")
        ? normalizeSlugInput(String(value)).replace(/-$/, "")
        : current.requestedSlug;
      return { ...current, requestedSlug, [key]: value };
    });
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
  }

  function validateCurrent(): boolean {
    const schema = stepSchemas[step];
    let found: Errors = schema ? validateStep(schema, payload) : {};
    if (step === 0 && !found.confirmPassword && values.password !== values.confirmPassword) {
      found = { ...found, confirmPassword: "Passwords do not match." };
    }
    if (step === 1) found = { ...found, ...missingIdentityDocuments() };
    if (step === 3) {
      const missing: Errors = {};
      const identityMissing = missingIdentityDocuments();
      if (Object.keys(identityMissing).length) {
        setErrors(identityMissing);
        setStep(1);
        focusFirstError();
        return false;
      }
      for (const slot of DOCUMENT_SLOTS) {
        if (!docs[slot.key]) missing[slot.key] = `${slot.title} is required. Please upload a PDF, JPG or PNG file (max ${documentSizeMb} MB).`;
      }
      setDocErrors(missing);
      const count = Object.keys(missing).length;
      found = count ? { documents: `${count} required ${count === 1 ? "document is" : "documents are"} still missing. Please upload every document marked REQUIRED.` } : {};
    }
    setErrors(found);
    const ok = Object.keys(found).length === 0;
    if (!ok) focusFirstError();
    return ok;
  }

  function setDocument(key: DocumentKey, title: string, file: File): string | null {
    const problem = documentFileProblem(file, title, documentByteLimit(key));
    if (problem) return problem;
    releaseObjectUrl(docs[key]);
    setDocs((current) => ({ ...current, [key]: file }));
    setDocErrors((current) => ({ ...current, [key]: undefined }));
    setErrors((current) => ({ ...current, documents: undefined, [key]: undefined }));
    return null;
  }

  function removeDocument(key: DocumentKey) {
    releaseObjectUrl(docs[key]);
    setDocs((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function goTo(next: number) {
    setStep(next);
    setFurthest((current) => Math.max(current, next));
  }

  function finishStep() {
    setCompletedSteps((current) => current.includes(step) ? current : [...current, step]);
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function sendEmailCode(address: string): ReturnType<typeof sendRegistrationCodeAction> {
    setSendingCode(true);
    try {
      const result = await sendRegistrationCodeAction(address);
      if (result.ok) setSentEmail(address);
      return result;
    } catch {
      return { ok: false, error: "We couldn’t send the verification code. Please try again." };
    } finally {
      setSendingCode(false);
    }
  }

  async function next() {
    if (busy) return;
    if (!validateCurrent()) return;
    if (step === 0 && !emailProof) {
      if (emailChallenge?.email === email) {
        setShowEmailVerification(true);
        return;
      }
      const result = await sendEmailCode(email);
      if (result.ok) {
        setEmailChallenge({ email, retryAt: result.retryAt });
        setShowEmailVerification(true);
      } else {
        setErrors({ email: result.error });
      }
      return;
    }
    if (step === 3 && !await uploadVerificationDocuments()) return;
    finishStep();
  }

  async function uploadVerificationDocuments() {
    setUploading(true);
    try {
      const results = await Promise.all(ALL_DOCUMENTS.map(async ({ key }) => {
        const file = docs[key];
        if (!file) return false;
        if (uploads[key]?.file === file && uploads[key]?.receipt) return true;

        const update = (state: Omit<UploadState, "file">) => {
          setUploads((current) => ({ ...current, [key]: { ...state, file } }));
        };
        update({ percent: 0 });
        try {
          const receipt = await uploadDocument(key, file, (percent) => update({ percent }));
          update({ percent: 100, receipt });
          return true;
        } catch (error) {
          update({ percent: 0, error: error instanceof Error ? error.message : "Upload failed. Please retry." });
          return false;
        }
      }));
      return results.every(Boolean);
    } finally {
      setUploading(false);
    }
  }

  function back() {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  }

  function saveDraft() {
    const { password: _password, confirmPassword: _confirm, ...safe } = values;
    void _password;
    void _confirm;
    window.sessionStorage.setItem(draftKey, JSON.stringify(safe));
    setDraftNote("Draft saved on this device. Passwords and files are not included.");
  }

  async function submit() {
    setSubmitError(null);
    if (!values.confirmAccuracy) {
      setErrors({ confirmAccuracy: "Please confirm that your information is accurate." });
      return;
    }
    if (busy) return;
    const parsed = registrationSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0] ?? "");
      const target = ["email", "password", "confirmPassword", "acceptTerms"].includes(field)
        ? 0
        : ["ownerLegalName", "dateOfBirth", "idType"].includes(field)
          ? 1
          : ["planCode"].includes(field)
            ? 4
            : ["fullName", "phone"].includes(field) ? 5 : 2;
      setErrors({ [field]: issue.message });
      setSubmitError(issue.message);
      setStep(target);
      focusFirstError();
      return;
    }
    if (!emailProof) {
      setErrors({ email: "Verify your business email before submitting your application." });
      setStep(0);
      return;
    }

    const missingDocs = ALL_DOCUMENTS.filter((doc) => !docs[doc.key]);
    if (missingDocs.length > 0) {
      const onIdentity = IDENTITY_DOCUMENT_SLOTS.some(({ key }) => !docs[key]);
      const message = `Please upload all required documents before submitting (missing: ${missingDocs.map((doc) => doc.title).join(", ")}).`;
      setSubmitError(message);
      if (onIdentity) {
        setErrors(missingIdentityDocuments());
        setStep(1);
      } else {
        setDocErrors(Object.fromEntries(missingDocs.map((doc) => [doc.key, `${doc.title} is required.`])));
        setStep(3);
      }
      focusFirstError();
      return;
    }

    const receipts: Partial<Record<DocumentKey, UploadReceipt>> = {};
    for (const { key, title } of ALL_DOCUMENTS) {
      const upload = uploads[key];
      if (!upload?.receipt || upload.file !== docs[key]) {
        setErrors({ documents: `Upload ${title} before submitting.` });
        setStep(3);
        return;
      }
      receipts[key] = upload.receipt;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("payload", JSON.stringify(parsed.data));
      body.set("emailProof", emailProof);
      if (logo) body.set("logo", logo);
      body.set("uploadedDocuments", JSON.stringify(receipts));
      const response = await fetch("/api/applications", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { error?: string; documentKey?: DocumentKey; referenceCode?: string; emailVerificationRequired?: boolean };
      if (!response.ok) {
        setSubmitError(result.error ?? "We could not submit your application. Please try again.");
        if (result.emailVerificationRequired) {
          setVerifiedEmail(null);
          setErrors({ email: result.error });
          setStep(0);
          return;
        }
        const failedKey = result.documentKey;
        if (failedKey) {
          setUploads((current) => ({ ...current, [failedKey]: undefined }));
          setErrors({ documents: result.error });
          setStep(3);
        }
        if (response.status === 409 && result.error?.includes("subdomain")) {
          setErrors({ requestedSlug: result.error });
          setStep(2);
        }
        return;
      }
      window.sessionStorage.removeItem(draftKey);
      router.push(requestAccount && result.referenceCode
        ? `/request-account/status/${encodeURIComponent(result.referenceCode)}`
        : "/login?registered=1");
    } catch {
      setSubmitError("We could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <Sidebar current={step} furthest={accessibleStep} completed={completed} onJump={setStep} />
      <MobileProgress current={step} completed={completed} onJump={allowStepPreview ? setStep : undefined} navigationLocked={navigationLocked} />
      <main ref={mainRef} className="flex min-w-0 flex-1 flex-col items-center px-4 py-6 sm:px-8 lg:px-6 lg:py-8 xl:px-8">
        {step === 0 && (
          <nav aria-label="Registration links" className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 self-start">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-md pr-2 text-base font-semibold text-burnt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            >
              <Icon name="arrow-left" className="size-5" /> Back to Home
            </Link>
            {requestAccount && (
              <Link href="/reset-request?mode=application" className="inline-flex min-h-11 items-center text-base font-semibold text-burnt hover:underline">
                Track an existing application
              </Link>
            )}
          </nav>
        )}
        <div className={cn("flex w-full flex-1 flex-col", step === 4 ? "max-w-[1100px]" : step === 5 ? "max-w-[820px]" : step === 3 ? "max-w-[900px]" : step === 0 ? "max-w-lg" : step === 1 ? "max-w-[760px]" : "max-w-[680px]")}>
          {step === 0 && (
            <div className="my-auto py-4 sm:py-6">
              {showEmailVerification && emailChallenge ? (
                <EmailVerificationStep
                  email={emailChallenge.email}
                  retryAt={emailChallenge.retryAt}
                  onResend={() => sendEmailCode(emailChallenge.email)}
                  onResent={(retryAt) => setEmailChallenge({ email: emailChallenge.email, retryAt })}
                  onEdit={() => {
                    setShowEmailVerification(false);
                    requestAnimationFrame(() => mainRef.current?.querySelector<HTMLInputElement>("#email")?.focus());
                  }}
                  onVerified={(proof) => {
                    setVerifiedEmail({ email: emailChallenge.email, proof });
                    setEmailChallenge(null);
                    setShowEmailVerification(false);
                    finishStep();
                  }}
                />
              ) : (
                <>
                  {hasDraft && (
                    <button type="button" onClick={restoreDraft} disabled={sendingCode} className="mb-4 w-full rounded-lg bg-[#faece3] px-4 py-2.5 text-base font-semibold text-burnt hover:bg-[#f6dfd0] disabled:opacity-50">
                      Restore your saved draft
                    </button>
                  )}
                  <AccountStep values={values} errors={errors} set={set} onNext={next} sendingCode={sendingCode} />
                </>
              )}
            </div>
          )}
          {step === 1 && (
            <IdentityStep
              values={values}
              errors={errors}
              set={set}
              docs={docs}
              onFile={setDocument}
              onRemove={removeDocument}
              onPreview={(file, title) => setPreview({ file, title })}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 2 && (
            <BusinessStep
              requestAccount={requestAccount}
              values={values}
              errors={errors}
              set={set}
              logo={logo}
              logoError={logoError}
              onLogo={(file) => {
                if (!file) {
                  releaseObjectUrl(logo);
                  setLogo(null);
                  setLogoError(null);
                  return;
                }
                const problem = validateFile(file, FILE_LIMITS.logoTypes, FILE_LIMITS.logoBytes, "The logo");
                setLogoError(problem);
                if (!problem) {
                  releaseObjectUrl(logo);
                  setLogo(file);
                }
              }}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 3 && (
            <DocumentsStep
              uploads={uploads}
              uploading={uploading}
              docs={docs}
              docErrors={docErrors}
              summaryError={errors.documents}
              onFile={setDocument}
              onRemove={removeDocument}
              onPreview={(file, title) => setPreview({ file, title })}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 4 && <PlanStep values={values} errors={errors} set={set} onBack={back} onNext={next} />}
          {step === 5 && (
            <SummaryStep
              values={values}
              errors={errors}
              set={set}
              logo={logo}
              docs={docs}
              submitting={submitting}
              submitError={submitError}
              draftNote={draftNote}
              onEdit={(index) => { if (!busy) goTo(index); }}
              onBack={back}
              onSaveDraft={saveDraft}
              onSubmit={submit}
            />
          )}
        </div>
      </main>
      <FilePreviewDialog file={preview?.file ?? null} title={preview?.title ?? ""} onClose={() => setPreview(null)} />
      {sendingCode ? (
        <MascotLoadingDialog />
      ) : sentEmail && (
        <StaffSuccessDialog
          title="Verification email sent"
          description={`Check ${sentEmail} for the six-digit code, then enter it to continue.`}
          onClose={() => {
            setSentEmail(null);
            requestAnimationFrame(() => mainRef.current?.querySelector<HTMLInputElement>("#registration-code")?.focus());
          }}
        />
      )}
    </div>
  );
}

type StepProps = {
  values: Values;
  errors: Errors;
  set: <K extends keyof Values>(key: K, value: Values[K]) => void;
};

function Heading({ title, subtitle, center = true, className = "mb-6" }: { title: string; subtitle: string; center?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", center ? "text-center" : "text-left", className)}>
      <h1 tabIndex={-1} className="font-display text-[28px] leading-[38px] text-ink focus:outline-none sm:text-[32px] sm:leading-[42px]">{title}</h1>
      <p className="text-base leading-6 text-muted">{subtitle}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <BaseCard className="rounded-xl border-line p-5 text-ink sm:p-6">{children}</BaseCard>
  );
}

function AccountStep({ values, errors, set, onNext, sendingCode }: StepProps & { onNext: () => void; sendingCode: boolean }) {
  const [passwordFocused, setPasswordFocused] = useState(false);
  const showPasswordRules = passwordFocused && values.password.length > 0;
  const passwordDescription = [
    errors.password ? "password-error" : null,
    showPasswordRules ? "password-requirements" : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <form
      noValidate
      className="mx-auto w-full max-w-md"
      aria-busy={sendingCode}
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading title="Create Your Account" subtitle="Start your journey with Fides — it only takes a few minutes." className="mb-10" />
      <fieldset disabled={sendingCode} className="min-w-0">
        <div className="grid gap-7 sm:gap-8">
          <Field label="Business Email" htmlFor="email" error={errors.email}>
            <TextInput id="email" type="email" invalid={!!errors.email} autoComplete="email" placeholder="maria@bellavita.ph" value={values.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <div
            onFocus={() => setPasswordFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setPasswordFocused(false);
            }}
          >
            <Field label="Password" htmlFor="password" error={errors.password}>
              <PasswordInput id="password" fieldLabel="password" aria-describedby={passwordDescription} invalid={!!errors.password} autoComplete="new-password" placeholder="••••••••" value={values.password} onChange={(e) => set("password", e.target.value)} />
            </Field>
            {showPasswordRules && (
              <ul id="password-requirements" className="mt-3 flex flex-col gap-1 text-sm leading-5" aria-label="Password requirements">
                {registrationPasswordRules.map((rule) => {
                  const met = rule.passes(values.password);
                  return (
                    <li key={rule.text} className={cn("flex items-center gap-2", met ? "text-success" : "text-muted")}>
                      <span className={cn("flex size-4 items-center justify-center rounded-full", met ? "bg-success text-white" : "border border-outline/60")}>
                        {met ? <Icon name="check" className="size-2.5" /> : null}
                      </span>
                      <span className="sr-only">{met ? "Met: " : "Required: "}</span>
                      {rule.text}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Field label="Confirm Password" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <PasswordInput id="confirmPassword" fieldLabel="confirm password" invalid={!!errors.confirmPassword} autoComplete="new-password" placeholder="Re-enter your password" value={values.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
          </Field>
        </div>

        <div className="mt-8 flex flex-col gap-1">
          <label className="flex min-h-6 cursor-pointer items-start gap-3 text-sm leading-6 text-body">
            <input
              type="checkbox"
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
              checked={values.acceptTerms}
              onChange={(e) => set("acceptTerms", e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-burnt"
            />
            <span>
              I agree to the{" "}
              <Link href="/#contact" className="font-semibold text-burnt hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/#contact" className="font-semibold text-burnt hover:underline">
                Privacy Policy
              </Link>{" "}
              of Fides.
            </span>
          </label>
          {errors.acceptTerms ? (
            <p id="acceptTerms-error" role="alert" className="text-sm text-danger">
              {errors.acceptTerms}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col items-center gap-6">
          <button type="submit" className={primaryButton}>
            Continue <Icon name="arrow-right" className="size-4" />
          </button>
          <div className="lg:w-max lg:whitespace-nowrap">
            <SecureFooter>Your data is encrypted and secure. We never share your information.</SecureFooter>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

function StepActions({
  onBack,
}: {
  onBack?: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
      {onBack ? (
        <button type="button" onClick={onBack} className={secondaryButton}>
          Back
        </button>
      ) : null}
      <button type="submit" className={primaryButton}>
        Continue <Icon name="arrow-right" className="size-4" />
      </button>
    </div>
  );
}

function IdentityStep({
  values, errors, set, docs, onFile, onRemove, onPreview, onBack, onNext,
}: StepProps & {
  docs: DocMap;
  onFile: (key: IdentityDocumentKey, title: string, file: File) => string | null;
  onRemove: (key: IdentityDocumentKey) => void;
  onPreview: (file: File, title: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() - 18);
  return (
    <form noValidate onSubmit={(event) => { event.preventDefault(); onNext(); }}>
      <Heading
        center={false}
        title="Verify Your Identity"
        subtitle="We need to confirm the identity of the business owner. This information is kept secure and used only for verification purposes."
      />
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Owner's Legal Full Name" htmlFor="ownerLegalName" error={errors.ownerLegalName}>
            <TextInput id="ownerLegalName" invalid={!!errors.ownerLegalName} autoComplete="name" placeholder="Maria Santos" value={values.ownerLegalName} onChange={(event) => set("ownerLegalName", event.target.value)} />
          </Field>
          <Field label="Date of Birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
            <CalendarPicker id="dateOfBirth" panelLabel="Date of birth" value={values.dateOfBirth}
              onChange={(value) => set("dateOfBirth", value)} min="1900-01-01" max={calendarDateKey(latest)}
              locale="en-GB" showWeekdays={false} invalid={!!errors.dateOfBirth}
              describedBy={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
            />
          </Field>
          <Listbox id="idType" label="ID Type" required value={values.idType} options={ID_TYPES}
            onChange={(value) => set("idType", value)} error={errors.idType} placeholder="Select an ID type"
            className="sm:col-span-2"
          />
        </div>
        <div className="mt-5 grid gap-6">
          {IDENTITY_DOCUMENT_SLOTS.map(({ key, title, side }) => (
            <IdUpload
              key={key}
              label={`Government-issued ID (${side.toLowerCase()})`}
              side={side}
              file={docs[key] ?? null}
              error={errors[key]}
              onFile={(file) => onFile(key, title, file)}
              onRemove={() => onRemove(key)}
              onPreview={(file) => onPreview(file, title)}
            />
          ))}
          <InfoNote icon="shield">
            Your identity documents are encrypted and stored securely. They are used solely to verify your identity. Verification typically takes 1–2 business days.
          </InfoNote>
        </div>
        <StepActions onBack={onBack} />
      </Card>
    </form>
  );
}

function BusinessStep({
  requestAccount,
  values,
  errors,
  set,
  logo,
  logoError,
  onLogo,
  onBack,
  onNext,
}: StepProps & {
  requestAccount: boolean;
  logo: File | null;
  logoError: string | null;
  onLogo: (file: File | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const logoUrl = useObjectUrl(logo);
  const matchingCity = philippineCities.find(({ city, province }) => city === values.city && province === values.province);
  const legacyCity = values.city && !matchingCity ? { value: "saved-city", label: values.city } : null;
  return (
    <form
      className="my-auto py-4 sm:py-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading title="Tell us about your business" subtitle="This information powers your public booking portal on Fides." />
      {requestAccount && (
        <div className="mb-5">
          <SlugBadge slug={values.requestedSlug} onChange={(slug) => set("requestedSlug", slug)} error={errors.requestedSlug} />
        </div>
      )}
      <Card>
        <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
          <div className="relative grid size-[100px] shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-mist text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Business logo preview" className="absolute inset-0 size-full object-cover object-center" />
            ) : (
              <Icon name="gallery" className="size-9 text-glyph" />
            )}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="text-base font-semibold text-ink">Business Logo</p>
            <p className="text-sm text-subtle">Recommended: square JPG or PNG, at least 400×400 px. Max 2 MB.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="inline-flex h-12 w-40 cursor-pointer items-center justify-center rounded-md border border-outline/70 px-3 text-base font-semibold text-muted transition-colors hover:border-burnt hover:text-burnt focus-within:ring-2 focus-within:ring-burnt/40">
                {logo ? "Replace Logo" : "Upload Logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onLogo(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <button type="button" onClick={() => onLogo(null)} disabled={!logo}
                className={cn("min-h-11 text-sm font-semibold text-burnt hover:underline focus-visible:outline-2 focus-visible:outline-burnt", !logo && "invisible")}>
                Remove logo
              </button>
            </div>
            {logoError ? (
              <p role="alert" className="text-sm text-danger">
                {logoError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-6">
          <Field label="Business Name" htmlFor="businessName" error={errors.businessName} className="sm:col-span-6">
            <TextInput id="businessName" invalid={!!errors.businessName} placeholder="Bella Vita Salon & Spa" value={values.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </Field>
          <Listbox id="businessType" label="Business Type" required size="large" value={values.businessType}
            options={BUSINESS_TYPES.map((type) => ({ value: type, label: type }))}
            onChange={(value) => set("businessType", value)} error={errors.businessType}
            placeholder="Select a business type" className="sm:col-span-4"
          />
          <Field label="Established Year" htmlFor="establishedYear" error={errors.establishedYear} className="sm:col-span-2">
            <TextInput id="establishedYear" inputMode="numeric" maxLength={4} invalid={!!errors.establishedYear} placeholder="2020" value={values.establishedYear} onChange={(e) => set("establishedYear", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Listbox id="city" label="City" required size="large" value={matchingCity?.value ?? legacyCity?.value ?? ""}
            options={legacyCity ? [legacyCity, ...philippineCities] : philippineCities}
            onChange={(value) => {
              const selectedCity = philippineCities.find((city) => city.value === value);
              if (selectedCity) {
                set("city", selectedCity.city);
                set("province", selectedCity.province);
              }
            }}
            error={errors.city} placeholder="Select a city" searchPlaceholder="Search cities" className="sm:col-span-2"
          />
          <Field label="Province" htmlFor="province" error={errors.province} className="sm:col-span-2">
            <TextInput id="province" readOnly={!legacyCity} invalid={!!errors.province} placeholder="Auto-filled" value={values.province} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field label="ZIP Code" htmlFor="zipCode" error={errors.zipCode} className="sm:col-span-2">
            <TextInput id="zipCode" autoComplete="postal-code" inputMode="numeric" maxLength={12} invalid={!!errors.zipCode} placeholder="1200" value={values.zipCode} onChange={(e) => set("zipCode", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Street Address" htmlFor="streetAddress" error={errors.streetAddress} className="sm:col-span-6">
            <TextInput id="streetAddress" autoComplete="address-line1" invalid={!!errors.streetAddress} placeholder="123 Main Street, Suite 4B" value={values.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} />
          </Field>
        </div>
        <StepActions onBack={onBack} />
      </Card>
      <div className="mt-5">
        <SecureFooter />
      </div>
    </form>
  );
}

function DocumentsStep({
  uploads,
  uploading,
  docs,
  docErrors,
  summaryError,
  onFile,
  onRemove,
  onPreview,
  onBack,
  onNext,
}: {
  uploads: Uploads;
  uploading: boolean;
  docs: DocMap;
  docErrors: Errors;
  summaryError?: string;
  onFile: (key: BusinessDocumentKey, title: string, file: File) => string | null;
  onRemove: (key: BusinessDocumentKey) => void;
  onPreview: (file: File, title: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const files = ALL_DOCUMENTS.flatMap(({ key, title }) => {
    const file = docs[key];
    if (!file) return [];
    const upload = uploads[key];
    return [{ key, title, upload: upload?.file === file ? upload : undefined }];
  });
  const uploaded = files.filter(({ upload }) => upload?.receipt).length;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading
        title="Upload your business documents"
        subtitle="These documents help us verify your business before your application is reviewed. Review begins after your final submission on the last step."
      />
      {summaryError ? (
        <p role="alert" className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-base text-danger-dark">
          {summaryError}
        </p>
      ) : null}
      <p className="mb-3 text-sm font-semibold text-muted" aria-live="polite">
        {uploaded} of {ALL_DOCUMENTS.length} required documents uploaded
      </p>
      <ul className="mb-4 grid gap-2 text-base" aria-label="Verification upload progress">
        {files.map(({ key, title, upload }) => (
          <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3">
            <span>{title}</span>
            {upload?.error ? <span role="alert" className="text-danger">{upload.error}</span> : upload?.receipt ? (
              <span className="text-success">Uploaded</span>
            ) : uploading ? (
              <progress aria-label={`${title} upload progress`} value={upload?.percent ?? 0} max={100} />
            ) : <span className="text-muted">Ready to upload</span>}
          </li>
        ))}
      </ul>
      <fieldset disabled={uploading} className="grid gap-5 md:grid-cols-2">
        {DOCUMENT_SLOTS.map((slot) => (
          <DocumentCard
            key={slot.key}
            title={slot.title}
            hint={slot.hint}
            required={slot.required}
            file={docs[slot.key] ?? null}
            error={docErrors[slot.key]}
            onFile={(file) => onFile(slot.key, slot.title, file)}
            onRemove={() => onRemove(slot.key)}
            onPreview={(file) => onPreview(file, slot.title)}
          />
        ))}
      </fieldset>
      <div className="mt-6 flex flex-col gap-4">
        <InfoNote>
          These documents will be included in your application summary on the final step. Review by our team begins only after you submit your complete application. This typically takes 1–2 business days.
        </InfoNote>
        <p className="text-sm text-subtle">PDF, JPG or PNG · Max {documentSizeMb} MB per file</p>
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button type="button" onClick={onBack} disabled={uploading} className={secondaryButton}>
            Back
          </button>
          <button type="submit" disabled={uploading} className={primaryButton}>
            Continue <Icon name="arrow-right" className="size-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

function PlanStep({ values, errors, set, onBack, onNext }: StepProps & { onBack: () => void; onNext: () => void }) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading
        title="Select your subscription package"
        subtitle="The Professional plan is pre-selected. You can change your plan anytime after launch."
      />
      <PlanCardGrid selectedCode={values.planCode} onSelect={(code) => set("planCode", code)} />
      <div className="mx-auto mt-6 w-full max-w-3xl overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-base">
          <caption className="p-3 text-left font-semibold">Compare plans</caption>
          <thead>
            <tr>
              <th scope="col" className="px-2 py-2 text-left">Feature</th>
              {PLAN_OPTIONS.map((plan) => <th key={plan.code} scope="col" className="px-2 py-2">{plan.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {PLAN_OPTIONS.map((tier, tierIndex) => (
              <PlanComparisonRow key={tier.code} feature={tier.features[0]} availability={PLAN_OPTIONS.map((_, index) => index >= tierIndex)} />
            ))}
          </tbody>
        </table>
      </div>
      {errors.planCode ? (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {errors.planCode}
        </p>
      ) : null}
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted">
        <Icon name="check" weight="bold" className="size-4 text-success" />
        {TRIAL_DAYS}-day free trial on all plans · No credit card required · Cancel anytime
      </p>
      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={cn(secondaryButton, "border-burnt text-burnt hover:bg-burnt/5")}>
          <Icon name="arrow-left" className="size-4" /> Back
        </button>
        <button type="submit" className={primaryButton}>
          Continue <Icon name="arrow-right" className="size-4" />
        </button>
      </div>
    </form>
  );
}

function SummaryCard({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: IconName;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_3px_14px_rgb(44_58_75/0.05)]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-3 text-base font-semibold text-ink">
          <Icon name={icon} className="size-5 text-glyph" />
          {title}
        </h2>
        <button type="button" onClick={onEdit} className={adminButtonClasses({ variant: "outline-accent", size: "xs" })}>
          Edit
        </button>
      </header>
      <div className="flex flex-col gap-2 px-5 py-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 text-base">
      <span className="text-subtle">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function FileRow({ name, size }: { name: string; size: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#eceff6] px-3 py-2.5 text-sm text-body">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-burnt text-white">
        <Icon name="check" className="size-3" />
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 text-subtle">{formatBytes(size)}</span>
    </div>
  );
}

function SummaryStep({
  values,
  errors,
  set,
  logo,
  docs,
  submitting,
  submitError,
  draftNote,
  onEdit,
  onBack,
  onSaveDraft,
  onSubmit,
}: StepProps & {
  logo: File | null;
  docs: DocMap;
  submitting: boolean;
  submitError: string | null;
  draftNote: string | null;
  onEdit: (step: number) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const idLabel = ID_TYPES.find((item) => item.value === values.idType)?.label ?? values.idType;
  const dob = values.dateOfBirth
    ? new Date(`${values.dateOfBirth}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 tabIndex={-1} className="font-display text-[28px] leading-[38px] text-ink focus:outline-none sm:text-[32px] sm:leading-[42px]">
          Application Summary
        </h1>
        <p className="text-base text-muted">
          Review all details carefully before submitting. Once confirmed, your application will be sent for review (1–2 business days).
        </p>
      </div>

      <SummaryCard title="Account Details" icon="users" onEdit={() => onEdit(0)}>
        <Row label="Email Address" value={values.email} />
        <Row label="Password" value="Set securely" />
        <fieldset disabled={submitting} className="mt-2 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <Field label="Contact name" htmlFor="fullName" error={errors.fullName}>
            <TextInput id="fullName" invalid={!!errors.fullName} autoComplete="name" placeholder="Maria Santos" value={values.fullName} onChange={(event) => set("fullName", event.target.value)} />
          </Field>
          <Field label="Contact phone" htmlFor="phone" error={errors.phone} hint="Use 09XXXXXXXXX (11 digits) or +63 9XX XXX XXXX.">
            <TextInput id="phone" type="tel" inputMode="tel" maxLength={17} invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              autoComplete="tel" placeholder="+63 917 000 0000" value={values.phone}
              onChange={(event) => set("phone", event.target.value.replace(/[^\d+\s()-]/g, ""))}
            />
          </Field>
        </fieldset>
      </SummaryCard>

      <SummaryCard title="Identity Verification" icon="shield" onEdit={() => onEdit(1)}>
        <Row label="Owner Name" value={values.ownerLegalName} />
        <Row label="Date of Birth" value={dob} />
        <Row label="ID Type" value={idLabel} />
        {IDENTITY_DOCUMENT_SLOTS.map(({ key, title }) => {
          const file = docs[key];
          return (
            <div key={key} className="space-y-1">
              <p className="text-sm text-muted">{title}</p>
              {file ? <FileRow name={file.name} size={file.size} /> : (
                <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">Upload this file in Identity Verification.</p>
              )}
            </div>
          );
        })}
      </SummaryCard>

      <SummaryCard title="Business Information" icon="grid" onEdit={() => onEdit(2)}>
        <Row label="Business Name" value={values.businessName} />
        {values.requestedSlug && <Row label="Requested subdomain" value={values.requestedSlug} />}
        <Row label="Category" value={values.businessType} />
        <Row label="Established" value={values.establishedYear} />
        <Row
          label="Address"
          value={
            <>
              {values.streetAddress}
              <br />
              {values.city}, {values.province} {values.zipCode}
            </>
          }
        />
        {logo ? <FileRow name={logo.name} size={logo.size} /> : <p className="text-sm text-subtle">No business logo selected.</p>}
      </SummaryCard>

      <SummaryCard title="Document Requirements" icon="document" onEdit={() => onEdit(3)}>
        {DOCUMENT_SLOTS.map((slot) => {
          const file = docs[slot.key];
          return file ? (
            <div key={slot.key} className="flex flex-col gap-1">
              <p className="text-sm text-subtle">{slot.title}</p>
              <FileRow name={file.name} size={file.size} />
            </div>
          ) : (
            <p key={slot.key} role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">
              {slot.title} is missing. Go back to upload it before submitting.
            </p>
          );
        })}
      </SummaryCard>

      <SummaryCard title="Subscription Package" icon="card" onEdit={() => onEdit(4)}>
        <SelectedPlanSummary code={values.planCode} />
      </SummaryCard>

      <section className="rounded-xl border border-line bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.05)]">
        <p className="text-sm font-semibold tracking-wide text-muted">ACCURACY &amp; CONSENT</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-base text-body">
          <input
            type="checkbox"
            checked={values.confirmAccuracy}
            onChange={(event) => set("confirmAccuracy", event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-burnt"
          />
          I confirm that all information and documents provided are accurate and complete. I understand that submitting false information may result in rejection of my application.
        </label>
        {errors.confirmAccuracy ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {errors.confirmAccuracy}
          </p>
        ) : null}
        <p className="mt-4 border-t border-line pt-4 text-sm text-subtle">
          After confirming, your application will be reviewed within 1–2 business days. You will be notified by email at {values.email}.
        </p>

        {submitError ? (
          <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-4 py-3 text-base text-danger-dark">
            {submitError}
          </p>
        ) : null}

        <button type="button" onClick={onSubmit} disabled={submitting} className={cn(primaryButton, "mt-5 w-full")}>
          {submitting ? "Submitting…" : "Confirm Application"}
        </button>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onBack} disabled={submitting} className={cn(secondaryButton, "w-full")}>
            <Icon name="arrow-left" className="size-4" /> Back
          </button>
          <button type="button" onClick={onSaveDraft} disabled={submitting} className={cn(secondaryButton, "w-full")}>
            Save Draft
          </button>
        </div>
        {draftNote ? (
          <p role="status" className="mt-3 text-center text-sm text-success">
            {draftNote}
          </p>
        ) : null}
      </section>
    </div>
  );
}
