"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { adminButtonClasses } from "@/components/admin/admin-button";
import { Icon, type IconName } from "@/components/admin/icon";
import { Card as BaseCard } from "@/components/ui";
import {
  ALL_DOCUMENTS,
  BUSINESS_TYPES,
  DOCUMENT_SLOTS,
  FILE_LIMITS,
  GOVERNMENT_ID_SLOT,
  ID_TYPES,
  PLAN_OPTIONS,
  TRIAL_DAYS,
  type BusinessDocumentKey,
  type DocumentKey,
} from "@/lib/registration/options";
import {
  accountStepSchema,
  businessStepSchema,
  checkPassword,
  identityStepSchema,
  planStepSchema,
  registrationSchema,
  validateStep,
} from "@/lib/registration/schema";
import { cn } from "@/lib/utils";
import { PlanCardGrid, PlanComparisonRow, SelectedPlanSummary } from "./plan-selection";
import { SlugBadge } from "./slug-badge";
import { uploadDocument } from "./upload-document";
import { normalizeSlugInput } from "@/lib/account-request/schema";
import {
  DatePicker,
  DocumentCard,
  documentFileProblem,
  FilePreviewDialog,
  formatBytes,
  IdUpload,
  releaseObjectUrl,
  SelectField,
  toIsoDate,
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

type DocMap = Partial<Record<BusinessDocumentKey, File>>;
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

const primaryButton = adminButtonClasses({ size: "md", className: "gap-2 disabled:cursor-not-allowed" });
const secondaryButton = adminButtonClasses({ variant: "outline-accent", size: "md", className: "gap-2 disabled:cursor-not-allowed disabled:hover:bg-transparent" });

export function RegisterFlow({ requestAccount = false }: { requestAccount?: boolean }) {
  const draftKey = requestAccount ? "fides-account-request-draft" : "fides-registration-draft";
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [idFile, setIdFile] = useState<File | null>(null);
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
  const mainRef = useRef<HTMLElement>(null);
  const previousStep = useRef(step);
  const busy = uploading || submitting;
  const payload = { ...values, requestedSlug: requestAccount ? values.requestedSlug : undefined };

  function fileFor(key: DocumentKey) {
    return key === GOVERNMENT_ID_SLOT.key ? idFile : docs[key];
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
    if (step === 1 && !idFile) {
      found = { ...found, idFile: "Upload a government-issued ID (front) to continue." };
    }
    if (step === 3) {
      const missing: Errors = {};
      if (!idFile) {
        setErrors({ idFile: "Upload a government-issued ID (front) to continue." });
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

  function setBusinessDoc(key: BusinessDocumentKey, title: string, file: File): string | null {
    const problem = documentFileProblem(file, title);
    if (problem) return problem;
    releaseObjectUrl(docs[key]);
    setDocs((current) => ({ ...current, [key]: file }));
    setDocErrors((current) => ({ ...current, [key]: undefined }));
    setErrors((current) => ({ ...current, documents: undefined }));
    return null;
  }

  function removeBusinessDoc(key: BusinessDocumentKey) {
    releaseObjectUrl(docs[key]);
    setDocs((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function setIdDocument(file: File): string | null {
    const problem = documentFileProblem(file, GOVERNMENT_ID_SLOT.title);
    if (problem) return problem;
    releaseObjectUrl(idFile);
    setIdFile(file);
    setErrors((current) => ({ ...current, idFile: undefined }));
    return null;
  }

  function removeIdDocument() {
    releaseObjectUrl(idFile);
    setIdFile(null);
  }

  function goTo(next: number) {
    setStep(next);
    setFurthest((current) => Math.max(current, next));
  }

  async function next() {
    if (busy) return;
    if (!validateCurrent()) return;
    if (step === 3 && !await uploadVerificationDocuments()) return;
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function uploadVerificationDocuments() {
    setUploading(true);
    try {
      const results = await Promise.all(ALL_DOCUMENTS.map(async ({ key }) => {
        const file = fileFor(key);
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
            : 2;
      setErrors({ [field]: issue.message });
      setSubmitError(issue.message);
      setStep(target);
      return;
    }

    const missingDocs = ALL_DOCUMENTS.filter((doc) => (doc.key === GOVERNMENT_ID_SLOT.key ? !idFile : !docs[doc.key as BusinessDocumentKey]));
    if (missingDocs.length > 0) {
      const onIdentity = missingDocs.some((doc) => doc.key === GOVERNMENT_ID_SLOT.key);
      const message = `Please upload all required documents before submitting (missing: ${missingDocs.map((doc) => doc.title).join(", ")}).`;
      setSubmitError(message);
      if (onIdentity) {
        setErrors({ idFile: "Upload a government-issued ID (front) to continue." });
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
      if (!upload?.receipt || upload.file !== fileFor(key)) {
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
      if (logo) body.set("logo", logo);
      body.set("uploadedDocuments", JSON.stringify(receipts));
      const response = await fetch("/api/applications", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { error?: string; documentKey?: DocumentKey; referenceCode?: string };
      if (!response.ok) {
        setSubmitError(result.error ?? "We could not submit your application. Please try again.");
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
      <Sidebar current={step} furthest={busy ? -1 : furthest} onJump={(index) => setStep(index)} />
      <MobileProgress current={step} />
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
        <div className={cn("flex w-full flex-1 flex-col", step === 4 ? "max-w-[1100px]" : step === 5 ? "max-w-[820px]" : step === 3 ? "max-w-[900px]" : step === 0 ? "max-w-lg" : "max-w-[680px]")}>
          {step === 0 && (
            <div className="my-auto py-4 sm:py-6">
              {hasDraft ? (
                <button type="button" onClick={restoreDraft} className="mb-4 w-full rounded-lg bg-[#faece3] px-4 py-2.5 text-base font-semibold text-burnt hover:bg-[#f6dfd0]">
                  Restore your saved draft
                </button>
              ) : null}
              <AccountStep values={values} errors={errors} set={set} onNext={next} />
            </div>
          )}
          {step === 1 && (
            <IdentityStep
              values={values}
              errors={errors}
              set={set}
              idFile={idFile}
              onIdFile={setIdDocument}
              onIdRemove={removeIdDocument}
              onPreview={(file) => setPreview({ file, title: GOVERNMENT_ID_SLOT.title })}
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
              idFile={idFile}
              uploading={uploading}
              docs={docs}
              docErrors={docErrors}
              summaryError={errors.documents}
              onFile={setBusinessDoc}
              onRemove={removeBusinessDoc}
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
              idFile={idFile}
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
    </div>
  );
}

type StepProps = {
  values: Values;
  errors: Errors;
  set: <K extends keyof Values>(key: K, value: Values[K]) => void;
};

function Heading({ title, subtitle, center = true }: { title: string; subtitle: string; center?: boolean }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-2", center ? "text-center" : "text-left")}>
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

function AccountStep({ values, errors, set, onNext }: StepProps & { onNext: () => void }) {
  const checks = checkPassword(values.password);
  const rules = [
    { ok: checks.length, text: "More than 6 characters" },
    { ok: checks.mixedCase, text: "Both capital and lowercase letters" },
    { ok: checks.unique, text: "At least one number or special character" },
  ];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <Heading title="Create Your Account" subtitle="Enter your business email and choose a password to get started." />
      <div className="grid gap-6">
        <Field label="Business Email" htmlFor="email" error={errors.email}>
          <TextInput id="email" type="email" invalid={!!errors.email} autoComplete="email" placeholder="maria@bellavita.ph" value={values.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" fieldLabel="password" aria-describedby={errors.password ? "password-error password-requirements" : "password-requirements"} invalid={!!errors.password} autoComplete="new-password" placeholder="Create a password" value={values.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        <ul id="password-requirements" className="-mt-3 flex flex-col gap-1.5 text-sm" aria-label="Password requirements">
          {rules.map((rule) => (
            <li key={rule.text} className={cn("flex items-center gap-2", rule.ok ? "text-success" : "text-subtle")}>
              <span className={cn("flex size-4 items-center justify-center rounded-full", rule.ok ? "bg-success text-white" : "border border-outline/60")}>
                {rule.ok ? <Icon name="check" className="size-2.5" /> : null}
              </span>
              <span className="sr-only">{rule.ok ? "Met: " : "Required: "}</span>
              {rule.text}
            </li>
          ))}
        </ul>
        <Field label="Confirm Password" htmlFor="confirmPassword" error={errors.confirmPassword}>
          <PasswordInput id="confirmPassword" fieldLabel="confirm password" invalid={!!errors.confirmPassword} autoComplete="new-password" placeholder="Re-enter your password" value={values.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
        </Field>
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-3 text-base text-body">
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

      <div className="mt-7 flex flex-col items-center gap-4">
        <button type="submit" className={primaryButton}>
          Create Account <Icon name="arrow-right" className="size-4" />
        </button>
        <p className="text-base text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-burnt hover:underline">
            Log in
          </Link>
        </p>
        <SecureFooter />
      </div>
    </form>
  );
}

function StepActions({
  onBack,
  nextLabel = "Save & Continue",
}: {
  onBack?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
      {onBack ? (
        <button type="button" onClick={onBack} className={secondaryButton}>
          Back
        </button>
      ) : null}
      <button type="submit" className={primaryButton}>
        {nextLabel} <Icon name="arrow-right" className="size-4" />
      </button>
    </div>
  );
}

function IdentityStep({
  values,
  errors,
  set,
  idFile,
  onIdFile,
  onIdRemove,
  onPreview,
  onBack,
  onNext,
}: StepProps & {
  idFile: File | null;
  onIdFile: (file: File) => string | null;
  onIdRemove: () => void;
  onPreview: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  // Owners must be at least 18: the latest selectable date is exactly 18 years ago.
  const now = new Date();
  const latest = toIsoDate(now.getFullYear() - 18, now.getMonth(), now.getDate());
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
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <Field caps label="Owner's Legal Full Name" htmlFor="ownerLegalName" error={errors.ownerLegalName}>
            <TextInput id="ownerLegalName" invalid={!!errors.ownerLegalName} autoComplete="name" placeholder="Maria Santos" value={values.ownerLegalName} onChange={(e) => set("ownerLegalName", e.target.value)} />
          </Field>
          <Field caps label="Date of Birth" htmlFor="dateOfBirth" error={errors.dateOfBirth} hint="You must be at least 18 years old.">
            <DatePicker
              id="dateOfBirth"
              value={values.dateOfBirth}
              onChange={(value) => set("dateOfBirth", value)}
              max={latest}
              invalid={!!errors.dateOfBirth}
              placeholder="Select date of birth"
              describedBy={errors.dateOfBirth ? "dateOfBirth-error" : "dateOfBirth-hint"}
            />
          </Field>
          <Field
            caps
            label="ID Type"
            htmlFor="idType"
            error={errors.idType}
            className="sm:col-span-2"
            hint="Accepted: Passport, Driver's License, National ID, SSS / GSIS ID, or PhilHealth ID"
          >
            <SelectField
              id="idType"
              value={values.idType}
              options={ID_TYPES}
              onChange={(value) => set("idType", value)}
              invalid={!!errors.idType}
              placeholder="Select an ID type"
              className="w-full sm:max-w-[260px]"
              describedBy={errors.idType ? "idType-error" : "idType-hint"}
            />
          </Field>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-body">
              Government-Issued ID (Front)
              <span aria-hidden className="ml-0.5 text-danger">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </p>
            <IdUpload label="Government-issued ID (front)" file={idFile} error={errors.idFile} onFile={onIdFile} onRemove={onIdRemove} onPreview={onPreview} />
          </div>
          <div className="sm:col-span-2">
            <InfoNote icon="shield">
              Your identity documents are encrypted and stored securely. They are used solely to verify your identity and will never be shared with third parties. Verification typically takes 1–2 business days.
            </InfoNote>
          </div>
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
  return (
    <form
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
          <div className="flex size-[100px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-mist text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Business logo preview" className="size-full object-cover" />
            ) : (
              <span className="px-2 text-[11px] text-subtle">No logo selected</span>
            )}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="text-base font-semibold text-ink">Business Logo</p>
            <p className="text-sm text-subtle">Recommended: square JPG or PNG, at least 400×400 px. Max 2 MB.</p>
            <label className="inline-flex h-12 cursor-pointer items-center rounded-md border border-outline/70 px-5 text-base font-semibold text-muted transition-colors hover:border-burnt hover:text-burnt focus-within:ring-2 focus-within:ring-burnt/40">
              {logo ? "Replace Logo" : "Upload Logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  onLogo(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </label>
            {logo ? (
              <button type="button" onClick={() => onLogo(null)} className="text-sm font-semibold text-burnt hover:underline">
                Remove logo
              </button>
            ) : null}
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
          <Field label="Business Type" htmlFor="businessType" error={errors.businessType} className="sm:col-span-4">
            <SelectField
              id="businessType"
              value={values.businessType}
              options={BUSINESS_TYPES.map((type) => ({ value: type, label: type }))}
              onChange={(value) => set("businessType", value)}
              invalid={!!errors.businessType}
              placeholder="Select a business type"
            />
          </Field>
          <Field label="Established Year" htmlFor="establishedYear" error={errors.establishedYear} className="sm:col-span-2">
            <TextInput id="establishedYear" inputMode="numeric" maxLength={4} invalid={!!errors.establishedYear} placeholder="2020" value={values.establishedYear} onChange={(e) => set("establishedYear", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Street Address" htmlFor="streetAddress" error={errors.streetAddress} className="sm:col-span-6">
            <TextInput id="streetAddress" autoComplete="address-line1" invalid={!!errors.streetAddress} placeholder="123 Main Street, Suite 4B" value={values.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} />
          </Field>
          <Field label="City" htmlFor="city" error={errors.city} className="sm:col-span-2">
            <TextInput id="city" autoComplete="address-level2" invalid={!!errors.city} placeholder="Makati City" value={values.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Province / Region" htmlFor="province" error={errors.province} className="sm:col-span-2">
            <TextInput id="province" autoComplete="address-level1" invalid={!!errors.province} placeholder="Metro Manila" value={values.province} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field label="ZIP Code" htmlFor="zipCode" error={errors.zipCode} className="sm:col-span-2">
            <TextInput id="zipCode" autoComplete="postal-code" invalid={!!errors.zipCode} placeholder="1200" value={values.zipCode} onChange={(e) => set("zipCode", e.target.value)} />
          </Field>
        </div>
        <fieldset className="mt-7 border-t border-line pt-5">
          <legend className="float-left mb-2 w-full text-lg font-semibold text-ink">Business contact</legend>
          <div className="clear-both grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" htmlFor="fullName" error={errors.fullName}>
              <TextInput id="fullName" invalid={!!errors.fullName} autoComplete="name" placeholder="Maria Santos" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </Field>
            <Field label="Phone Number" htmlFor="phone" error={errors.phone} hint="Use 09XXXXXXXXX (11 digits) or +63 9XX XXX XXXX.">
              <TextInput
                id="phone"
                type="tel"
                inputMode="tel"
                maxLength={17}
                invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
                autoComplete="tel"
                placeholder="+63 917 000 0000"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value.replace(/[^\d+\s()-]/g, ""))}
              />
            </Field>
          </div>
        </fieldset>
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
  idFile,
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
  idFile: File | null;
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
    const file = key === GOVERNMENT_ID_SLOT.key ? idFile : docs[key];
    if (!file) return [];
    const upload = uploads[key];
    return [{ key, title, upload: upload?.file === file ? upload : undefined }];
  });
  const uploaded = files.filter(({ upload }) => upload?.receipt).length;
  const hasFailures = files.some(({ upload }) => upload?.error);
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
            {uploading ? "Uploading documents…" : hasFailures ? "Retry failed uploads" : "Continue to Subscription Package"}
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
          Continue to Summary <Icon name="arrow-right" className="size-4" />
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
      <span className="min-w-0 flex-1 truncate">{name} — Ready to submit</span>
      <span className="shrink-0 text-subtle">{formatBytes(size)}</span>
    </div>
  );
}

function SummaryStep({
  values,
  errors,
  set,
  idFile,
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
  idFile: File | null;
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
      </SummaryCard>

      <SummaryCard title="Identity Verification" icon="shield" onEdit={() => onEdit(1)}>
        <Row label="Owner Name" value={values.ownerLegalName} />
        <Row label="Date of Birth" value={dob} />
        <Row label="ID Type" value={idLabel} />
        {idFile ? (
          <FileRow name={idFile.name} size={idFile.size} />
        ) : (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-dark">
            Government-issued ID is missing. Go back to upload it before submitting.
          </p>
        )}
      </SummaryCard>

      <SummaryCard title="Business Information" icon="grid" onEdit={() => onEdit(2)}>
        <Row label="Contact name" value={values.fullName} />
        <Row label="Contact phone" value={values.phone} />
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
