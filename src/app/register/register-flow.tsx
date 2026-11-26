"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { sendRegistrationCodeAction } from "@/app/actions/registration-email";
import { buttonClasses } from "@/components/ui/button";
import { Icon } from "@/components/admin/icon";
import {
  CalendarPicker,
  calendarDateKey,
} from "@/components/ui/calendar-picker";
import { Listbox } from "@/components/ui/listbox";
import { StaffConfirmationDialog, StaffSuccessDialog } from "@/components/merchant/staff/staff-confirmation-dialog";
import { Card as BaseCard } from "@/components/ui";
import { MascotLoadingDialog } from "@/components/ui/mascot-loading-dialog";
import {
  applicationDocumentsFor,
  BUSINESS_TYPES,
  BUSINESS_TYPE_MAX_LENGTH,
  OTHER_BUSINESS_TYPE,
  businessTypeLabel,
  BUSINESS_LOGO_REQUIRED,
  FILE_LIMITS,
  IDENTITY_DOCUMENT_SLOTS,
  documentByteLimit,
  ID_TYPES,
  TRIAL_DAYS,
  type BusinessDocumentKey,
  type IdentityDocumentKey,
  type DocumentKey,
} from "@/lib/registration/options";
import { businessDocumentsFor } from "@/lib/registration/document-requirements";
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
import {
  barangayOptionsForLocation,
  cityOptionsForProvince,
  locationHasBarangay,
  postalCodeForBarangay,
  provinceHasCity,
  provinceOptions,
} from "@/lib/registration/philippine-address-options";
import {
  barangayFromStreetAddress,
  formatRegistrationStreetAddress,
} from "@/lib/registration/address";
import {
  PlanCardGrid,
  SelectedPlanSummary,
} from "./plan-selection";
import { EmailVerificationStep } from "./email-verification-step";
import { SlugBadge } from "./slug-badge";
import { uploadDocument } from "./upload-document";
import { normalizeSlugInput } from "@/lib/registration/slug";
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
  SummaryRow as Row,
} from "./parts";

type DocMap = Partial<Record<DocumentKey, File>>;
type UploadReceipt = Awaited<ReturnType<typeof uploadDocument>>;
type UploadState = {
  file: File;
  percent: number;
  receipt?: UploadReceipt;
  error?: string;
};
type Uploads = Partial<Record<DocumentKey, UploadState>>;

type Values = {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  ownerLegalName: string;
  dateOfBirth: string;
  idType: string;
  businessName: string;
  requestedSlug: string;
  businessType: string;
  customBusinessType: string;
  establishedYear: string;
  streetAddress: string;
  barangay: string | null;
  city: string;
  province: string;
  zipCode: string;
  planCode: string;
  confirmAccuracy: boolean;
};

const initialValues: Values = {
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
  ownerLegalName: "",
  dateOfBirth: "",
  idType: "passport",
  businessName: "",
  requestedSlug: "",
  businessType: "",
  customBusinessType: "",
  establishedYear: "",
  streetAddress: "",
  barangay: null,
  city: "",
  province: "",
  zipCode: "",
  planCode: "professional",
  confirmAccuracy: false,
};

type Errors = Partial<Record<string, string>>;

const documentSizeMb = FILE_LIMITS.documentBytes / (1024 * 1024);
const stepSchemas = [
  accountStepSchema,
  identityStepSchema,
  businessStepSchema,
  null,
  planStepSchema,
  null,
] as const;
const allowStepPreview = process.env.NODE_ENV === "development";

const primaryButton = buttonClasses({
  variant: "brand",
  size: "formLg",
  className: "gap-2 disabled:cursor-not-allowed",
});
const secondaryButton = buttonClasses({
  variant: "brand-outline",
  size: "formLg",
  className: "gap-2 disabled:cursor-not-allowed disabled:hover:bg-transparent",
});

const draftUpdatedEvent = "fides-registration-draft-updated";

function subscribeToDrafts(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(draftUpdatedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(draftUpdatedEvent, onChange);
  };
}

function readDraft(key: string) {
  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function RegisterFlow({
  requestAccount = false,
}: {
  requestAccount?: boolean;
}) {
  const draftKey = requestAccount
    ? "fides-account-request-draft"
    : "fides-registration-draft";
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
  const [preview, setPreview] = useState<{ file: File; title: string } | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftPromptDismissed, setDraftPromptDismissed] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Uploads>({});
  const [uploading, setUploading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [emailChallenge, setEmailChallenge] = useState<{
    email: string;
    retryAt: number;
  } | null>(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<{
    email: string;
    proof: string;
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousStep = useRef(step);
  const busy = uploading || submitting || sendingCode || submissionComplete;
  const email = values.email.trim().toLowerCase();
  const emailProof =
    verifiedEmail?.email === email ? verifiedEmail.proof : null;
  const navigationLocked = busy || showEmailVerification;
  const accessibleStep = navigationLocked
    ? -1
    : allowStepPreview
      ? STEPS.length - 1
      : emailProof
        ? furthest
        : 0;
  const completed = emailProof
    ? completedSteps
    : completedSteps.filter((index) => index !== 0);
  const payload = {
    ...values,
    barangay:
      values.barangay ?? barangayFromStreetAddress(values.streetAddress),
    zipCode: registrationZipCode(values),
    requestedSlug: requestAccount ? values.requestedSlug : undefined,
  };
  const requiredDocuments = applicationDocumentsFor(values.businessType);

  function missingIdentityDocuments(): Errors {
    return Object.fromEntries(
      IDENTITY_DOCUMENT_SLOTS.filter(({ key }) => !docs[key]).map(
        ({ key, side }) => [
          key,
          `Upload the ${side.toLowerCase()} of your government-issued ID to continue.`,
        ],
      ),
    );
  }

  const savedDraft = useSyncExternalStore(
    subscribeToDrafts,
    () => readDraft(draftKey),
    () => null,
  );

  function restoreDraft() {
    setDraftPromptDismissed(true);
    setDraftError(null);
    setDraftRestored(false);
    try {
      const draft: unknown = savedDraft && JSON.parse(savedDraft);
      if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error();
      const fields = draft as Record<string, unknown>;
      const restored = Object.fromEntries(Object.entries(initialValues).flatMap(([key, fallback]) => {
        if (key === "password" || key === "confirmPassword" || key === "confirmAccuracy") return [];
        const value = fields[key];
        const valid = fallback === null ? value === null || typeof value === "string" : typeof value === typeof fallback;
        return valid ? [[key, value]] : [];
      })) as Partial<Values>;
      const restoredValues = { ...initialValues, ...restored };
      setValues(restoredValues);
      setErrors({});
      setDocErrors({});
      Object.values(docs).forEach(releaseObjectUrl);
      releaseObjectUrl(logo);
      setDocs({});
      setUploads({});
      setLogo(null);
      setLogoError(null);
      setVerifiedEmail(null);
      setEmailChallenge(null);
      setCompletedSteps([]);
      setFurthest(0);
      setDraftRestored(true);
    } catch {
      setDraftError("This draft could not be restored. You can continue with a new application.");
    }
  }

  useEffect(() => {
    try {
      // clear files saved by the former document-draft feature
      window.indexedDB?.deleteDatabase("fides-registration");
    } catch {
      // storage can be unavailable in restricted browsing contexts
    }
  }, []);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    window.scrollTo({ top: 0 });
    mainRef.current?.querySelector("h1")?.focus({ preventScroll: true });
  }, [step]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => {
      const requestedSlug =
        requestAccount &&
        key === "businessName" &&
        current.requestedSlug ===
          normalizeSlugInput(current.businessName).replace(/-$/, "")
          ? normalizeSlugInput(String(value)).replace(/-$/, "")
          : current.requestedSlug;
      const updated = { ...current, requestedSlug, [key]: value };
      if (key === "province" && updated.province && updated.city && !provinceHasCity(updated.province, updated.city)) {
        updated.city = "";
      }
      if ((key === "province" || key === "city") && updated.barangay
        && !locationHasBarangay(updated.province, updated.city, updated.barangay)) {
        updated.barangay = "";
      }
      return updated;
    });
    if (key === "businessType") {
      setDocErrors({});
      setCompletedSteps((current) => current.filter((index) => index !== 3));
      setFurthest((current) => Math.min(current, 3));
    }
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    );
  }

  function focusFirstError() {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid="true"]',
      );
      if (!target) return;
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
  }

  function validateCurrent(): boolean {
    const schema = stepSchemas[step];
    let found: Errors = schema ? validateStep(schema, payload) : {};
    if (
      step === 0 &&
      !found.confirmPassword &&
      values.password !== values.confirmPassword
    ) {
      found = { ...found, confirmPassword: "Passwords do not match." };
    }
    if (step === 1) found = { ...found, ...missingIdentityDocuments() };
    if (step === 2 && !logo) found.logo = BUSINESS_LOGO_REQUIRED;
    if (step === 3) {
      const missing: Errors = {};
      const identityMissing = missingIdentityDocuments();
      if (Object.keys(identityMissing).length) {
        setErrors(identityMissing);
        setStep(1);
        focusFirstError();
        return false;
      }
      for (const slot of requiredDocuments) {
        if (!docs[slot.key])
          missing[slot.key] =
            `${slot.title} is required. Please upload a PDF, JPG or PNG file (max ${documentSizeMb} MB).`;
      }
      setDocErrors(missing);
      const count = Object.keys(missing).length;
      found = count
        ? {
            documents: `${count} required ${count === 1 ? "document is" : "documents are"} still missing.`,
          }
        : {};
    }
    setErrors(found);
    const ok = Object.keys(found).length === 0;
    if (!ok) focusFirstError();
    return ok;
  }

  function setDocument(
    key: DocumentKey,
    title: string,
    file: File,
  ): string | null {
    const problem = documentFileProblem(file, title, documentByteLimit(key));
    if (problem) return problem;
    releaseObjectUrl(docs[key]);
    setDocs((current) => ({ ...current, [key]: file }));
    setDocErrors((current) => ({ ...current, [key]: undefined }));
    setErrors((current) => ({
      ...current,
      documents: undefined,
      [key]: undefined,
    }));
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
    setCompletedSteps((current) =>
      current.includes(step) ? current : [...current, step],
    );
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function sendEmailCode(
    address: string,
  ): ReturnType<typeof sendRegistrationCodeAction> {
    setSendingCode(true);
    try {
      const result = await sendRegistrationCodeAction(address);
      if (result.ok) setSentEmail(address);
      return result;
    } catch {
      return {
        ok: false,
        error: "We couldn’t send the verification code. Please try again.",
      };
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
    if (step === 3 && !(await uploadVerificationDocuments())) return;
    finishStep();
  }

  async function uploadVerificationDocuments() {
    setUploading(true);
    try {
      const results = await Promise.all(
        requiredDocuments.map(async ({ key }) => {
          const file = docs[key];
          if (!file) return false;
          if (uploads[key]?.file === file && uploads[key]?.receipt) return true;

          const update = (state: Omit<UploadState, "file">) => {
            setUploads((current) => ({
              ...current,
              [key]: { ...state, file },
            }));
          };
          update({ percent: 0 });
          try {
            const receipt = await uploadDocument(key, file, (percent) =>
              update({ percent }),
            );
            update({ percent: 100, receipt });
            return true;
          } catch (error) {
            update({
              percent: 0,
              error:
                error instanceof Error
                  ? error.message
                  : "Upload failed. Please retry.",
            });
            return false;
          }
        }),
      );
      const failedIdentity = requiredDocuments.find(({ key }, index) =>
        !results[index] && IDENTITY_DOCUMENT_SLOTS.some((slot) => slot.key === key),
      );
      if (failedIdentity) {
        setErrors({ documents: `Could not upload ${failedIdentity.title}. Select Continue to retry.` });
      }
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
    const { password: _password, confirmPassword: _confirm, confirmAccuracy: _consent, ...safe } = values;
    void _password;
    void _confirm;
    void _consent;
    setDraftError(null);
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(safe));
      window.dispatchEvent(new Event(draftUpdatedEvent));
      setDraftPromptDismissed(true);
      setDraftSaved(true);
    } catch {
      setDraftError("The draft could not be saved. Check that your browser allows local storage and try again.");
    }
  }

  async function submit() {
    setSubmitError(null);
    if (!values.confirmAccuracy) {
      setErrors({
        confirmAccuracy: "Please confirm that your information is accurate.",
      });
      return;
    }
    if (busy) return;
    const parsed = registrationSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0] ?? "");
      const target = [
        "email",
        "password",
        "confirmPassword",
        "acceptTerms",
      ].includes(field)
        ? 0
        : ["ownerLegalName", "dateOfBirth", "idType"].includes(field)
          ? 1
          : ["planCode"].includes(field)
            ? 4
            : 2;
      setErrors({ [field]: issue.message });
      setSubmitError(issue.message);
      setStep(target);
      focusFirstError();
      return;
    }
    if (!emailProof) {
      setErrors({
        email: "Verify your business email before submitting your application.",
      });
      setStep(0);
      return;
    }

    if (!logo) {
      setErrors({ logo: BUSINESS_LOGO_REQUIRED });
      setStep(2);
      focusFirstError();
      return;
    }

    const missingDocs = requiredDocuments.filter((doc) => !docs[doc.key]);
    if (missingDocs.length > 0) {
      const onIdentity = IDENTITY_DOCUMENT_SLOTS.some(({ key }) => !docs[key]);
      const message = `Please upload all required documents before submitting (missing: ${missingDocs.map((doc) => doc.title).join(", ")}).`;
      setSubmitError(message);
      if (onIdentity) {
        setErrors(missingIdentityDocuments());
        setStep(1);
      } else {
        setDocErrors(
          Object.fromEntries(
            missingDocs.map((doc) => [doc.key, `${doc.title} is required.`]),
          ),
        );
        setStep(3);
      }
      focusFirstError();
      return;
    }

    const receipts: Partial<Record<DocumentKey, UploadReceipt>> = {};
    for (const { key, title } of requiredDocuments) {
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
      body.set("logo", logo);
      body.set("uploadedDocuments", JSON.stringify(receipts));
      const response = await fetch("/api/applications", {
        method: "POST",
        body,
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        documentKey?: DocumentKey;
        emailVerificationRequired?: boolean;
      };
      if (!response.ok) {
        setSubmitError(
          result.error ??
            "We could not submit your application. Please try again.",
        );
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
      try {
        window.localStorage.removeItem(draftKey);
        window.sessionStorage.removeItem(draftKey);
        window.dispatchEvent(new Event(draftUpdatedEvent));
      } catch {
        // Storage restrictions must not interrupt a completed submission.
      }
      setSubmissionComplete(true);
      router.replace("/?application=received");
    } catch {
      setSubmitError(
        "We could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <Sidebar
        current={step}
        furthest={accessibleStep}
        completed={completed}
        onJump={setStep}
      />
      <MobileProgress
        current={step}
        completed={completed}
        onJump={allowStepPreview ? setStep : undefined}
        navigationLocked={navigationLocked}
      />
      <main
        ref={mainRef}
        className="flex min-w-0 flex-1 flex-col items-center px-4 py-6 sm:px-8 lg:px-6 lg:py-8 xl:px-8"
      >
        {step === 0 && (
          <nav
            aria-label="Registration links"
            className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 self-start"
          >
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-md pr-2 text-base font-semibold text-burnt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            >
              <Icon name="arrow-left" className="size-5" /> Back to Home
            </Link>
          </nav>
        )}
        <div
          className={cn(
            "flex w-full flex-1 flex-col",
            step === 4 || step === 5
              ? "max-w-[1100px]"
              : step === 3
                ? "max-w-[900px]"
                : step === 0
                  ? "max-w-lg"
                  : step === 1
                    ? "max-w-[760px]"
                    : "max-w-[744px]",
          )}
        >
          {step === 0 && (
            <div className="my-auto py-4 sm:py-6">
              {showEmailVerification && emailChallenge ? (
                <EmailVerificationStep
                  email={emailChallenge.email}
                  retryAt={emailChallenge.retryAt}
                  onResend={() => sendEmailCode(emailChallenge.email)}
                  onResent={(retryAt) =>
                    setEmailChallenge({ email: emailChallenge.email, retryAt })
                  }
                  onEdit={() => {
                    setShowEmailVerification(false);
                    requestAnimationFrame(() =>
                      mainRef.current
                        ?.querySelector<HTMLInputElement>("#email")
                        ?.focus(),
                    );
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
                  {draftError && <p role="alert" className="mb-4 text-sm text-danger">{draftError}</p>}
                  <AccountStep
                    values={values}
                    errors={errors}
                    set={set}
                    onNext={next}
                    sendingCode={sendingCode}
                  />
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
              logoError={logoError ?? errors.logo ?? null}
              onLogo={(file) => {
                const problem = file.size === 0 ? "The logo file is empty. Choose another image." : validateFile(
                  file,
                  FILE_LIMITS.logoTypes,
                  FILE_LIMITS.logoBytes,
                  "The logo",
                );
                setLogoError(problem);
                if (!problem) {
                  releaseObjectUrl(logo);
                  setLogo(file);
                  setErrors((current) => ({ ...current, logo: undefined }));
                }
              }}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 3 && (
            <DocumentsStep
              businessType={values.businessType}
              businessTypeName={businessTypeLabel(values.businessType, values.customBusinessType)}
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
          {step === 4 && (
            <PlanStep
              values={values}
              errors={errors}
              set={set}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 5 && (
            <SummaryStep
              values={values}
              errors={errors}
              set={set}
              logo={logo}
              docs={docs}
              submitting={submitting}
              submitError={submitError}
              draftError={draftError}
              onPreview={(file, title) => setPreview({ file, title })}
              onEdit={(index) => {
                if (!busy) goTo(index);
              }}
              onBack={back}
              onSaveDraft={saveDraft}
              onSubmit={submit}
            />
          )}
        </div>
      </main>
      <FilePreviewDialog
        file={preview?.file ?? null}
        title={preview?.title ?? ""}
        onClose={() => setPreview(null)}
      />
      {step === 0 && savedDraft && !draftPromptDismissed && !navigationLocked && !sentEmail && !preview && (
        <StaffConfirmationDialog
          title="Your progress was saved"
          description="You have an application draft saved on this device. Restore it to pick up where you left off."
          onClose={() => setDraftPromptDismissed(true)}
        >
          <button type="button" className={secondaryButton} onClick={() => setDraftPromptDismissed(true)}>
            Continue without draft
          </button>
          <button type="button" className={primaryButton} onClick={restoreDraft}>
            Restore draft
          </button>
        </StaffConfirmationDialog>
      )}
      {draftSaved && (
        <StaffSuccessDialog
          title="Draft saved"
          description="Resume in this browser. When you return, re-enter your password and attach your files again."
          onClose={() => setDraftSaved(false)}
        />
      )}
      {draftRestored && (
        <StaffSuccessDialog
          title="Draft restored"
          description="Re-enter your password and attach your files again as you continue."
          onClose={() => {
            setDraftRestored(false);
            requestAnimationFrame(() => mainRef.current?.querySelector<HTMLInputElement>("#password")?.focus());
          }}
        />
      )}
      {submitting ? <MascotLoadingDialog label="Submitting your application" /> : sendingCode ? (
        <MascotLoadingDialog />
      ) : (
        sentEmail && (
          <StaffSuccessDialog
            title="Verification email sent"
            description={`Check ${sentEmail} for the six-digit code, then enter it to continue.`}
            onClose={() => {
              setSentEmail(null);
              requestAnimationFrame(() =>
                mainRef.current
                  ?.querySelector<HTMLInputElement>("#registration-code")
                  ?.focus(),
              );
            }}
          />
        )
      )}
    </div>
  );
}

type StepProps = {
  values: Values;
  errors: Errors;
  set: <K extends keyof Values>(key: K, value: Values[K]) => void;
};

function Heading({
  title,
  subtitle,
  center = true,
  className = "mb-6",
}: {
  title: string;
  subtitle: string;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        center ? "text-center" : "text-left",
        className,
      )}
    >
      <h1
        tabIndex={-1}
        className="font-display text-[28px] leading-[38px] text-ink focus:outline-none sm:text-[32px] sm:leading-[42px]"
      >
        {title}
      </h1>
      <p className="text-base leading-6 text-muted">{subtitle}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <BaseCard className="rounded-xl border-line p-5 text-ink sm:p-6">
      {children}
    </BaseCard>
  );
}

function AccountStep({
  values,
  errors,
  set,
  onNext,
  sendingCode,
}: StepProps & { onNext: () => void; sendingCode: boolean }) {
  const [passwordFocused, setPasswordFocused] = useState(false);
  const showPasswordRules = passwordFocused && values.password.length > 0;
  const passwordDescription =
    [
      errors.password ? "password-error" : null,
      showPasswordRules ? "password-requirements" : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

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
      <Heading
        title="Create Your Account"
        subtitle="Start your journey with Fides — it only takes a few minutes."
        className="mb-10"
      />
      <fieldset disabled={sendingCode} className="min-w-0">
        <div className="grid gap-7 sm:gap-8">
          <Field label="Business Email" htmlFor="email" error={errors.email}>
            <TextInput
              id="email"
              type="email"
              invalid={!!errors.email}
              autoComplete="email"
              placeholder="maria@bellavita.ph"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <div
            onFocus={() => setPasswordFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setPasswordFocused(false);
            }}
          >
            <Field label="Password" htmlFor="password" error={errors.password}>
              <PasswordInput
                id="password"
                fieldLabel="password"
                aria-describedby={passwordDescription}
                invalid={!!errors.password}
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </Field>
            {showPasswordRules && (
              <ul
                id="password-requirements"
                className="mt-3 flex flex-col gap-1 text-sm leading-5"
                aria-label="Password requirements"
              >
                {registrationPasswordRules.map((rule) => {
                  const met = rule.passes(values.password);
                  return (
                    <li
                      key={rule.text}
                      className={cn(
                        "flex items-center gap-2",
                        met ? "text-success" : "text-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 items-center justify-center rounded-full",
                          met
                            ? "bg-success text-white"
                            : "border border-outline/60",
                        )}
                      >
                        {met ? (
                          <Icon name="check" className="size-2.5" />
                        ) : null}
                      </span>
                      <span className="sr-only">
                        {met ? "Met: " : "Required: "}
                      </span>
                      {rule.text}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Field
            label="Confirm Password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword}
          >
            <PasswordInput
              id="confirmPassword"
              fieldLabel="confirm password"
              invalid={!!errors.confirmPassword}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={values.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-col gap-1">
          <label className="flex min-h-6 cursor-pointer items-start gap-3 text-sm leading-6 text-body">
            <input
              type="checkbox"
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={
                errors.acceptTerms ? "acceptTerms-error" : undefined
              }
              checked={values.acceptTerms}
              onChange={(e) => set("acceptTerms", e.target.checked)}
              className="mt-1 size-4 shrink-0 accent-burnt"
            />
            <span>
              I agree to the{" "}
              <Link
                href="/#contact"
                className="font-semibold text-burnt hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/#contact"
                className="font-semibold text-burnt hover:underline"
              >
                Privacy Policy
              </Link>{" "}
              of Fides.
            </span>
          </label>
          {errors.acceptTerms ? (
            <p
              id="acceptTerms-error"
              role="alert"
              className="text-sm text-danger"
            >
              {errors.acceptTerms}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col items-center gap-6">
          <button type="submit" className={primaryButton}>
            Continue <Icon name="arrow-right" className="size-4" />
          </button>
          <div className="lg:w-max lg:whitespace-nowrap">
            <SecureFooter>
              Your data is encrypted and secure. We never share your
              information.
            </SecureFooter>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

function StepActions({ onBack }: { onBack?: () => void }) {
  return (
    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
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
  values,
  errors,
  set,
  docs,
  onFile,
  onRemove,
  onPreview,
  onBack,
  onNext,
}: StepProps & {
  docs: DocMap;
  onFile: (
    key: IdentityDocumentKey,
    title: string,
    file: File,
  ) => string | null;
  onRemove: (key: IdentityDocumentKey) => void;
  onPreview: (file: File, title: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() - 18);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading
        center={false}
        title="Verify Your Identity"
        subtitle="We need to confirm the identity of the business owner. This information is kept secure and used only for verification purposes."
      />
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Owner's Legal Full Name"
            htmlFor="ownerLegalName"
            error={errors.ownerLegalName}
          >
            <TextInput
              id="ownerLegalName"
              invalid={!!errors.ownerLegalName}
              autoComplete="name"
              placeholder="Maria Santos"
              value={values.ownerLegalName}
              onChange={(event) => set("ownerLegalName", event.target.value)}
            />
          </Field>
          <Field
            label="Date of Birth"
            htmlFor="dateOfBirth"
            error={errors.dateOfBirth}
          >
            <CalendarPicker
              id="dateOfBirth"
              panelLabel="Date of birth"
              value={values.dateOfBirth}
              onChange={(value) => set("dateOfBirth", value)}
              min="1900-01-01"
              max={calendarDateKey(latest)}
              locale="en-US"
              showWeekdays={false}
              invalid={!!errors.dateOfBirth}
              describedBy={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
            />
          </Field>
          <Listbox
            id="idType"
            label="ID Type"
            required
            value={values.idType}
            options={ID_TYPES}
            onChange={(value) => set("idType", value)}
            error={errors.idType}
            placeholder="Select an ID type"
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
            Your identity documents are encrypted and stored securely. They are
            used solely to verify your identity. Verification typically takes
            1–2 business days.
          </InfoNote>
        </div>
        <StepActions onBack={onBack} />
      </Card>
    </form>
  );
}

function registrationZipCode(values: Values) {
  return values.zipCode || postalCodeForBarangay(values.province, values.city, values.barangay ?? "");
}

function includeSavedOption(options: { value: string; label: string }[], value: string) {
  return value && !options.some((option) => option.value === value)
    ? [{ value, label: value }, ...options]
    : options;
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
  onLogo: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const logoUrl = useObjectUrl(logo);
  const cityOptions = useMemo(() => cityOptionsForProvince(values.province), [values.province]);
  const barangayOptions = useMemo(
    () => barangayOptionsForLocation(values.province, values.city),
    [values.province, values.city],
  );
  const barangay = values.barangay ?? barangayFromStreetAddress(values.streetAddress);
  const zipCode = registrationZipCode(values);
  const zipHint = barangay && !zipCode ? "Enter the ZIP code for your specific address." : undefined;
  return (
    <form
      className="my-auto py-4 sm:py-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading
        title="Tell us about your business"
        subtitle="This information powers your public booking portal on Fides."
        className="mb-8 sm:mb-10"
      />
      {requestAccount && (
        <div className="mb-5">
          <SlugBadge
            slug={values.requestedSlug}
            onChange={(slug) => set("requestedSlug", slug)}
            error={errors.requestedSlug}
          />
        </div>
      )}
      <Card>
        <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
          <div className="relative grid size-[100px] shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-mist text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Business logo preview"
                className="absolute inset-0 size-full object-cover object-center"
              />
            ) : (
              <Icon name="gallery" className="size-9 text-glyph" />
            )}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p id="business-logo-label" className="text-base font-semibold text-ink">
              Business Logo <span className="text-danger" aria-hidden="true">*</span>
            </p>
            <p className="text-sm text-subtle">
              Recommended: square JPG or PNG, at least 400×400 px. Max 2 MB.
            </p>
            <label className="inline-flex h-12 w-40 cursor-pointer items-center justify-center rounded-md border border-outline/70 px-3 text-base font-semibold text-muted transition-colors hover:border-burnt hover:text-burnt focus-within:ring-2 focus-within:ring-burnt/40">
              {logo ? "Replace Logo" : "Upload Logo"}
              <input
                type="file"
                required={!logo}
                aria-labelledby="business-logo-label"
                aria-invalid={!!logoError}
                aria-describedby={logoError ? "business-logo-error" : undefined}
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onLogo(file);
                  event.target.value = "";
                }}
              />
            </label>
            {logoError ? (
              <p id="business-logo-error" role="alert" className="text-sm text-danger">
                {logoError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-6">
          <Field
            label="Business Name"
            htmlFor="businessName"
            error={errors.businessName}
            className="sm:col-span-4"
          >
            <TextInput
              id="businessName"
              invalid={!!errors.businessName}
              placeholder="Bella Vita Salon & Spa"
              value={values.businessName}
              onChange={(e) => set("businessName", e.target.value)}
            />
          </Field>
          <Field
            label="Established Year"
            htmlFor="establishedYear"
            error={errors.establishedYear}
            className="sm:col-span-2"
          >
            <TextInput
              id="establishedYear"
              inputMode="numeric"
              maxLength={4}
              invalid={!!errors.establishedYear}
              placeholder="2020"
              value={values.establishedYear}
              onChange={(e) =>
                set("establishedYear", e.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          {values.businessType === OTHER_BUSINESS_TYPE ? (
            <Field label="Business Type" htmlFor="customBusinessType" error={errors.customBusinessType} className="sm:col-span-4">
              <div className="flex min-w-0 items-center gap-2">
                <TextInput
                  id="customBusinessType"
                  className="min-w-0 flex-1"
                  placeholder="e.g. Pet grooming"
                  maxLength={BUSINESS_TYPE_MAX_LENGTH}
                  invalid={!!errors.customBusinessType}
                  required
                  value={values.customBusinessType}
                  onChange={(event) => set("customBusinessType", event.target.value)}
                />
                <button
                  type="button"
                  className={buttonClasses({ variant: "brand-outline", size: "form", className: "shrink-0" })}
                  onClick={() => {
                    set("businessType", "");
                    requestAnimationFrame(() => document.getElementById("businessType")?.focus());
                  }}
                >
                  Use list
                </button>
              </div>
            </Field>
          ) : (
            <Listbox
              id="businessType"
              label="Business Type"
              required
              searchable
              size="large"
              value={values.businessType}
              options={BUSINESS_TYPES.map((type) => ({ value: type, label: type }))}
              onChange={(value) => {
                set("businessType", value);
                if (value === OTHER_BUSINESS_TYPE) {
                  requestAnimationFrame(() => document.getElementById("customBusinessType")?.focus());
                }
              }}
              error={errors.businessType}
              placeholder="Select a business type"
              className="sm:col-span-4"
            />
          )}
          <Listbox
            id="province"
            label="Province"
            required
            size="large"
            searchable
            value={values.province}
            options={includeSavedOption(provinceOptions, values.province)}
            onChange={(province) => set("province", province)}
            error={errors.province}
            placeholder="Search provinces"
            className="sm:col-span-2"
          />
          <Listbox
            id="city"
            label="City"
            required
            size="large"
            searchable
            value={values.city}
            options={includeSavedOption(cityOptions, values.city)}
            onChange={(city) => set("city", city)}
            error={errors.city}
            placeholder="Search cities"
            className="sm:col-span-2"
          />
          <Listbox
            id="barangay"
            label="Barangay"
            required
            size="large"
            searchable
            resultLimit={100}
            value={barangay}
            options={includeSavedOption(barangayOptions, barangay)}
            onChange={(name) => set("barangay", name)}
            error={errors.barangay}
            placeholder="Search barangays"
            className="sm:col-span-2"
          />
          <Field
            label="ZIP Code"
            htmlFor="zipCode"
            error={errors.zipCode}
            hint={zipHint}
            className="sm:col-span-2"
          >
            <TextInput
              id="zipCode"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={12}
              invalid={!!errors.zipCode}
              placeholder="Enter ZIP code"
              value={zipCode}
              aria-describedby={errors.zipCode ? "zipCode-error" : zipHint ? "zipCode-hint" : undefined}
              onChange={(e) =>
                set("zipCode", e.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <Field
            label="Street Address"
            htmlFor="streetAddress"
            error={errors.streetAddress}
            className="sm:col-span-6"
          >
            <TextInput
              id="streetAddress"
              autoComplete="address-line1"
              invalid={!!errors.streetAddress}
              placeholder="Unit/Floor/Building No., Street Name, Subdivision/Village"
              value={values.streetAddress}
              onChange={(e) => set("streetAddress", e.target.value)}
              aria-describedby={
                errors.streetAddress
                  ? "streetAddress-error"
                  : "streetAddress-hint"
              }
            />
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

const documentSections: { title: string; keys: readonly BusinessDocumentKey[] }[] = [
  { title: "Core Registration", keys: ["dti_sec_registration", "community_tax", "bir_registration", "authority_to_print", "service_invoices", "books_of_accounts", "gpp_registration"] },
  { title: "Premises & Permits", keys: ["barangay_clearance", "proof_of_address", "zoning_clearance", "occupancy_inspection", "fire_safety", "mayors_permit", "sanitary_permit"] },
  { title: "Staff Health & Safety", keys: ["health_cards", "massage_certificates", "pathogen_training", "hazardous_waste", "waste_transport", "water_potability", "construction_safety", "sss_employer", "philhealth_employer", "pagibig_employer"] },
];

const groupedDocumentKeys = new Set(documentSections.flatMap(({ keys }) => keys));

function groupBusinessDocuments(documents: ReturnType<typeof businessDocumentsFor>) {
  return [
    ...documentSections.map(({ title, keys }) => ({ title, documents: documents.filter(({ key }) => keys.includes(key)) })),
    { title: "Industry Requirements", documents: documents.filter(({ key }) => !groupedDocumentKeys.has(key)) },
  ].filter((section) => section.documents.length > 0);
}

function DocumentsStep({
  businessType,
  businessTypeName,
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
  businessType: string;
  businessTypeName: string;
  uploads: Uploads;
  uploading: boolean;
  docs: DocMap;
  docErrors: Errors;
  summaryError?: string;
  onFile: (
    key: BusinessDocumentKey,
    title: string,
    file: File,
  ) => string | null;
  onRemove: (key: BusinessDocumentKey) => void;
  onPreview: (file: File, title: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const documents = businessDocumentsFor(businessType);
  const added = documents.filter(({ key }) => docs[key]).length;
  const uploaded = documents.filter(({ key }) => uploads[key]?.file === docs[key] && uploads[key]?.receipt).length;
  const sections = groupBusinessDocuments(documents);
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
        subtitle={businessType
          ? `All documents listed below are required for your selected business type (${businessTypeName}).`
          : "Select a business type in Step 3 to see the full list of required documents."}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
        <div role="status" className="min-w-0">
          <p className="text-base font-semibold text-ink">{added} of {documents.length} documents added</p>
          <p className="text-sm text-muted">{uploaded} uploaded. Files are sent when you select Continue.</p>
        </div>
        <progress aria-label="Business documents added" value={added} max={documents.length} className="h-2.5 w-full appearance-none overflow-hidden rounded-full bg-mist [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-mist [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-burnt [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-burnt" />
      </div>
      {summaryError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-base text-danger-dark"
        >
          {summaryError}
        </p>
      ) : null}
      <div className="space-y-6">
        {sections.map((section) => (
          <fieldset key={section.title} disabled={uploading} className="min-w-0">
            <legend className="mb-3 text-base font-semibold text-ink">{section.title}</legend>
            <div className="grid gap-4 md:grid-cols-2">
              {section.documents.map((slot) => {
                const file = docs[slot.key] ?? null;
                const upload = uploads[slot.key]?.file === file ? uploads[slot.key] : undefined;
                return (
                  <DocumentCard
                    key={slot.key}
                    title={slot.title}
                    hint={slot.hint}
                    file={file}
                    error={docErrors[slot.key] ?? upload?.error}
                    uploaded={!!upload?.receipt}
                    progress={uploading && !upload?.receipt && !upload?.error ? upload?.percent : undefined}
                    onFile={(file) => onFile(slot.key, slot.title, file)}
                    onRemove={() => onRemove(slot.key)}
                    onPreview={(file) => onPreview(file, slot.title)}
                  />
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <InfoNote>
          These documents will be included in your application summary on the
          final step. Review by our team begins only after you submit your
          complete application. This typically takes 1–2 business days.
        </InfoNote>
        <p className="text-sm text-subtle">
          PDF, JPG or PNG · Max {documentSizeMb} MB per file
        </p>
        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onBack}
            disabled={uploading}
            className={secondaryButton}
          >
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

function PlanStep({
  values,
  errors,
  set,
  onBack,
  onNext,
}: StepProps & { onBack: () => void; onNext: () => void }) {
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
        className="mb-10 sm:mb-12"
        subtitle="The Professional plan is pre-selected. You can change your plan anytime after launch."
      />
      <PlanCardGrid
        selectedCode={values.planCode}
        onSelect={(code) => set("planCode", code)}
      />
      {errors.planCode ? (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {errors.planCode}
        </p>
      ) : null}
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted">
        <Icon name="check" weight="bold" className="size-4 text-success" />
        {TRIAL_DAYS}-day free trial on all plans · No credit card required ·
        Cancel anytime
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            secondaryButton,
            "border-burnt text-burnt hover:bg-burnt/5",
          )}
        >
          Back
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
  className,
  onEdit,
  children,
}: {
  title: string;
  className?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-xl border border-line bg-white", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-ink">
          {title}
        </h2>
        <button
          type="button"
          aria-label={`Edit ${title}`}
          onClick={onEdit}
          className={buttonClasses({
            variant: "brand-outline",
            size: "xs",
          })}
        >
          Edit
        </button>
      </header>
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function FileRow({ label, file, onPreview }: { label: string; file?: File | null; onPreview: () => void }) {
  if (!file) {
    return (
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 font-medium text-ink">{label}</span>
        <span className="shrink-0 text-xs font-semibold text-danger">Missing</span>
      </div>
    );
  }

  return (
    <button type="button" onClick={onPreview} aria-label={`Preview ${label}: ${file.name}`} title={file.name}
      className="flex min-h-12 w-full min-w-0 items-center gap-3 rounded-lg border border-line px-3 py-2 text-left hover:border-burnt/40 hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-ink">{label}</span>
        <span className="block truncate text-xs leading-5 text-muted">{file.name} · {formatBytes(file.size)}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-burnt">View</span>
    </button>
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
  draftError,
  onPreview,
  onEdit,
  onBack,
  onSaveDraft,
  onSubmit,
}: StepProps & {
  logo: File | null;
  docs: DocMap;
  submitting: boolean;
  submitError: string | null;
  draftError: string | null;
  onPreview: (file: File, title: string) => void;
  onEdit: (step: number) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const idLabel =
    ID_TYPES.find((item) => item.value === values.idType)?.label ??
    values.idType;
  const dob = values.dateOfBirth
    ? new Date(`${values.dateOfBirth}T00:00:00`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";
  const businessDocuments = businessDocumentsFor(values.businessType);
  const missingDocuments = businessDocuments.filter(({ key }) => !docs[key]).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-2 py-3 text-center sm:py-5">
        <h1
          tabIndex={-1}
          className="font-display text-[28px] leading-[38px] text-ink focus:outline-none sm:text-[32px] sm:leading-[42px]"
        >
          Application Summary
        </h1>
        <p className="text-base text-muted">
          Review your details and documents before submitting your application.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Account Details"
          onEdit={() => onEdit(0)}
        >
          <Row label="Email Address" value={values.email} />
          <Row label="Password" value="Set securely" />
        </SummaryCard>

        <SummaryCard
          title="Subscription Package"
          onEdit={() => onEdit(4)}
        >
          <SelectedPlanSummary code={values.planCode} />
        </SummaryCard>

        <SummaryCard
          title="Identity Verification"
          onEdit={() => onEdit(1)}
        >
          <Row label="Owner Name" value={values.ownerLegalName} />
          <Row label="Date of Birth" value={dob} />
          <Row label="ID Type" value={idLabel} />
          <div className="mt-1 grid gap-2 border-t border-line pt-3">
            {IDENTITY_DOCUMENT_SLOTS.map(({ key, title }) => {
              const file = docs[key];
              return <FileRow key={key} label={title} file={file} onPreview={() => file && onPreview(file, title)} />;
            })}
          </div>
        </SummaryCard>

        <SummaryCard
          title="Business Information"
          onEdit={() => onEdit(2)}
        >
          <Row label="Business Name" value={values.businessName} />
          {values.requestedSlug && (
            <Row label="Requested subdomain" value={values.requestedSlug} />
          )}
          <Row label="Category" value={businessTypeLabel(values.businessType, values.customBusinessType)} />
          <Row label="Established" value={values.establishedYear} />
          <Row
            label="Address"
            value={
              <>
                {formatRegistrationStreetAddress(
                  values.streetAddress,
                  values.barangay ??
                    barangayFromStreetAddress(values.streetAddress),
                )}
                <br />
                {values.city}, {values.province} {registrationZipCode(values)}
              </>
            }
          />
          <div className="mt-1 border-t border-line pt-3">
            {logo ? (
              <FileRow label="Business Logo" file={logo} onPreview={() => onPreview(logo, "Business Logo")} />
            ) : (
              <Row label="Business Logo" value="No logo added" />
            )}
          </div>
        </SummaryCard>

        <SummaryCard
          title="Document Requirements"
          className="md:col-span-2"
          onEdit={() => onEdit(3)}
        >
          {missingDocuments > 0 && (
            <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">
              {missingDocuments} {missingDocuments === 1 ? "document is" : "documents are"} missing. Select Edit to upload them.
            </p>
          )}
          <div className="space-y-5">
            {groupBusinessDocuments(businessDocuments).map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 text-sm font-semibold text-ink">{section.title}</h3>
                <ul className="grid gap-2 md:grid-cols-2">
                  {section.documents.map(({ key, title }) => {
                    const file = docs[key];
                    return (
                      <li key={key} className="min-w-0">
                        <FileRow label={title} file={file} onPreview={() => file && onPreview(file, title)} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </SummaryCard>
      </div>

      <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ink">Accuracy &amp; Consent</h2>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-base leading-6 text-body">
          <input
            type="checkbox"
            aria-invalid={!!errors.confirmAccuracy}
            aria-describedby={errors.confirmAccuracy ? "confirmAccuracy-error" : undefined}
            checked={values.confirmAccuracy}
            onChange={(event) => set("confirmAccuracy", event.target.checked)}
            className="mt-1 size-4 shrink-0 accent-burnt"
          />
          <span>
            I confirm that all information and documents provided are accurate and
            complete. I understand that submitting false information may result in
            rejection of my application.
          </span>
        </label>
        {errors.confirmAccuracy ? (
          <p id="confirmAccuracy-error" role="alert" className="mt-2 text-sm text-danger">
            {errors.confirmAccuracy}
          </p>
        ) : null}
        <p className="mt-4 border-t border-line pt-4 text-sm text-subtle">
          After confirming, your application will be reviewed within 1–2
          business days. You will be notified by email at {values.email}.
        </p>

        {submitError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-danger-bg px-4 py-3 text-base text-danger-dark"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onBack} disabled={submitting} className={secondaryButton}>
            Back
          </button>
          <button type="button" onClick={onSaveDraft} disabled={submitting} className={secondaryButton}>
            Save Draft
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={cn(primaryButton, "w-full sm:ml-auto sm:w-auto")}
          >
            Confirm Application
          </button>
        </div>
        {draftError ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {draftError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
