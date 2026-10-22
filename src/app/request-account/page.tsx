"use client";

import * as React from "react";
import Link from "next/link";
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
  type BusinessCategory,
  STAFF_SIZE_TIERS,
  type StaffSizeTier,
  normalizeSlugInput,
  type AccountRequestRecord,
  type DispatchedEmailRecord,
  type SlugValidationResult,
} from "@/lib/account-request/schema";

const QUICK_PRESETS = [
  {
    label: "Fill Sample Dental Clinic",
    businessName: "Solstice Dental & Implant Studio",
    category: "dental" as BusinessCategory,
    slug: "solsticedental",
    ownerName: "Dr. Patricia Villanueva",
    ownerEmail: "patricia@solsticedental.ph",
    phone: "+63 917 624 8810",
    address: "Level 3, Ayala Triangle Gardens, Makati City",
    estimatedStaff: "6-15" as StaffSizeTier,
    licenseOrTaxId: "DOH-2026-DNT-9284",
    notes: "General dentistry, Invisalign consultations, and panoramic X-ray scheduling.",
  },
  {
    label: "Fill Sample Pediatric Clinic",
    businessName: "Harborview Kids Dental Care",
    category: "dental" as BusinessCategory,
    slug: "harborviewdental",
    ownerName: "Dr. Nathaniel Tan",
    ownerEmail: "nathaniel@harborviewdental.ph",
    phone: "+63 918 310 5592",
    address: "Bonifacio High Street Central, Taguig City",
    estimatedStaff: "1-5" as StaffSizeTier,
    licenseOrTaxId: "DOH-2026-PED-6102",
    notes: "Pediatric preventive dentistry and fluoride treatment appointments.",
  },
];

export default function RequestAccountPage() {
  const [businessName, setBusinessName] = React.useState("");
  const [category, setCategory] = React.useState<BusinessCategory>("dental");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [ownerName, setOwnerName] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [estimatedStaff, setEstimatedStaff] =
    React.useState<StaffSizeTier>("6-15");
  const [licenseOrTaxId, setLicenseOrTaxId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [slugCheck, setSlugCheck] = React.useState<SlugValidationResult | null>(
    null
  );
  const [checkingSlug, setCheckingSlug] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] =
    React.useState<AccountRequestRecord | null>(null);
  const [dispatchedEmail, setDispatchedEmail] =
    React.useState<DispatchedEmailRecord | null>(null);

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    if (!slugTouched) {
      const autoSlug = normalizeSlugInput(value).slice(0, 32);
      setSlug(autoSlug);
    }
  };

  React.useEffect(() => {
    const trimmed = slug.trim();
    if (!trimmed) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      if (active) {
        setCheckingSlug(true);
      }
      try {
        const res = await fetch(
          `/api/account-requests/validate-slug?slug=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) return;
        const data: SlugValidationResult = await res.json();
        if (active) {
          setSlugCheck(data);
        }
      } catch {
        // ignore network error while typing
      } finally {
        if (active) {
          setCheckingSlug(false);
        }
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [slug]);

  const activeSlugCheck = slug.trim() ? slugCheck : null;

  const applyPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setBusinessName(preset.businessName);
    setCategory(preset.category);
    setSlug(preset.slug);
    setSlugTouched(true);
    setOwnerName(preset.ownerName);
    setOwnerEmail(preset.ownerEmail);
    setPhone(preset.phone);
    setAddress(preset.address);
    setEstimatedStaff(preset.estimatedStaff);
    setLicenseOrTaxId(preset.licenseOrTaxId);
    setNotes(preset.notes);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          category,
          slug: normalizeSlugInput(slug),
          ownerName,
          ownerEmail,
          phone,
          address,
          estimatedStaff,
          licenseOrTaxId,
          notes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? "Failed to submit account request.");
        return;
      }

      setSubmittedRecord(data.record);
      setDispatchedEmail(data.emailDispatched);
    } catch {
      setErrorMessage("Network error while submitting account request.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormForAnother = () => {
    setSubmittedRecord(null);
    setDispatchedEmail(null);
    setBusinessName("");
    setSlug("");
    setSlugTouched(false);
    setOwnerName("");
    setOwnerEmail("");
    setPhone("");
    setAddress("");
    setLicenseOrTaxId("");
    setNotes("");
    setErrorMessage(null);
  };

  return (
    <main className="min-h-dvh py-16">
      <Container className="flex flex-col gap-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-900 underline underline-offset-4">
            Fides Home
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Request Account (CPG-61)</span>
          <span>·</span>
          <Link href="/reset-request" className="hover:text-neutral-900 underline underline-offset-4">
            Reset Account Request (CPG-62)
          </Link>
        </nav>

        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            CPG-61 · Temporary Onboarding Surface
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            Request Account
          </h1>
          <p className="max-w-2xl text-base text-neutral-600">
            Submit a prospective service business or clinic onboarding request
            (e.g., Dental Clinic) and reserve a wildcard tenant subdomain.
          </p>
        </header>

        {submittedRecord ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Account Request Submitted — {submittedRecord.businessName}
              </CardTitle>
              <CardDescription>
                Reference: {submittedRecord.referenceCode} · Status:{" "}
                {submittedRecord.status} · Subdomain: {submittedRecord.slug}
                .fides.app
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm text-neutral-600">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <strong className="text-neutral-900">Primary Owner:</strong>{" "}
                  {submittedRecord.ownerName} ({submittedRecord.ownerEmail})
                </div>
                <div>
                  <strong className="text-neutral-900">Phone:</strong>{" "}
                  {submittedRecord.phone}
                </div>
                <div>
                  <strong className="text-neutral-900">Address:</strong>{" "}
                  {submittedRecord.address}
                </div>
                <div>
                  <strong className="text-neutral-900">Tracking Token:</strong>{" "}
                  <code>{submittedRecord.resetToken}</code>
                </div>
              </div>

              {dispatchedEmail && (
                <div className="rounded-md border border-neutral-200 p-4 text-xs text-neutral-600">
                  <p className="font-medium text-neutral-900">
                    Transactional Mailer Notification: {dispatchedEmail.subject}
                  </p>
                  <p className="mt-1">{dispatchedEmail.summary}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Link
                href={`/reset-request?mode=application&ref=${encodeURIComponent(submittedRecord.referenceCode)}`}
                className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Track or Reset Request (CPG-62)
              </Link>
              <Button variant="ghost" onClick={resetFormForAnother}>
                Submit Another Request
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3 items-start">
            <Card className="lg:col-span-2">
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle>Service Business &amp; Clinic Details</CardTitle>
                      <CardDescription>
                        New tenant requests are staged with status{" "}
                        <code>pending</code> until approved by Fides Admin.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => applyPreset(preset)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {errorMessage && (
                    <div
                      role="alert"
                      className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900"
                    >
                      <strong>Error:</strong> {errorMessage}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label
                        htmlFor="businessName"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Business or Clinic Name *
                      </label>
                      <Input
                        id="businessName"
                        required
                        placeholder="e.g., Apex Dental Clinic"
                        value={businessName}
                        onChange={(e) => handleBusinessNameChange(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="category"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Service Category *
                      </label>
                      <select
                        id="category"
                        value={category}
                        onChange={(e) =>
                          setCategory(e.target.value as BusinessCategory)
                        }
                        className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        {BUSINESS_CATEGORIES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="estimatedStaff"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Estimated Staff Size *
                      </label>
                      <select
                        id="estimatedStaff"
                        value={estimatedStaff}
                        onChange={(e) =>
                          setEstimatedStaff(e.target.value as StaffSizeTier)
                        }
                        className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        {STAFF_SIZE_TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier} members
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label
                        htmlFor="slug"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Desired Subdomain Slug (<code>&lt;slug&gt;.fides.app</code>) *
                      </label>
                      <Input
                        id="slug"
                        required
                        placeholder="apexdental"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value.toLowerCase());
                        }}
                      />
                      <div className="text-xs text-neutral-500">
                        {checkingSlug ? (
                          <span>Checking availability...</span>
                        ) : activeSlugCheck ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-neutral-900">
                              {activeSlugCheck.reason}
                            </span>
                            {!activeSlugCheck.available &&
                              activeSlugCheck.suggestions.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>Suggestions:</span>
                                  {activeSlugCheck.suggestions.map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => {
                                        setSlugTouched(true);
                                        setSlug(s);
                                      }}
                                      className="underline underline-offset-2 text-neutral-900"
                                    >
                                      {s}.fides.app
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        ) : (
                          <span>
                            Lowercase letters, numbers, and interior hyphens (3–63
                            chars).
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="ownerName"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Owner / Primary Contact Name *
                      </label>
                      <Input
                        id="ownerName"
                        required
                        placeholder="Dr. Elena Rostova"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="ownerEmail"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Work Email Address *
                      </label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        required
                        placeholder="elena@apexdental.ph"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="phone"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Contact Phone *
                      </label>
                      <Input
                        id="phone"
                        required
                        placeholder="+63 2 8812 4400"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="licenseOrTaxId"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Permit / Registration ID
                      </label>
                      <Input
                        id="licenseOrTaxId"
                        placeholder="DOH-2026-DNT-4410"
                        value={licenseOrTaxId}
                        onChange={(e) => setLicenseOrTaxId(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label
                        htmlFor="address"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Clinic Physical Address *
                      </label>
                      <Input
                        id="address"
                        required
                        placeholder="Unit, Building, Street, City"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label
                        htmlFor="notes"
                        className="text-sm font-medium text-neutral-900"
                      >
                        Operational Notes
                      </label>
                      <Input
                        id="notes"
                        placeholder="Services, dental chairs, or scheduling notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap justify-between gap-2">
                  <Link
                    href="/reset-request"
                    className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900"
                  >
                    Already requested? Reset or check status (CPG-62)
                  </Link>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      (activeSlugCheck !== null && !activeSlugCheck.available)
                    }
                  >
                    {submitting ? "Submitting..." : "Submit Account Request"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Onboarding Rules</CardTitle>
                <CardDescription>
                  Multi-tenant validation &amp; verification lifecycle.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-neutral-600">
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    Subdomains are validated against{" "}
                    <code>RESERVED_SUBDOMAINS</code> and existing active/pending
                    tenants.
                  </li>
                  <li>
                    Try entering <code>apexdental</code> (active),{" "}
                    <code>brightsmiles</code> (pending), or <code>admin</code>{" "}
                    (reserved) to test collision checks.
                  </li>
                  <li>
                    Once approved in the Fides Admin portal, the owner can
                    activate credentials and invite staff/users under the clinic.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </Container>
    </main>
  );
}
