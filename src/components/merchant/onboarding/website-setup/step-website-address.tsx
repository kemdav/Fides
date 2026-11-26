"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { customDomainSchema, subdomainSchema } from "@/lib/validations/website-settings";
import { FIELD_CLASS, websiteAddress, type StepFields } from "./setup-data";
import { SetupDialog } from "./setup-dialog";

export function StepWebsiteAddress({ data, onChange, confirmedSubdomain, onConfirm, checkAddress }: StepFields & {
  confirmedSubdomain: string;
  onConfirm: (subdomain: string) => void;
  checkAddress: (subdomain: string) => Promise<boolean>;
}) {
  const [checked, setChecked] = React.useState<{ subdomain: string; available: boolean; failed?: boolean }>();
  const [domainOpen, setDomainOpen] = React.useState(false);
  const [domainError, setDomainError] = React.useState("");
  const [domainChecked, setDomainChecked] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState("");
  const subdomain = data.subdomain.trim().toLowerCase();
  const validation = subdomainSchema.safeParse(subdomain);
  const valid = validation.success;
  const confirmed = valid && confirmedSubdomain === subdomain;
  const currentCheck = checked?.subdomain === subdomain ? checked : undefined;
  const available = confirmed || currentCheck?.available;
  const link = `https://${websiteAddress(subdomain)}`;

  React.useEffect(() => {
    if (!valid || confirmed) return;
    let cancelled = false;
    async function checkAvailability() {
      try {
        const available = await checkAddress(subdomain);
        if (!cancelled) setChecked({ subdomain, available });
      } catch {
        if (!cancelled) setChecked({ subdomain, available: false, failed: true });
      }
    }
    const timer = window.setTimeout(() => { void checkAvailability(); }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [checkAddress, confirmed, subdomain, valid]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Could not copy automatically. You can select and copy the link above.");
    }
  }

  function openDomain() {
    const result = customDomainSchema.safeParse(data.customDomain.trim());
    if (!result.success) {
      setDomainError(result.error.issues[0]?.message || "Enter a valid custom domain.");
      return;
    }
    onChange({ customDomain: result.data.toLowerCase() });
    setDomainChecked(false);
    setDomainOpen(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="website-setup-address" className="block text-sm font-semibold">Fides subdomain</label>
        <div className="mt-1.5 flex items-center rounded-lg border border-outline bg-mist focus-within:border-burnt focus-within:ring-2 focus-within:ring-burnt/25">
          <input id="website-setup-address" aria-describedby="website-setup-availability" className="h-11 w-full min-w-0 rounded-l-lg bg-white px-3 text-sm outline-none" value={data.subdomain} maxLength={40} placeholder="your-business" onChange={(event) => {
            setChecked(undefined);
            setCopyStatus("");
            onChange({ subdomain: event.target.value.toLowerCase() });
          }} />
          <span className="shrink-0 px-3 text-sm text-muted">.fides.app</span>
        </div>
        <p id="website-setup-availability" role="status" className={`mt-2 text-sm ${confirmed || available ? "text-success" : !valid || currentCheck ? "text-danger" : "text-muted"}`}>
          {confirmed ? "Address confirmed"
            : !valid ? subdomain ? validation.error.issues[0]?.message : "Enter a website address."
            : !currentCheck ? "Checking availability…"
            : available ? "Available in this preview"
            : currentCheck.failed ? "Availability could not be checked. Edit the address to try again."
            : "This address is taken in the preview. Try another."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="xs" variant="secondary" disabled={!available || confirmed} onClick={() => onConfirm(subdomain)}>Confirm address</Button>
        <Button size="xs" variant="secondary" disabled={!valid} onClick={copyLink}>Copy link</Button>
      </div>
      {valid && <p className="break-all font-mono text-xs text-body">{link}</p>}
      {copyStatus && <p role="status" className="text-sm text-muted">{copyStatus}</p>}

      <details className="rounded-lg border border-hairline bg-mist/50 px-3.5 py-3">
        <summary className="cursor-pointer text-sm font-semibold">Advanced · Custom domain</summary>
        <div className="mt-3 space-y-3">
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>Custom domain</span>
            <input className={FIELD_CLASS} value={data.customDomain} maxLength={100} placeholder="www.yourbusiness.com" onChange={(event) => { setDomainError(""); onChange({ customDomain: event.target.value, isDomainVerified: false }); }} />
          </label>
          {domainError && <p role="alert" className="text-sm text-danger">{domainError}</p>}
          <Button size="xs" variant="secondary" onClick={openDomain}>View DNS setup</Button>
        </div>
      </details>
      {domainOpen && (
        <SetupDialog title="Custom domain setup" onClose={() => setDomainOpen(false)} actions={
          <Button variant="brand" size="xs" onClick={() => setDomainOpen(false)}>Done</Button>
        }>
          <p className="break-all font-semibold">{data.customDomain}</p>
          <p>Save this domain in your setup draft. Connecting it will require adding DNS records with your domain provider.</p>
          <Button size="xs" variant="secondary" onClick={() => setDomainChecked(true)}>Check DNS status</Button>
          {domainChecked && <p role="status">DNS verification is pending in this preview.</p>}
        </SetupDialog>
      )}
    </div>
  );
}
