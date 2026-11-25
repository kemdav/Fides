"use client";

import * as React from "react";
import { useTenant } from "@/providers/tenant-provider";
import { getInitials } from "@/lib/utils";
import { HEX_COLOR_REGEX } from "@/lib/validations/website-settings";
import { loadSetupDraft, saveSetupDraft } from "./draft-storage";
import { createSetupData, type SetupDraft, type SetupStep } from "./setup-data";

export function useWebsiteDraft(userId: string, entryStep?: SetupStep) {
  const tenant = useTenant();
  const storageKey = `${tenant.id}:${userId}`;
  const initialStep = React.useRef(entryStep);
  const [draft, setDraft] = React.useState<SetupDraft>(() => ({
    step: entryStep ?? 0,
    confirmedSubdomain: "",
    published: null,
    searchReviewed: false,
    data: createSetupData({
      businessName: tenant.businessName,
      logoInitials: getInitials(tenant.businessName).slice(0, 4),
      logoUrl: tenant.logo_url ?? "",
      ...(tenant.brand_color && HEX_COLOR_REGEX.test(tenant.brand_color) ? { mainColor: tenant.brand_color } : {}),
      headline: tenant.headline ?? "",
      supportingMessage: tenant.supporting_message ?? "",
      coverPhotoUrl: tenant.cover_photo_url ?? "",
      about: tenant.about ?? "",
      businessEmail: tenant.email ?? "",
      phoneNumber: tenant.phone ?? "",
      streetAddress: tenant.address ?? "",
      ...(typeof tenant.hours_mon_fri === "string" ? { hoursMonFri: tenant.hours_mon_fri } : {}),
      ...(typeof tenant.hours_sat === "string" ? { hoursSat: tenant.hours_sat } : {}),
      ...(typeof tenant.hours_sun === "string" ? { hoursSun: tenant.hours_sun } : {}),
      showOpeningHours: tenant.show_opening_hours ?? true,
      subdomain: tenant.slug,
    }),
  }));
  const [ready, setReady] = React.useState(false);
  const [savedDraft, setSavedDraft] = React.useState<SetupDraft>();
  const [saveError, setSaveError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    loadSetupDraft(storageKey).then((previous) => {
      if (cancelled || !previous) return;
      const step = initialStep.current ?? previous.step;
      setDraft(step === previous.step ? previous : { ...previous, step });
      setSavedDraft(previous);
    }).catch(() => {
      if (!cancelled) setSaveError("Draft storage is unavailable in this browser.");
    }).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [storageKey]);

  const persist = React.useCallback(async (snapshot: SetupDraft) => {
    try {
      await saveSetupDraft(storageKey, snapshot);
      setSavedDraft(snapshot);
      setSaveError("");
    } catch {
      setSaveError("Could not save your draft in this browser. Keep this page open and try again.");
      throw new Error("Could not save the website draft in this browser.");
    }
  }, [storageKey]);

  return { tenant, draft, setDraft, ready, savedDraft, saveError, persist };
}
