"use client";

import * as React from "react";
import Image from "next/image";
import { WebsiteSettingsData, ActiveTab, ColorType } from "./types";
import {
  CheckIcon,
  CopyIcon,
  ChevronDownIcon,
  AlertCircleIcon,
  EyeIcon,
} from "./icons";
import { MerchantSidebar } from "../merchant-sidebar";
import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
import { PageContent, PageHeading, Surface } from "@/components/admin/primitives";
import { ColorPickerModal } from "./color-picker-modal";
import { ConnectDomainModal, WaitingDnsModal } from "./dns-modals";
import { ChangeAddressModal, AddressUpdatedModal } from "./address-modals";
import {
  ShareWebsiteModal,
  PublishReviewModal,
  PublishedModal,
  DraftSavedModal,
  DiscardModal,
} from "./status-modals";
import { LivePreviewModal } from "./live-preview-modal";
import {
  saveWebsiteDraftAction,
  publishWebsiteSettingsAction,
  discardWebsiteDraftAction,
  uploadTenantMediaAction,
} from "@/app/actions/website-settings";
import {
  ALLOWED_LOGO_MIME_TYPES,
  ALLOWED_COVER_MIME_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/validations/website-settings";

const INITIAL_SETTINGS: WebsiteSettingsData = {
  businessName: "Bella Vita Salon & Spa",
  logoInitials: "BV",
  typography: "Ovo + Mulish",
  mainColor: "#FFFFEB",
  secondaryColor: "#ADD8E6",
  accentColor: "#CC5000",

  headline: "A little time for yourself.",
  supportingMessage:
    "Thoughtful care, experienced specialists, and effortless booking.",
  coverPhotoName: "bella-vita-studio.jpg",
  showFeaturedServices: true,
  showContactDetails: true,

  businessCategory: "Beauty & wellness",
  about:
    "Thoughtful hair, skin, and wellness care in a calm, welcoming space.",
  businessEmail: "hello@bellavita.example",
  phoneNumber: "+63 917 555 0148",
  instagram: "instagram.com/bellavita.example",

  streetAddress: "24 Acacia Street, Lahug",
  cityProvince: "Cebu City, Cebu",
  postalCode: "6000",
  hoursMonFri: "9:00 AM – 6:00 PM",
  hoursSat: "10:00 AM – 5:00 PM",
  hoursSun: "Closed",
  timeZone: "Asia/Manila (UTC+08:00)",
  showOpeningHours: true,

  subdomain: "bellavita",
  customDomain: "www.bellavita.example",
  isDomainVerified: false,

  pageTitle: "Bella Vita Salon & Spa | Beauty & Wellness in Cebu",
  metaDescription:
    "Refresh your look and recharge at Bella Vita in Cebu. Explore hair, skin, and wellness services, and book your next appointment online.",
  allowIndexing: true,
  socialTitle: "Your next moment of care starts here.",
  socialDescription:
    "Explore Bella Vita services and book a little time for yourself.",
};

// Shared field input class
const fieldInput =
  "h-11 w-full rounded-lg border border-outline bg-white px-3 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30 transition-shadow";

const fieldTextarea =
  "w-full rounded-lg border border-outline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30 transition-shadow leading-relaxed";

interface WebsiteSettingsViewProps {
  initialData?: Partial<WebsiteSettingsData>;
  tenantSlug?: string;
  tenantId?: string;
  customDomainToken?: string;
  userEmail?: string;
}

export function WebsiteSettingsView({
  initialData,
  tenantSlug,
  tenantId,
  customDomainToken,
  userEmail = "Maria Santos",
}: WebsiteSettingsViewProps) {
  // Stored saved state
  const [savedSettings, setSavedSettings] = React.useState<WebsiteSettingsData>({
    ...INITIAL_SETTINGS,
    ...(tenantSlug ? { subdomain: tenantSlug } : {}),
    ...initialData,
  });

  // Current draft state
  const [form, setForm] = React.useState<WebsiteSettingsData>(savedSettings);
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("branding");
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop");

  const hasChanges = React.useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedSettings);
  }, [form, savedSettings]);

  // Modals state
  const [activeColorPicker, setActiveColorPicker] = React.useState<ColorType | null>(null);
  const [isConnectDomainOpen, setIsConnectDomainOpen] = React.useState(false);
  const [isWaitingDnsOpen, setIsWaitingDnsOpen] = React.useState(false);
  const [isChangeAddressOpen, setIsChangeAddressOpen] = React.useState(false);
  const [isAddressUpdatedOpen, setIsAddressUpdatedOpen] = React.useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [isPublishReviewOpen, setIsPublishReviewOpen] = React.useState(false);
  const [isPublishedOpen, setIsPublishedOpen] = React.useState(false);
  const [isDraftSavedOpen, setIsDraftSavedOpen] = React.useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = React.useState(false);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = React.useState(false);
  const [linkCopiedToast, setLinkCopiedToast] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [saveDraftError, setSaveDraftError] = React.useState<string | null>(null);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    assetType: "logo" | "cover"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed =
      assetType === "logo" ? ALLOWED_LOGO_MIME_TYPES : ALLOWED_COVER_MIME_TYPES;
    if (!allowed.has(file.type)) {
      const allowedText =
        assetType === "cover" ? "PNG, JPEG, or WEBP" : "PNG, JPEG, WEBP, or SVG";
      setUploadError(`Unsupported file format (${file.type}). Please upload a ${allowedText}.`);
      event.target.value = "";
      return;
    }

    const maxBytes = MAX_FILE_SIZES[assetType];
    if (file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      setUploadError(`File is too large. Maximum allowed size for ${assetType} is ${maxMb} MB.`);
      event.target.value = "";
      return;
    }

    if (assetType === "logo") setIsUploadingLogo(true);
    else setIsUploadingCover(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);

      const res = await uploadTenantMediaAction(formData, tenantId);
      if (res.success) {
        if (res.data) {
          if (assetType === "logo") {
            handleChange("logoUrl", res.data.url);
          } else {
            handleChange("coverPhotoName", res.data.filename);
            handleChange("coverPhotoUrl", res.data.url);
          }
        }
      } else {
        setUploadError(res.error || "Upload failed");
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      if (assetType === "logo") setIsUploadingLogo(false);
      else setIsUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleChange = <K extends keyof WebsiteSettingsData>(
    key: K,
    val: WebsiteSettingsData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleApplyColor = (type: ColorType, hex: string) => {
    if (type === "main") handleChange("mainColor", hex);
    if (type === "secondary") handleChange("secondaryColor", hex);
    if (type === "accent") handleChange("accentColor", hex);
  };

  const handleConfirmAddress = (newSubdomain: string) => {
    handleChange("subdomain", newSubdomain);
    setIsChangeAddressOpen(false);
    setIsAddressUpdatedOpen(true);
  };

  const handleCopyLink = () => {
    const url = `https://${form.subdomain}.fides.app`;
    navigator.clipboard?.writeText(url);
    setLinkCopiedToast(true);
    setTimeout(() => setLinkCopiedToast(false), 2200);
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSaveDraftError(null);
    try {
      const res = await saveWebsiteDraftAction(form, tenantId);
      if (!res.success) {
        setSaveDraftError(res.error || "Failed to save draft.");
        return;
      }
      setSavedSettings(form);
      setIsDraftSavedOpen(true);
    } catch (err: unknown) {
      setSaveDraftError(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await publishWebsiteSettingsAction(form, tenantId);
      if (!res.success) {
        setPublishError(res.error || "Failed to publish settings.");
        return;
      }
      setSavedSettings(form);
      setIsPublishReviewOpen(false);
      setIsPublishedOpen(true);
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish settings.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscard = async () => {
    setForm(savedSettings);
    await discardWebsiteDraftAction(tenantId);
    setIsDiscardOpen(false);
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "branding", label: "Branding & homepage" },
    { id: "business-info", label: "Business information" },
    { id: "website-address", label: "Website address" },
    { id: "search-sharing", label: "Search & sharing" },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:flex-row">
      {/* Toast notifications */}
      {linkCopiedToast && (
        <div className="fixed top-5 right-5 z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 text-xs font-medium">
          <CheckIcon className="w-4 h-4 text-mint" />
          <span>Website link copied to clipboard</span>
        </div>
      )}

      {uploadError && (
        <div className="fixed top-5 right-5 z-50 bg-danger text-white px-4 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 text-xs font-medium">
          <AlertCircleIcon className="w-4 h-4 text-white" />
          <span>{uploadError}</span>
          <button type="button" onClick={() => setUploadError(null)} className="ml-2 font-bold hover:opacity-80">×</button>
        </div>
      )}

      {saveDraftError && (
        <div className="fixed top-5 right-5 z-50 bg-danger text-white px-4 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 text-xs font-medium">
          <AlertCircleIcon className="w-4 h-4 text-white" />
          <span>{saveDraftError}</span>
          <button type="button" onClick={() => setSaveDraftError(null)} className="ml-2 font-bold hover:opacity-80">×</button>
        </div>
      )}

      {/* Sidebar */}
      <MerchantSidebar
        businessName={form.businessName.split(" ")[0] || "Bella Vita"}
        userEmail={userEmail}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            eyebrow="CONFIGURATION"
            title="Website settings"
            description="Set your logo, colors and homepage content. Preview your changes before publishing."
            actions={
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-wash px-2.5 py-1 text-xs font-semibold leading-[18px] text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Website is live
                </span>
                <AdminButton
                  variant="outline"
                  size="xs"
                  onClick={() => setIsLivePreviewOpen(true)}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  Preview website
                </AdminButton>
              </div>
            }
          />

          {/* Tab Navigation */}
          <div className="-mt-1 border-b border-hairline">
            <div className="flex items-center gap-6 overflow-x-auto text-sm font-medium">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none ${
                    activeTab === tab.id
                      ? "border-burnt text-burnt font-semibold"
                      : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================================
              TAB 1: BRANDING & HOMEPAGE
             ====================================================================== */}
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Form controls */}
              <div className="lg:col-span-7 space-y-5">
                {/* 01 Brand identity */}
                <Surface className="space-y-5">
                  <div className="flex items-center justify-between border-b border-hairline pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-subtle">01</span>
                      <h2 className="text-sm font-semibold text-ink">Brand identity</h2>
                    </div>
                    <span className="text-xs text-muted">Visible across your website</span>
                  </div>

                  {/* Logo, Display Name, Typography */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* Business logo */}
                    <div className="sm:col-span-3">
                      <span className="block text-xs font-semibold text-ink mb-1.5">Business logo</span>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "logo")}
                      />
                      <div className="w-16 h-16 rounded-xl bg-powder border border-hairline flex items-center justify-center font-display text-2xl font-bold text-burnt shadow-sm overflow-hidden relative">
                        {form.logoUrl ? (
                          <Image src={form.logoUrl} alt="Logo" fill unoptimized className="object-cover" />
                        ) : (
                          form.logoInitials
                        )}
                      </div>
                      <span className="block text-[10px] text-subtle mt-1">PNG or SVG · 2 MB</span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          disabled={isUploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs font-semibold text-burnt hover:text-burnt-dark underline disabled:opacity-50 transition-colors"
                        >
                          {isUploadingLogo ? "Uploading..." : "Replace logo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = prompt("Logo initials (1-3 letters):", form.logoInitials) || form.logoInitials;
                            handleChange("logoInitials", val.toUpperCase().slice(0, 3));
                          }}
                          className="text-[11px] text-muted hover:text-ink underline transition-colors"
                        >
                          Initials
                        </button>
                      </div>
                    </div>

                    {/* Business display name */}
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        Business display name
                      </label>
                      <input
                        type="text"
                        value={form.businessName}
                        onChange={(e) => handleChange("businessName", e.target.value)}
                        className={fieldInput}
                      />
                    </div>

                    {/* Website typography */}
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        Website typography
                      </label>
                      <div className="relative">
                        <select
                          value={form.typography}
                          onChange={(e) => handleChange("typography", e.target.value)}
                          className={`${fieldInput} appearance-none pr-8`}
                        >
                          <option value="Ovo + Mulish">Ovo + Mulish</option>
                          <option value="Playfair + Inter">Playfair + Inter</option>
                          <option value="Cormorant + Plus Jakarta Sans">Cormorant + Plus Jakarta Sans</option>
                          <option value="DM Serif + Montserrat">DM Serif + Montserrat</option>
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-glyph absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Website color palette */}
                  <div className="pt-1">
                    <span className="block text-xs font-semibold text-ink mb-2">Website color palette</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["main", "secondary", "accent"] as ColorType[]).map((type) => {
                        const labels = { main: "Main", secondary: "Secondary", accent: "Accent" };
                        const descs = { main: "Backgrounds", secondary: "Sections & cards", accent: "Buttons & links" };
                        const percents = { main: "60%", secondary: "30%", accent: "10%" };
                        const color = type === "main" ? form.mainColor : type === "secondary" ? form.secondaryColor : form.accentColor;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setActiveColorPicker(type)}
                            className="p-3 rounded-[10px] border border-hairline bg-white hover:border-outline transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-semibold text-ink">{labels[type]}</span>
                              <span className="text-[10px] text-subtle">{percents[type]}</span>
                            </div>
                            <div className="flex items-center gap-2 p-1 rounded-lg bg-mist border border-hairline">
                              <span className="w-5 h-5 rounded border border-black/10 shrink-0" style={{ backgroundColor: color }} />
                              <span className="font-mono text-xs uppercase font-medium text-body">{color}</span>
                            </div>
                            <span className="block text-[10px] text-subtle mt-1.5">{descs[type]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex my-3 border border-black/5">
                      <div style={{ width: "60%", backgroundColor: form.mainColor }} />
                      <div style={{ width: "30%", backgroundColor: form.secondaryColor }} />
                      <div style={{ width: "10%", backgroundColor: form.accentColor }} />
                    </div>
                    <p className="text-xs text-muted">
                      Use 60% Main for backgrounds, 30% Secondary for supporting sections, and 10% Accent for key actions.
                    </p>
                  </div>
                </Surface>

                {/* 02 Homepage content */}
                <Surface className="space-y-5">
                  <div className="flex items-center justify-between border-b border-hairline pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-subtle">02</span>
                      <h2 className="text-sm font-semibold text-ink">Homepage content</h2>
                    </div>
                    <span className="text-xs text-muted">Make it feel like you</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Headline</label>
                    <input
                      type="text"
                      value={form.headline}
                      onChange={(e) => handleChange("headline", e.target.value)}
                      className={fieldInput}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Supporting message</label>
                    <textarea
                      rows={2}
                      value={form.supportingMessage}
                      onChange={(e) => handleChange("supportingMessage", e.target.value)}
                      className={fieldTextarea}
                    />
                  </div>

                  <div className="pt-1 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Cover photo */}
                    <div className="sm:col-span-5 flex items-center gap-3">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "cover")}
                      />
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-mist border border-hairline shrink-0 relative">
                        <Image
                          src={form.coverPhotoUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80"}
                          alt="Cover"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">Cover photo</span>
                          <button
                            type="button"
                            disabled={isUploadingCover}
                            onClick={() => coverInputRef.current?.click()}
                            className="text-burnt hover:underline font-semibold disabled:opacity-50 transition-colors"
                          >
                            {isUploadingCover ? "Uploading..." : "Change"}
                          </button>
                        </div>
                        <span className="text-muted block truncate max-w-[140px]">{form.coverPhotoName}</span>
                        <span className="text-subtle text-[10px]">Recommended: 1600 × 900</span>
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="sm:col-span-7 space-y-3">
                      {[
                        { key: "showFeaturedServices" as const, label: "Show featured services", desc: "Help visitors find their next appointment." },
                        { key: "showContactDetails" as const, label: "Show contact details", desc: "Display your business email and phone." },
                      ].map(({ key, label, desc }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold text-ink block">{label}</span>
                            <span className="text-[11px] text-muted">{desc}</span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={form[key]}
                            onClick={() => handleChange(key, !form[key])}
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${form[key] ? "bg-burnt" : "bg-line"}`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${form[key] ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Surface>
              </div>

              {/* Right: Website Preview */}
              <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
                <Surface className="space-y-4">
                  {/* Preview header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <Icon name="settings" className="size-4 text-glyph" />
                      <span className="text-xs font-semibold text-ink">Website preview</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Device switcher */}
                      <div className="flex items-center border border-hairline rounded-lg p-0.5 bg-mist text-muted">
                        {(["desktop", "mobile"] as const).map((device) => (
                          <button
                            key={device}
                            type="button"
                            onClick={() => setPreviewDevice(device)}
                            className={`p-1 rounded transition-colors ${previewDevice === device ? "bg-powder text-burnt" : "hover:text-ink"}`}
                            aria-label={`${device} view`}
                          >
                            {device === "desktop" ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                                <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="inline-flex items-center rounded-md bg-warn-bg px-2 py-1 text-xs font-semibold leading-[18px] text-warn-fg">
                        Draft preview
                      </span>
                    </div>
                  </div>

                  {/* Browser URL bar */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-mist border border-hairline text-xs font-mono text-body">
                    <div className="flex items-center gap-2 truncate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-glyph shrink-0">
                        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span className="truncate">{form.subdomain}.fides.app</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLivePreviewOpen(true)}
                      className="text-glyph hover:text-ink ml-2 transition-colors"
                      aria-label="Open in full preview"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </div>

                  {/* Scaled preview frame */}
                  <div
                    className={`rounded-xl border border-black/5 overflow-hidden transition-all duration-200 ${previewDevice === "mobile" ? "max-w-[280px] mx-auto shadow-md" : "w-full"}`}
                    style={{ backgroundColor: form.mainColor, fontFamily: form.typography.includes("Ovo") ? "var(--font-display), Georgia, serif" : "inherit" }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between border-b border-black/5 bg-white/40">
                      <span className="font-serif text-sm font-semibold text-ink">{form.businessName.split(" ")[0] || "Bella Vita"}</span>
                      <div className="flex items-center gap-3 text-[10px] font-sans">
                        <span className="hidden sm:inline text-body">Home</span>
                        <span className="hidden sm:inline text-body">Services</span>
                        <span className="hidden sm:inline text-body">Contact</span>
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: form.accentColor }}>Book now</span>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-7 space-y-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-bold block" style={{ color: form.accentColor }}>{form.businessCategory.toUpperCase()}</span>
                        <h3 className="text-base font-serif font-medium text-ink leading-snug">{form.headline}</h3>
                        <p className="text-[10px] text-body font-sans leading-relaxed line-clamp-2">{form.supportingMessage}</p>
                        <div className="pt-1">
                          <span className="inline-block px-3 py-1 rounded-md text-[10px] font-semibold text-white shadow-sm font-sans" style={{ backgroundColor: form.accentColor }}>Book an appointment</span>
                        </div>
                      </div>
                      <div className="col-span-5 h-24 rounded-lg overflow-hidden bg-mist relative">
                        <Image src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80" alt="Specialist" fill unoptimized className="object-cover" />
                      </div>
                    </div>
                    {form.showFeaturedServices && (
                      <div className="p-3.5 space-y-2 font-sans" style={{ backgroundColor: form.secondaryColor }}>
                        <span className="text-[10px] font-bold text-ink block font-serif">Find your moment of care</span>
                        <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                          {["Signature haircut · 45 min · ₱650", "Wellness massage · 60 min · ₱1,200", "Facial treatment · 50 min · ₱950"].map((s, i) => {
                            const [name, ...rest] = s.split(" · ");
                            return (
                              <div key={i} className="bg-white/90 p-1.5 rounded border border-black/5">
                                <span className="font-semibold text-ink block truncate">{name}</span>
                                <span className="text-muted block text-[8px]">{rest.join(" · ")}</span>
                                <span className="text-[8px] text-burnt font-medium mt-1 block">View service →</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="px-4 py-2 border-t border-black/5 flex items-center justify-between text-[9px] text-muted font-sans">
                      <span>{form.businessName}</span>
                      <span>Powered by Fides</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted flex items-center gap-1.5 pt-1">
                    <CheckIcon className="w-3.5 h-3.5 text-glyph" />
                    <span>Only you can see these updates until you publish.</span>
                  </p>
                </Surface>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB 2: BUSINESS INFORMATION
             ====================================================================== */}
          {activeTab === "business-info" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Left: Public Profile & Contact */}
              <div className="space-y-5">
                <Surface className="space-y-4">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">01 · PUBLIC PROFILE</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Help customers get to know you</h2>
                    <p className="text-xs text-muted">These details appear on your About &amp; contact page.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Business name</label>
                      <input type="text" value={form.businessName} onChange={(e) => handleChange("businessName", e.target.value)} className={fieldInput} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Business category</label>
                      <div className="relative">
                        <select value={form.businessCategory} onChange={(e) => handleChange("businessCategory", e.target.value)} className={`${fieldInput} appearance-none pr-8`}>
                          <option value="Beauty & wellness">Beauty &amp; wellness</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Fitness">Fitness</option>
                          <option value="Professional services">Professional services</option>
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-glyph absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">About your business</label>
                      <textarea rows={3} value={form.about} onChange={(e) => handleChange("about", e.target.value)} className={fieldTextarea} />
                    </div>
                  </div>
                </Surface>

                <Surface className="space-y-4">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">02 · CUSTOMER CONTACT</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Make it easy to reach you</h2>
                    <p className="text-xs text-muted">Use contact details your customers can access.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Business email</label>
                      <input type="email" value={form.businessEmail} onChange={(e) => handleChange("businessEmail", e.target.value)} className={fieldInput} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Phone number</label>
                      <input type="text" value={form.phoneNumber} onChange={(e) => handleChange("phoneNumber", e.target.value)} className={fieldInput} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Instagram profile</label>
                      <input type="text" value={form.instagram} onChange={(e) => handleChange("instagram", e.target.value)} className={fieldInput} />
                    </div>
                  </div>
                </Surface>
              </div>

              {/* Right: Location & Opening Hours */}
              <div className="space-y-5">
                <Surface className="space-y-4">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">03 · LOCATION</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Where customers can find you</h2>
                    <p className="text-xs text-muted">Shown with your contact details on the website.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Street address</label>
                      <input type="text" value={form.streetAddress} onChange={(e) => handleChange("streetAddress", e.target.value)} className={fieldInput} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">City / province</label>
                        <input type="text" value={form.cityProvince} onChange={(e) => handleChange("cityProvince", e.target.value)} className={fieldInput} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink mb-1.5">Postal code</label>
                        <input type="text" value={form.postalCode} onChange={(e) => handleChange("postalCode", e.target.value)} className={fieldInput} />
                      </div>
                    </div>
                  </div>
                </Surface>

                <Surface className="space-y-4">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">04 · OPENING HOURS</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Set clear expectations</h2>
                    <p className="text-xs text-muted">These are display hours. Appointment availability follows Booking settings.</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Monday – Friday", value: form.hoursMonFri },
                      { label: "Saturday", value: form.hoursSat },
                      { label: "Sunday", value: form.hoursSun },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-mist border border-hairline">
                        <span className="text-body font-medium">{label}</span>
                        <span className="font-semibold text-ink">{value}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted pt-1">Time zone · {form.timeZone}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-semibold text-ink block">Show opening hours</span>
                      <span className="text-xs text-muted">Display your weekly hours on the contact page.</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.showOpeningHours}
                      onClick={() => handleChange("showOpeningHours", !form.showOpeningHours)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 ${form.showOpeningHours ? "bg-burnt" : "bg-line"}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${form.showOpeningHours ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </Surface>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB 3: WEBSITE ADDRESS
             ====================================================================== */}
          {activeTab === "website-address" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-5">
                <Surface className="space-y-5">
                  <div className="flex items-start justify-between border-b border-hairline pb-4">
                    <div>
                      <span className="text-xs font-bold text-subtle block">01 · WEBSITE ADDRESS</span>
                      <h2 className="text-sm font-semibold text-ink mt-1">Your home on the web</h2>
                      <p className="text-xs text-muted">Share this address with customers so they can book directly.</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-wash px-2 py-1 text-xs font-semibold leading-[18px] text-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                      Live · Secure HTTPS
                    </span>
                  </div>

                  <div className="rounded-lg border border-hairline bg-mist p-4 space-y-3">
                    <span className="text-xs font-semibold text-ink block">Fides website address</span>
                    <div className="flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-sm text-ink">
                      <span>{form.subdomain}.fides.app</span>
                      <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink font-sans transition-colors">
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy link</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <AdminButton variant="primary" size="xs" onClick={() => setIsChangeAddressOpen(true)}>
                        Change website address
                      </AdminButton>
                      <AdminButton variant="outline" size="xs" onClick={() => setIsShareModalOpen(true)}>
                        Share
                      </AdminButton>
                    </div>
                    <p className="text-xs text-muted">Use 3–40 lowercase letters, numbers, or hyphens. No spaces.</p>
                  </div>

                  <div className="rounded-lg bg-warn-bg border border-warn-bg p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-warn-fg">
                      <AlertCircleIcon className="w-4 h-4 shrink-0" />
                      <span>Changing your address affects shared links</span>
                    </div>
                    <p className="text-sm text-warn-fg leading-relaxed pl-6">
                      Your previous URL may stop working. Update social profiles, QR codes, and promotional links before sharing a new address.
                    </p>
                  </div>
                </Surface>

                <Surface className="space-y-5">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">02 · CUSTOM DOMAIN</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Bring your own domain</h2>
                    <p className="text-xs text-muted">Connect a domain you already own. Keep the Fides address as a fallback.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Domain name</label>
                    <input type="text" value={form.customDomain} onChange={(e) => handleChange("customDomain", e.target.value)} className={`${fieldInput} font-mono`} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-mist border border-hairline">
                    <AdminButton variant="primary" size="xs" onClick={() => setIsConnectDomainOpen(true)}>
                      View connection steps
                    </AdminButton>
                    <span className="inline-flex items-center rounded-md bg-warn-bg px-2 py-1 text-xs font-semibold leading-[18px] text-warn-fg">
                      <span className="w-1.5 h-1.5 rounded-full bg-warn-fg mr-1.5" />
                      Pending DNS setup
                    </span>
                  </div>
                </Surface>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <Surface className="space-y-4">
                  <span className="text-xs font-bold text-subtle block">CUSTOMER LINK</span>
                  <h3 className="text-sm font-semibold text-ink">One link. A simple way to book.</h3>
                  <div className="rounded-lg border border-hairline bg-mist p-4 space-y-1">
                    <span className="text-sm font-bold text-ink block">{form.businessName}</span>
                    <span className="font-mono text-xs text-muted block">{form.subdomain}.fides.app</span>
                    <span className="text-xs text-subtle block pt-1">Services · Online booking · About &amp; contact</span>
                  </div>
                  <div className="space-y-2 pt-1 text-sm text-muted">
                    <span className="font-semibold text-ink block">Before you make the switch</span>
                    <p>1 Review your new address: choose a memorable name customers can type easily.</p>
                    <p>2 Update your shared links: include social media bios, QR codes, and email signature.</p>
                    <p>3 Check the customer journey: open your website and test booking after publishing.</p>
                  </div>
                </Surface>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB 4: SEARCH & SHARING
             ====================================================================== */}
          {activeTab === "search-sharing" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-5">
                <Surface className="space-y-5">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">01 · SEARCH LISTING</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Help the right customers find you</h2>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-ink">Page title</label>
                      <span className="text-xs text-muted">{form.pageTitle.length} / 60 characters recommended</span>
                    </div>
                    <input type="text" value={form.pageTitle} onChange={(e) => handleChange("pageTitle", e.target.value)} className={fieldInput} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-ink">Meta description</label>
                      <span className="text-xs text-muted">{form.metaDescription.length} / 160 characters recommended</span>
                    </div>
                    <textarea rows={3} value={form.metaDescription} onChange={(e) => handleChange("metaDescription", e.target.value)} className={fieldTextarea} />
                  </div>
                </Surface>

                <Surface className="space-y-5">
                  <div className="border-b border-hairline pb-4">
                    <span className="text-xs font-bold text-subtle block">02 · SOCIAL SHARING</span>
                    <h2 className="text-sm font-semibold text-ink mt-1">Look good when your link is shared</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Social preview title</label>
                    <input type="text" value={form.socialTitle} onChange={(e) => handleChange("socialTitle", e.target.value)} className={fieldInput} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Social preview description</label>
                    <textarea rows={2} value={form.socialDescription} onChange={(e) => handleChange("socialDescription", e.target.value)} className={fieldTextarea} />
                  </div>
                </Surface>
              </div>

              {/* Right: Previews */}
              <div className="lg:col-span-5 space-y-4">
                <Surface className="space-y-3">
                  <span className="text-xs font-bold text-subtle block">SEARCH ENGINE RESULT</span>
                  <div className="text-sm text-ink font-medium">{form.businessName}</div>
                  <div className="text-xs text-subtle font-mono">https://{form.subdomain}.fides.app</div>
                  <h4 className="text-sm font-semibold text-info">{form.pageTitle}</h4>
                  <p className="text-sm text-muted line-clamp-3">{form.metaDescription}</p>
                </Surface>

                <Surface className="overflow-hidden !p-0">
                  <div className="h-32 bg-mist overflow-hidden relative">
                    <Image src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80" alt="Social banner" fill unoptimized className="object-cover" />
                  </div>
                  <div className="p-4 space-y-1 bg-mist">
                    <span className="font-mono text-[10px] uppercase font-bold text-subtle block">{form.subdomain.toUpperCase()}.FIDES.APP</span>
                    <h4 className="text-sm font-bold text-ink">{form.socialTitle}</h4>
                    <p className="text-sm text-muted line-clamp-2">{form.socialDescription}</p>
                  </div>
                </Surface>
              </div>
            </div>
          )}
        </PageContent>

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-hairline px-4 sm:px-6 lg:px-8 py-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-sm font-semibold text-ink block">
                Draft · {hasChanges ? "Unpublished changes" : "All changes published"}
              </span>
              <span className="text-xs text-muted hidden sm:block">
                Your current website stays live while you edit.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AdminButton
              variant="outline"
              size="xs"
              type="button"
              disabled={!hasChanges}
              onClick={() => setIsDiscardOpen(true)}
            >
              Discard changes
            </AdminButton>
            <AdminButton
              variant="outline"
              size="xs"
              type="button"
              disabled={isSavingDraft}
              onClick={handleSaveDraft}
            >
              {isSavingDraft ? "Saving..." : "Save draft"}
            </AdminButton>
            <AdminButton
              variant="primary"
              size="sm"
              type="button"
              disabled={isPublishing}
              onClick={() => setIsPublishReviewOpen(true)}
            >
              {isPublishing ? "Publishing..." : "Publish changes"}
            </AdminButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ColorPickerModal
        type={activeColorPicker}
        currentColor={
          activeColorPicker === "main"
            ? form.mainColor
            : activeColorPicker === "secondary"
            ? form.secondaryColor
            : activeColorPicker === "accent"
            ? form.accentColor
            : "#FFFFFF"
        }
        isOpen={activeColorPicker !== null}
        onClose={() => setActiveColorPicker(null)}
        onApply={handleApplyColor}
      />
      <ConnectDomainModal
        isOpen={isConnectDomainOpen}
        onClose={() => setIsConnectDomainOpen(false)}
        domainName={form.customDomain}
        verificationToken={customDomainToken || `fides-site-verification=${tenantId || form.subdomain}`}
        tenantId={tenantId}
        onVerified={() => handleChange("isDomainVerified", true)}
        onCheckStatus={() => setIsWaitingDnsOpen(true)}
      />
      <WaitingDnsModal isOpen={isWaitingDnsOpen} onClose={() => setIsWaitingDnsOpen(false)} />
      <ChangeAddressModal
        isOpen={isChangeAddressOpen}
        onClose={() => setIsChangeAddressOpen(false)}
        currentSubdomain={form.subdomain}
        tenantId={tenantId}
        onConfirm={handleConfirmAddress}
      />
      <AddressUpdatedModal isOpen={isAddressUpdatedOpen} onClose={() => setIsAddressUpdatedOpen(false)} subdomain={form.subdomain} />
      <ShareWebsiteModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} url={`https://${form.subdomain}.fides.app`} />
      <PublishReviewModal
        isOpen={isPublishReviewOpen}
        onClose={() => setIsPublishReviewOpen(false)}
        onPublish={handlePublish}
        siteAddress={`${form.subdomain}.fides.app`}
        isPublishing={isPublishing}
        errorMessage={publishError}
      />
      <PublishedModal isOpen={isPublishedOpen} onClose={() => setIsPublishedOpen(false)} siteAddress={`${form.subdomain}.fides.app`} />
      <DraftSavedModal isOpen={isDraftSavedOpen} onClose={() => setIsDraftSavedOpen(false)} />
      <DiscardModal isOpen={isDiscardOpen} onClose={() => setIsDiscardOpen(false)} onDiscard={handleDiscard} />
      <LivePreviewModal isOpen={isLivePreviewOpen} onClose={() => setIsLivePreviewOpen(false)} data={form} />
    </div>
  );
}
