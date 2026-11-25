import type { WebsiteSettingsData } from "@/components/merchant/website-settings/types";
import { ALLOWED_COVER_MIME_TYPES, ALLOWED_LOGO_MIME_TYPES, MAX_FILE_SIZES, subdomainSchema, websiteSettingsSchema } from "@/lib/validations/website-settings";

export type SetupStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type VerificationState = "ready" | "pending" | "suspended";

export function readVerificationState(value?: string): VerificationState {
  return value === "pending" || value === "suspended" ? value : "ready";
}
export type SettingsPatch = (patch: Partial<WebsiteSettingsData>) => void;
export type StepFields = { data: WebsiteSettingsData; onChange: SettingsPatch };
export type PreviewService = { id: string; name: string; durationMinutes: number; priceCents: number };
export type SetupDraft = {
  data: WebsiteSettingsData;
  step: SetupStep;
  confirmedSubdomain: string;
  published: WebsiteSettingsData | null;
  searchReviewed: boolean;
};

export const STEP_LABELS = ["Welcome", "Brand identity", "Homepage", "Business details", "Website address", "Search & sharing", "Preview & publish"] as const;
export const FIELD_CLASS = "h-11 w-full min-w-0 rounded-lg border border-outline bg-white px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-burnt focus:ring-2 focus:ring-burnt/25";
export const TEXTAREA_CLASS = "w-full rounded-lg border border-outline bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-burnt focus:ring-2 focus:ring-burnt/25";

export function createSetupData(initial: Partial<WebsiteSettingsData>): WebsiteSettingsData {
  return {
    businessName: "", logoInitials: "", typography: "Ovo + Mulish",
    mainColor: "#FFFFEB", secondaryColor: "#ADD8E6", accentColor: "#C35000",
    headline: "", supportingMessage: "", coverPhotoName: "",
    showFeaturedServices: true, showContactDetails: true,
    businessCategory: "Beauty & wellness", about: "", businessEmail: "", phoneNumber: "", instagram: "",
    streetAddress: "", cityProvince: "", postalCode: "",
    hoursMonFri: "9:00 AM – 6:00 PM", hoursSat: "10:00 AM – 5:00 PM", hoursSun: "Closed",
    timeZone: "Asia/Manila (UTC+08:00)", showOpeningHours: true,
    subdomain: "", customDomain: "", isDomainVerified: false,
    pageTitle: "", metaDescription: "", allowIndexing: true, socialTitle: "", socialDescription: "",
    ...initial,
  };
}

export function settingsForPublish(data: WebsiteSettingsData) {
  // The shared schema expects initials even when the merchant uses a logo.
  const initials = data.logoInitials.trim() || (data.logoUrl
    ? data.businessName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
    : "");
  return {
    ...data,
    businessName: data.businessName.trim(),
    logoInitials: initials,
    headline: data.headline.trim(),
    businessEmail: data.businessEmail.trim(),
    phoneNumber: data.phoneNumber.trim(),
    businessCategory: data.businessCategory.trim(),
    subdomain: data.subdomain.trim().toLowerCase(),
  };
}

const fieldsByStep: Partial<Record<SetupStep, (keyof WebsiteSettingsData)[]>> = {
  1: ["businessName", "logoInitials", "logoUrl", "typography", "mainColor", "secondaryColor", "accentColor"],
  2: ["headline", "supportingMessage", "coverPhotoName", "coverPhotoUrl"],
  3: ["businessCategory", "about", "businessEmail", "phoneNumber", "instagram", "streetAddress", "cityProvince", "postalCode", "hoursMonFri", "hoursSat", "hoursSun", "timeZone"],
  4: ["subdomain", "customDomain"],
  5: ["pageTitle", "metaDescription", "socialTitle", "socialDescription"],
};

export function stepIssue(step: SetupStep, data: WebsiteSettingsData, confirmedSubdomain: string) {
  const form = settingsForPublish(data);
  if (step === 1 && !form.logoInitials && !form.logoUrl) return "Add a logo or enter your initials.";
  if (step === 1 && !form.typography.trim()) return "Choose a typography pairing.";
  if (step === 3 && !form.phoneNumber) return "Enter a business phone number.";
  const result = websiteSettingsSchema.safeParse(form);
  if (!result.success) {
    const issue = result.error.issues.find(({ path }) => fieldsByStep[step]?.some((field) => field === path[0]));
    if (issue) return issue.message;
  }
  if (step === 4 && form.subdomain !== confirmedSubdomain) return "Check and confirm your website address.";
  return undefined;
}

export async function readSetupMedia(file: File, asset: "logo" | "cover") {
  const allowed = asset === "logo" ? ALLOWED_LOGO_MIME_TYPES : ALLOWED_COVER_MIME_TYPES;
  if (!allowed.has(file.type)) throw new Error(asset === "logo" ? "Choose a PNG, JPEG, WebP, or SVG logo." : "Choose a PNG, JPEG, or WebP photo.");
  if (file.size > MAX_FILE_SIZES[asset]) throw new Error(`Choose a file up to ${MAX_FILE_SIZES[asset] / 1024 ** 2} MB.`);
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("This file could not be opened."));
    reader.readAsDataURL(file);
  });
  return { url, filename: file.name.slice(0, 100) };
}

export async function mockCheckAddress(subdomain: string) {
  return subdomainSchema.safeParse(subdomain).success && !["bella-vita", "bellavita", "fides", "demo-studio"].includes(subdomain);
}

export function websiteAddress(subdomain: string) {
  return `${subdomain || "your-business"}.fides.app`;
}
