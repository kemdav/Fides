"use client";

import * as React from "react";
import { AdminLinkButton } from "@/components/admin/admin-button";
import { Icon } from "@/components/admin/icon";
import { loadSetupDraft } from "./draft-storage";
import type { SetupDraft } from "./setup-data";

export function WebsiteSetupPrompt({ tenantId, userId, basePath }: { tenantId: string; userId: string; basePath: string }) {
  const [draft, setDraft] = React.useState<SetupDraft | null>();

  React.useEffect(() => {
    let cancelled = false;
    loadSetupDraft(`${tenantId}:${userId}`)
      .then((result) => { if (!cancelled) setDraft(result ?? null); })
      .catch(() => { if (!cancelled) setDraft(null); });
    return () => { cancelled = true; };
  }, [tenantId, userId]);

  if (draft === undefined || draft?.published) return null;
  const started = Boolean(draft?.step);

  return (
    <section aria-labelledby="first-website-prompt" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-burnt/20 bg-white px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-powder text-burnt"><Icon name="document" className="size-5" /></span>
        <div>
          <h2 id="first-website-prompt" className="font-semibold text-ink">{started ? "Continue setting up your website" : "Create your first booking website"}</h2>
          <p className="mt-0.5 text-sm text-muted">{started ? `Pick up where you left off at step ${draft?.step} of 6.` : "Choose your branding, add your business details, and preview your site before publishing."}</p>
        </div>
      </div>
      <AdminLinkButton href={`${basePath}/dashboard/onboarding`} size="xs">{started ? "Continue website setup" : "Set up your website"}</AdminLinkButton>
    </section>
  );
}
