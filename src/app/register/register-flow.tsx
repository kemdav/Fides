"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CheckIcon } from "@/components/ui";
import {
  BUSINESS_TYPES,
  DOCUMENT_SLOTS,
  FILE_LIMITS,
  formatPeso,
  ID_TYPES,
  PLAN_OPTIONS,
  TRIAL_DAYS,
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
import {
  Field,
  FilePicker,
  formatBytes,
  InfoNote,
  MobileProgress,
  PasswordInput,
  SecureFooter,
  Sidebar,
  StepIcon,
  STEPS,
  TextInput,
  useObjectUrl,
  validateFile,
} from "./parts";

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

const DRAFT_KEY = "fides-registration-draft";
const stepSchemas = [accountStepSchema, identityStepSchema, businessStepSchema, null, planStepSchema, null] as const;

const primaryButton =
  "inline-flex h-12 items-center justify-center rounded-lg bg-burnt px-6 text-base font-semibold text-white transition-colors hover:bg-burnt-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "inline-flex h-12 items-center justify-center rounded-lg border-2 border-outline/70 bg-white px-6 text-base font-semibold text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:opacity-60";

export function RegisterFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [idFile, setIdFile] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Partial<Record<DocumentKey, File>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string | null>(null);

  const hasDraft = useSyncExternalStore(
    () => () => {},
    () => window.sessionStorage.getItem(DRAFT_KEY) !== null,
    () => false
  );

  function restoreDraft() {
    try {
      const saved = window.sessionStorage.getItem(DRAFT_KEY);
      if (saved) setValues((current) => ({ ...current, ...(JSON.parse(saved) as Partial<Values>), password: "", confirmPassword: "" }));
    } catch {
      window.sessionStorage.removeItem(DRAFT_KEY);
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function validateCurrent(): boolean {
    const schema = stepSchemas[step];
    if (!schema) return true;
    let found = validateStep(schema, values);
    if (step === 0 && !found.confirmPassword && values.password !== values.confirmPassword) {
      found = { ...found, confirmPassword: "Passwords do not match." };
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function goTo(next: number) {
    setStep(next);
    setFurthest((current) => Math.max(current, next));
  }

  function next() {
    if (!validateCurrent()) return;
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  }

  function saveDraft() {
    const { password: _password, confirmPassword: _confirm, ...safe } = values;
    void _password;
    void _confirm;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
    setDraftNote("Draft saved on this device. Passwords and files are not included.");
  }

  async function submit() {
    setSubmitError(null);
    if (!values.confirmAccuracy) {
      setErrors({ confirmAccuracy: "Please confirm that your information is accurate." });
      return;
    }
    const parsed = registrationSchema.safeParse(values);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue.path[0] ?? "");
      const target = ["fullName", "email", "phone", "password", "confirmPassword", "acceptTerms"].includes(field)
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

    setSubmitting(true);
    try {
      const body = new FormData();
      body.set("payload", JSON.stringify(parsed.data));
      if (logo) body.set("logo", logo);
      const response = await fetch("/api/applications", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setSubmitError(result.error ?? "We could not submit your application. Please try again.");
        setSubmitting(false);
        return;
      }
      window.sessionStorage.removeItem(DRAFT_KEY);
      router.push("/login?registered=1");
    } catch {
      setSubmitError("We could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      <Sidebar current={step} furthest={furthest} onJump={(index) => setStep(index)} />
      <MobileProgress current={step} />
      <main className="flex min-w-0 flex-1 flex-col items-center px-4 py-8 sm:px-8 lg:px-12 lg:py-14">
        <div className={cn("w-full", step === 4 ? "max-w-[1100px]" : step === 5 ? "max-w-[820px]" : "max-w-[680px]")}>
          {step === 0 && (
            <>
              {hasDraft ? (
                <button type="button" onClick={restoreDraft} className="mb-4 w-full rounded-lg bg-[#faece3] px-4 py-2.5 text-sm font-semibold text-burnt hover:bg-[#f6dfd0]">
                  Restore your saved draft
                </button>
              ) : null}
              <AccountStep values={values} errors={errors} set={set} onNext={next} />
            </>
          )}
          {step === 1 && (
            <IdentityStep values={values} errors={errors} set={set} idFile={idFile} setIdFile={setIdFile} onBack={back} onNext={next} />
          )}
          {step === 2 && (
            <BusinessStep
              values={values}
              errors={errors}
              set={set}
              logo={logo}
              logoError={logoError}
              onLogo={(file) => {
                if (!file) {
                  setLogo(null);
                  setLogoError(null);
                  return;
                }
                const problem = validateFile(file, FILE_LIMITS.logoTypes, FILE_LIMITS.logoBytes, "The logo");
                setLogoError(problem);
                if (!problem) setLogo(file);
              }}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 3 && <DocumentsStep docs={docs} setDocs={setDocs} onBack={back} onNext={next} />}
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
              onEdit={goTo}
              onBack={back}
              onSaveDraft={saveDraft}
              onSubmit={submit}
            />
          )}
        </div>
      </main>
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
    <div className={cn("mb-8 flex flex-col gap-2", center ? "text-center" : "text-left")}>
      <h1 className="font-display text-3xl text-ink sm:text-4xl">{title}</h1>
      <p className="text-sm text-muted sm:text-base">{subtitle}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_8px_24px_-12px_rgb(44_58_75/0.18)] sm:p-8">{children}</div>
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
      <Heading title="Create Your Account" subtitle="Start your journey with Fides — it only takes a few minutes." />
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="fullName" error={errors.fullName}>
          <TextInput id="fullName" invalid={!!errors.fullName} autoComplete="name" placeholder="Maria Santos" value={values.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Business Email" htmlFor="email" error={errors.email}>
          <TextInput id="email" type="email" invalid={!!errors.email} autoComplete="email" placeholder="maria@bellavita.ph" value={values.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone Number" htmlFor="phone" error={errors.phone}>
          <TextInput id="phone" type="tel" invalid={!!errors.phone} autoComplete="tel" placeholder="+63 917 000 0000" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" invalid={!!errors.password} autoComplete="new-password" placeholder="Create a password" value={values.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        <Field label="Confirm Password" htmlFor="confirmPassword" error={errors.confirmPassword} className="sm:col-span-2">
          <PasswordInput id="confirmPassword" invalid={!!errors.confirmPassword} autoComplete="new-password" placeholder="Re-enter your password" value={values.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
        </Field>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5 text-xs" aria-label="Password requirements">
        {rules.map((rule) => (
          <li key={rule.text} className={cn("flex items-center gap-2", rule.ok ? "text-success" : "text-subtle")}>
            <span className={cn("flex size-4 items-center justify-center rounded-full", rule.ok ? "bg-success text-white" : "border border-outline/60")}>
              {rule.ok ? <StepIcon name="check" className="size-2.5" /> : null}
            </span>
            {rule.text}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-body">
          <input
            type="checkbox"
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
          <p role="alert" className="text-xs text-danger">
            {errors.acceptTerms}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col items-center gap-5">
        <button type="submit" className={primaryButton}>
          Create Account →
        </button>
        <p className="text-sm text-muted">
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
  onNext,
  nextLabel = "Save & Continue →",
  stacked = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  stacked?: boolean;
}) {
  return (
    <div className={cn("mt-8 flex items-center gap-3 border-t border-line pt-6", stacked ? "flex-col-reverse sm:flex-row sm:justify-end" : "justify-end")}>
      {onBack ? (
        <button type="button" onClick={onBack} className={secondaryButton}>
          Back
        </button>
      ) : null}
      <button type="submit" onClick={onNext} className={primaryButton}>
        {nextLabel}
      </button>
    </div>
  );
}

function IdentityStep({
  values,
  errors,
  set,
  idFile,
  setIdFile,
  onBack,
  onNext,
}: StepProps & { idFile: File | null; setIdFile: (file: File | null) => void; onBack: () => void; onNext: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
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
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Owner's Legal Full Name" htmlFor="ownerLegalName" error={errors.ownerLegalName}>
            <TextInput id="ownerLegalName" invalid={!!errors.ownerLegalName} autoComplete="name" placeholder="Maria Santos" value={values.ownerLegalName} onChange={(e) => set("ownerLegalName", e.target.value)} />
          </Field>
          <Field label="Date of Birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
            <TextInput id="dateOfBirth" type="date" max={today} invalid={!!errors.dateOfBirth} value={values.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
          </Field>
          <Field
            label="ID Type"
            htmlFor="idType"
            error={errors.idType}
            className="sm:col-span-2"
            hint="Accepted: Passport, Driver's License, National ID, SSS / GSIS ID, or PhilHealth ID"
          >
            <select
              id="idType"
              value={values.idType}
              onChange={(e) => set("idType", e.target.value)}
              className="h-12 w-full rounded-lg border border-outline/60 bg-white px-4 text-base text-ink hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/30 sm:max-w-[320px]"
            >
              {ID_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <p className="text-sm font-semibold text-ink">
              Government-Issued ID (Front) <span className="text-xs font-normal text-subtle">· Optional for now</span>
            </p>
            <FilePicker file={idFile} onChange={setIdFile} label="Government-issued ID (front)" />
          </div>
          <div className="sm:col-span-2">
            <InfoNote>
              Selected files are previewed on this device only and are not stored or sent anywhere yet. Verification typically takes 1–2 business days.
            </InfoNote>
          </div>
        </div>
        <StepActions onBack={onBack} />
      </Card>
    </form>
  );
}

function BusinessStep({
  values,
  errors,
  set,
  logo,
  logoError,
  onLogo,
  onBack,
  onNext,
}: StepProps & {
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
            <p className="text-sm font-semibold text-ink">Business Logo</p>
            <p className="text-xs text-subtle">Recommended: square JPG or PNG, at least 400×400 px. Max 2 MB.</p>
            <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border-2 border-outline/70 px-5 text-sm font-semibold text-muted transition-colors hover:border-burnt hover:text-burnt focus-within:ring-2 focus-within:ring-burnt/40">
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
              <button type="button" onClick={() => onLogo(null)} className="text-xs font-semibold text-burnt hover:underline">
                Remove logo
              </button>
            ) : null}
            {logoError ? (
              <p role="alert" className="text-xs text-danger">
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
            <select
              id="businessType"
              value={values.businessType}
              onChange={(e) => set("businessType", e.target.value)}
              className="h-12 w-full rounded-lg border border-outline/60 bg-white px-4 text-base text-ink hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/30"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
        <StepActions onBack={onBack} />
      </Card>
      <div className="mt-6">
        <SecureFooter />
      </div>
    </form>
  );
}

function DocumentsStep({
  docs,
  setDocs,
  onBack,
  onNext,
}: {
  docs: Partial<Record<DocumentKey, File>>;
  setDocs: React.Dispatch<React.SetStateAction<Partial<Record<DocumentKey, File>>>>;
  onBack: () => void;
  onNext: () => void;
}) {
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
        subtitle="These documents help us verify your business before your application is reviewed. Uploading is optional for now."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {DOCUMENT_SLOTS.map((slot) => (
          <div key={slot.key} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-[0_8px_24px_-12px_rgb(44_58_75/0.15)]">
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-mist text-glyph">
                <StepIcon name="document" />
              </span>
              <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted">OPTIONAL</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{slot.title}</p>
              <p className="text-xs text-subtle">{slot.hint}</p>
            </div>
            <FilePicker
              compact
              label={slot.title}
              file={docs[slot.key] ?? null}
              onChange={(file) =>
                setDocs((current) => {
                  const nextDocs = { ...current };
                  if (file) nextDocs[slot.key] = file;
                  else delete nextDocs[slot.key];
                  return nextDocs;
                })
              }
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <InfoNote>
          Files you select are previewed on this device only. They are not stored or sent anywhere in this version, and your application can be submitted without them.
        </InfoNote>
        <p className="text-xs text-subtle">Accepted formats: PDF, JPG, PNG — max 5 MB per file.</p>
        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onBack} className={secondaryButton}>
            Back
          </button>
          <button type="submit" className={primaryButton}>
            Continue to Subscription Package
          </button>
        </div>
      </div>
    </form>
  );
}

const planBackgrounds: Record<string, string> = {
  starter: "/images/landing/plan-starter-bg.svg",
  professional: "/images/landing/plan-pro-bg.svg",
  business: "/images/landing/plan-business-bg.svg",
};

const checkTones = { starter: "success", professional: "powder", business: "deep" } as const;

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
      <div role="radiogroup" aria-label="Subscription package" className="mx-auto flex max-w-[420px] flex-col items-stretch gap-6 lg:max-w-none lg:flex-row lg:items-stretch lg:gap-5">
        {PLAN_OPTIONS.map((plan) => {
          const selected = values.planCode === plan.code;
          const featured = plan.code === "professional";
          return (
            <button
              key={plan.code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set("planCode", plan.code)}
              className={cn(
                "relative flex flex-1 flex-col rounded-[30px] p-[14px] text-left transition-[transform,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burnt/40",
                featured ? "bg-sky" : "bg-transparent",
                selected ? "-translate-y-1 shadow-[0_14px_30px_-12px_rgb(9_16_29/0.45)] ring-4 ring-burnt" : "hover:-translate-y-1"
              )}
            >
              <span className={cn("relative flex h-full flex-col px-7 pb-8 pt-8", featured ? "text-white" : "text-ink")}>
                <Image src={planBackgrounds[plan.code]} alt="" fill aria-hidden className="rounded-[24px]" />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="text-2xl font-semibold">{plan.name}</span>
                  {featured ? <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-info">Most Popular</span> : null}
                </span>
                <span className="relative mt-5 flex items-end gap-3 font-semibold">
                  <span className="text-[32px] leading-10 xl:text-4xl">{formatPeso(plan.price)}</span>
                  <span className="whitespace-nowrap pb-1 text-xs leading-5 xl:text-sm">
                    /month (Php)
                    <br />
                    Billed monthly
                  </span>
                </span>
                <span className="relative mt-3 min-h-[84px] text-sm">{plan.description}</span>
                <span aria-hidden className={cn("relative mt-5 block border-t border-dashed", featured ? "border-white/60" : "border-ink/30")} />
                {plan.includes ? <span className="relative mt-4 text-xs font-semibold italic">{plan.includes}</span> : null}
                <span className="relative mt-4 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <span key={feature} className="flex items-center gap-3 text-sm">
                      <CheckIcon tone={checkTones[plan.code]} className="size-5" />
                      {feature}
                    </span>
                  ))}
                </span>
                <span
                  className={cn(
                    "relative mt-auto inline-flex items-center justify-center self-stretch rounded-[32px] px-4 py-3 text-sm font-semibold",
                    selected ? "bg-ink text-white" : "bg-sky text-ink",
                    "mt-8"
                  )}
                >
                  {selected ? "Selected" : "Choose plan"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {errors.planCode ? (
        <p role="alert" className="mt-3 text-center text-xs text-danger">
          {errors.planCode}
        </p>
      ) : null}
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <CheckIcon tone="success" className="size-4" />
        {TRIAL_DAYS}-day free trial on all plans · No credit card required · Cancel anytime
      </p>
      <div className="mt-8 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={cn(secondaryButton, "border-burnt text-burnt")}>
          ← Back
        </button>
        <button type="submit" className={primaryButton}>
          Continue to Summary →
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
  icon: "user" | "shield" | "building" | "document" | "card";
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_3px_14px_rgb(44_58_75/0.05)]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-3 text-sm font-semibold text-ink">
          <StepIcon name={icon} className="size-5 text-glyph" />
          {title}
        </h2>
        <button type="button" onClick={onEdit} className="rounded-md border border-burnt px-3 py-1 text-xs font-semibold text-burnt transition-colors hover:bg-burnt/10">
          Edit
        </button>
      </header>
      <div className="flex flex-col gap-2 px-5 py-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 text-sm">
      <span className="text-subtle">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function FileRow({ name, size }: { name: string; size: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#eceff6] px-3 py-2.5 text-xs text-body">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-burnt text-white">
        <StepIcon name="check" className="size-3" />
      </span>
      <span className="min-w-0 flex-1 truncate">{name} — Selected</span>
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
  docs: Partial<Record<DocumentKey, File>>;
  submitting: boolean;
  submitError: string | null;
  draftNote: string | null;
  onEdit: (step: number) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const plan = PLAN_OPTIONS.find((item) => item.code === values.planCode) ?? PLAN_OPTIONS[1];
  const idLabel = ID_TYPES.find((item) => item.value === values.idType)?.label ?? values.idType;
  const docEntries = useMemo(() => DOCUMENT_SLOTS.filter((slot) => docs[slot.key]), [docs]);
  const dob = values.dateOfBirth
    ? new Date(`${values.dateOfBirth}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-3 font-display text-3xl text-ink sm:text-4xl">
          <span className="flex size-9 items-center justify-center rounded-full bg-burnt font-sans text-lg font-semibold text-white">6</span>
          Application Summary
        </h1>
        <p className="text-sm text-muted">
          Review all details carefully before submitting. Once confirmed, your application will be sent for review (1–2 business days).
        </p>
      </div>

      <SummaryCard title="Account Details" icon="user" onEdit={() => onEdit(0)}>
        <Row label="Full Name" value={values.fullName} />
        <Row label="Email Address" value={values.email} />
        <Row label="Phone Number" value={values.phone} />
        <Row label="Password" value="Set securely" />
      </SummaryCard>

      <SummaryCard title="Identity Verification" icon="shield" onEdit={() => onEdit(1)}>
        <Row label="Owner Name" value={values.ownerLegalName} />
        <Row label="Date of Birth" value={dob} />
        <Row label="ID Type" value={idLabel} />
        {idFile ? <FileRow name={idFile.name} size={idFile.size} /> : <p className="text-xs text-subtle">No ID file selected.</p>}
      </SummaryCard>

      <SummaryCard title="Business Information" icon="building" onEdit={() => onEdit(2)}>
        <Row label="Business Name" value={values.businessName} />
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
        {logo ? <FileRow name={logo.name} size={logo.size} /> : <p className="text-xs text-subtle">No business logo selected.</p>}
      </SummaryCard>

      <SummaryCard title="Document Requirements" icon="document" onEdit={() => onEdit(3)}>
        {docEntries.length === 0 ? (
          <p className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg">No documents selected. You can still submit your application.</p>
        ) : (
          docEntries.map((slot) => <FileRow key={slot.key} name={docs[slot.key]!.name} size={docs[slot.key]!.size} />)
        )}
        <p className="text-xs text-subtle">Documents are not stored in this version.</p>
      </SummaryCard>

      <SummaryCard title="Subscription Package" icon="card" onEdit={() => onEdit(4)}>
        <Row label="Plan" value={<span className="font-semibold text-burnt">{plan.name}</span>} />
        <Row label="Price" value={`${formatPeso(plan.price)} / month`} />
        <Row label="Billing Cycle" value="Monthly" />
        <p className="flex items-center gap-2 rounded-lg bg-[#faece3] px-3 py-2.5 text-xs text-burnt">
          <StepIcon name="check" className="size-4 rounded-full bg-burnt p-0.5 text-white" />
          {TRIAL_DAYS}-day free trial included — no charge until trial ends
        </p>
      </SummaryCard>

      <section className="rounded-xl border border-line bg-white p-5 shadow-[0_3px_14px_rgb(44_58_75/0.05)]">
        <p className="text-[11px] font-semibold tracking-wider text-muted">ACCURACY &amp; CONSENT</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-body">
          <input
            type="checkbox"
            checked={values.confirmAccuracy}
            onChange={(event) => set("confirmAccuracy", event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-burnt"
          />
          I confirm that all information and documents provided are accurate and complete. I understand that submitting false information may result in rejection of my application.
        </label>
        {errors.confirmAccuracy ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {errors.confirmAccuracy}
          </p>
        ) : null}
        <p className="mt-4 border-t border-line pt-4 text-xs text-subtle">
          After confirming, your application will be reviewed within 1–2 business days. You will be notified by email at {values.email}.
        </p>

        {submitError ? (
          <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-dark">
            {submitError}
          </p>
        ) : null}

        <button type="button" onClick={onSubmit} disabled={submitting} className={cn(primaryButton, "mt-5 w-full")}>
          {submitting ? "Submitting…" : "Confirm Application"}
        </button>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onBack} disabled={submitting} className={cn(secondaryButton, "w-full")}>
            ← Back
          </button>
          <button type="button" onClick={onSaveDraft} disabled={submitting} className={cn(secondaryButton, "w-full")}>
            Save Draft
          </button>
        </div>
        {draftNote ? (
          <p role="status" className="mt-3 text-center text-xs text-success">
            {draftNote}
          </p>
        ) : null}
      </section>
    </div>
  );
}
