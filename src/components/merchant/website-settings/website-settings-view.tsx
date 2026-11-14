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

  // Track modification as derived state
  const hasChanges = React.useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedSettings);
  }, [form, savedSettings]);

  // Modals state
  const [activeColorPicker, setActiveColorPicker] =
    React.useState<ColorType | null>(null);
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

    // Validate MIME type locally before upload (QA #7)
    const allowed =
      assetType === "logo" ? ALLOWED_LOGO_MIME_TYPES : ALLOWED_COVER_MIME_TYPES;
    if (!allowed.has(file.type)) {
      const allowedText =
        assetType === "cover" ? "PNG, JPEG, or WEBP" : "PNG, JPEG, WEBP, or SVG";
      setUploadError(`Unsupported file format (${file.type}). Please upload a ${allowedText}.`);
      event.target.value = "";
      return;
    }

    // Validate file size locally before upload (QA #7)
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
          // QA #9: Logo upload saves into draft settings only, does not alter live site
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

  // Field change handler
  const handleChange = <K extends keyof WebsiteSettingsData>(
    key: K,
    val: WebsiteSettingsData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  // Color apply handler
  const handleApplyColor = (type: ColorType, hex: string) => {
    if (type === "main") handleChange("mainColor", hex);
    if (type === "secondary") handleChange("secondaryColor", hex);
    if (type === "accent") handleChange("accentColor", hex);
  };

  // Address confirm handler
  const handleConfirmAddress = (newSubdomain: string) => {
    handleChange("subdomain", newSubdomain);
    setIsChangeAddressOpen(false);
    setIsAddressUpdatedOpen(true);
  };

  // Copy link
  const handleCopyLink = () => {
    const url = `https://${form.subdomain}.fides.app`;
    navigator.clipboard?.writeText(url);
    setLinkCopiedToast(true);
    setTimeout(() => setLinkCopiedToast(false), 2200);
  };

  // Actions (QA #10: Await server action and verify success before showing modal)
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

  return (
    <div className="min-h-screen bg-[#FFFDF6] text-neutral-900 flex flex-col md:flex-row antialiased font-sans">
      {/* Toast notification */}
      {linkCopiedToast && (
        <div className="fixed top-5 right-5 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckIcon className="w-4 h-4 text-emerald-400" />
          <span>Website link copied to clipboard</span>
        </div>
      )}

      {uploadError && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <AlertCircleIcon className="w-4 h-4 text-white" />
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-2 font-bold hover:opacity-80"
          >
            ×
          </button>
        </div>
      )}

      {saveDraftError && (
        <div className="fixed top-5 right-5 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <AlertCircleIcon className="w-4 h-4 text-white" />
          <span>{saveDraftError}</span>
          <button
            type="button"
            onClick={() => setSaveDraftError(null)}
            className="ml-2 font-bold hover:opacity-80"
          >
            ×
          </button>
        </div>
      )}

      {/* Shared Merchant Sidebar */}
      <MerchantSidebar
        businessName={form.businessName.split(" ")[0] || "Bella Vita"}
        userEmail={userEmail}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Top Header */}
        <header className="px-6 sm:px-10 pt-7 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-normal font-serif text-neutral-900 tracking-tight">
              Website settings
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Set your logo, colors and homepage content. Preview your changes before publishing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Website is live</span>
            </div>

            <button
              type="button"
              onClick={() => setIsLivePreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#EDECE8] bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition shadow-2xs"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              <span>Preview website</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="px-6 sm:px-10 border-b border-[#EDECE8]">
          <div className="flex items-center gap-6 text-xs sm:text-sm font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "branding"
                  ? "border-[#C35000] text-[#C35000] font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Branding & homepage
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("business-info")}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "business-info"
                  ? "border-[#C35000] text-[#C35000] font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Business information
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("website-address")}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "website-address"
                  ? "border-[#C35000] text-[#C35000] font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Website address
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("search-sharing")}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === "search-sharing"
                  ? "border-[#C35000] text-[#C35000] font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Search & sharing
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <main className="flex-1 px-6 sm:px-10 py-6 pb-28">
          {/* =========================================================================
              TAB 1: BRANDING & HOMEPAGE (Pixel-matched to Screenshot 160436)
             ========================================================================= */}
          {activeTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Form controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* 01 Brand identity Card */}
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400">01</span>
                      <h2 className="text-sm font-semibold text-neutral-900">
                        Brand identity
                      </h2>
                    </div>
                    <span className="text-xs text-neutral-400">
                      Visible across your website
                    </span>
                  </div>

                  {/* Logo, Display Name, Typography in one flex row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    {/* Business logo */}
                    <div className="sm:col-span-3">
                      <span className="block text-xs font-medium text-neutral-700 mb-1.5">
                        Business logo
                      </span>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "logo")}
                      />
                      <div className="w-16 h-16 rounded-xl bg-[#FFFFEB] border border-[#EDECE8] flex items-center justify-center font-serif text-2xl font-bold text-[#C35000] shadow-2xs overflow-hidden relative">
                        {form.logoUrl ? (
                          <Image
                            src={form.logoUrl}
                            alt="Logo"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          form.logoInitials
                        )}
                      </div>
                      <span className="block text-[10px] text-neutral-400 mt-1">
                        PNG or SVG · 2 MB
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          disabled={isUploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs font-medium text-neutral-700 hover:text-neutral-900 underline disabled:opacity-50"
                        >
                          {isUploadingLogo ? "Uploading..." : "Replace logo"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = prompt("Logo initials (1-3 letters):", form.logoInitials) || form.logoInitials;
                            handleChange("logoInitials", val.toUpperCase().slice(0, 3));
                          }}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 underline"
                        >
                          Initials
                        </button>
                      </div>
                    </div>

                    {/* Business display name */}
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                        Business display name
                      </label>
                      <input
                        type="text"
                        value={form.businessName}
                        onChange={(e) => handleChange("businessName", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white transition"
                      />
                    </div>

                    {/* Website typography */}
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                        Website typography
                      </label>
                      <div className="relative">
                        <select
                          value={form.typography}
                          onChange={(e) => handleChange("typography", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white transition"
                        >
                          <option value="Ovo + Mulish">Ovo + Mulish</option>
                          <option value="Playfair + Inter">Playfair + Inter</option>
                          <option value="Cormorant + Plus Jakarta Sans">Cormorant + Plus Jakarta Sans</option>
                          <option value="DM Serif + Montserrat">DM Serif + Montserrat</option>
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Website color palette */}
                  <div className="pt-2">
                    <span className="block text-xs font-medium text-neutral-700 mb-2">
                      Website color palette
                    </span>

                    {/* 3 Swatches */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Main */}
                      <button
                        type="button"
                        onClick={() => setActiveColorPicker("main")}
                        className="p-3 rounded-xl border border-[#EDECE8] bg-white hover:border-neutral-300 transition text-left"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-neutral-800">Main</span>
                          <span className="text-[10px] text-neutral-400">60%</span>
                        </div>
                        <div className="flex items-center gap-2 p-1 rounded-lg bg-neutral-50 border border-neutral-200">
                          <span
                            className="w-5 h-5 rounded border border-black/10 shrink-0"
                            style={{ backgroundColor: form.mainColor }}
                          />
                          <span className="font-mono text-xs uppercase font-medium text-neutral-700">
                            {form.mainColor}
                          </span>
                        </div>
                        <span className="block text-[10px] text-neutral-400 mt-1.5">
                          Backgrounds
                        </span>
                      </button>

                      {/* Secondary */}
                      <button
                        type="button"
                        onClick={() => setActiveColorPicker("secondary")}
                        className="p-3 rounded-xl border border-[#EDECE8] bg-white hover:border-neutral-300 transition text-left"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-neutral-800">Secondary</span>
                          <span className="text-[10px] text-neutral-400">30%</span>
                        </div>
                        <div className="flex items-center gap-2 p-1 rounded-lg bg-neutral-50 border border-neutral-200">
                          <span
                            className="w-5 h-5 rounded border border-black/10 shrink-0"
                            style={{ backgroundColor: form.secondaryColor }}
                          />
                          <span className="font-mono text-xs uppercase font-medium text-neutral-700">
                            {form.secondaryColor}
                          </span>
                        </div>
                        <span className="block text-[10px] text-neutral-400 mt-1.5">
                          Sections & cards
                        </span>
                      </button>

                      {/* Accent */}
                      <button
                        type="button"
                        onClick={() => setActiveColorPicker("accent")}
                        className="p-3 rounded-xl border border-[#EDECE8] bg-white hover:border-neutral-300 transition text-left"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-neutral-800">Accent</span>
                          <span className="text-[10px] text-neutral-400">10%</span>
                        </div>
                        <div className="flex items-center gap-2 p-1 rounded-lg bg-neutral-50 border border-neutral-200">
                          <span
                            className="w-5 h-5 rounded border border-black/10 shrink-0"
                            style={{ backgroundColor: form.accentColor }}
                          />
                          <span className="font-mono text-xs uppercase font-medium text-neutral-700">
                            {form.accentColor}
                          </span>
                        </div>
                        <span className="block text-[10px] text-neutral-400 mt-1.5">
                          Buttons & links
                        </span>
                      </button>
                    </div>

                    {/* Proportion Segmented Bar (60 - 30 - 10) */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex my-3 border border-black/5">
                      <div style={{ width: "60%", backgroundColor: form.mainColor }} />
                      <div style={{ width: "30%", backgroundColor: form.secondaryColor }} />
                      <div style={{ width: "10%", backgroundColor: form.accentColor }} />
                    </div>

                    <p className="text-[11px] text-neutral-400">
                      Use 60% Main for backgrounds, 30% Secondary for supporting sections, and 10% Accent for key actions.
                    </p>
                  </div>
                </section>

                {/* 02 Homepage content Card */}
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400">02</span>
                      <h2 className="text-sm font-semibold text-neutral-900">
                        Homepage content
                      </h2>
                    </div>
                    <span className="text-xs text-neutral-400">
                      Make it feel like you
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Headline
                    </label>
                    <input
                      type="text"
                      value={form.headline}
                      onChange={(e) => handleChange("headline", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Supporting message
                    </label>
                    <textarea
                      rows={2}
                      value={form.supportingMessage}
                      onChange={(e) => handleChange("supportingMessage", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:bg-white transition leading-relaxed"
                    />
                  </div>

                  {/* Bottom Row: Cover photo & Toggles */}
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    {/* Cover photo */}
                    <div className="sm:col-span-5 flex items-center gap-3">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "cover")}
                      />
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 border border-[#EDECE8] shrink-0 relative">
                        <Image
                          src={
                            form.coverPhotoUrl ||
                            "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80"
                          }
                          alt="Cover"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-800">Cover photo</span>
                          <button
                            type="button"
                            disabled={isUploadingCover}
                            onClick={() => coverInputRef.current?.click()}
                            className="text-[#C35000] hover:underline font-medium text-[11px] disabled:opacity-50"
                          >
                            {isUploadingCover ? "Uploading..." : "Change"}
                          </button>
                        </div>
                        <span className="text-neutral-500 block truncate max-w-[140px]">{form.coverPhotoName}</span>
                        <span className="text-neutral-400 text-[10px]">Recommended: 1600 × 900</span>
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="sm:col-span-7 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-neutral-800 block">
                            Show featured services
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            Help visitors find their next appointment.
                          </span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.showFeaturedServices}
                          onClick={() => handleChange("showFeaturedServices", !form.showFeaturedServices)}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            form.showFeaturedServices ? "bg-[#C35000]" : "bg-neutral-300"
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              form.showFeaturedServices ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium text-neutral-800 block">
                            Show contact details
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            Display your business email and phone.
                          </span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.showContactDetails}
                          onClick={() => handleChange("showContactDetails", !form.showContactDetails)}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            form.showContactDetails ? "bg-[#C35000]" : "bg-neutral-300"
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              form.showContactDetails ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Website Preview (Pixel-matched to Screenshot 160436) */}
              <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-3">
                <div className="bg-white rounded-2xl border border-[#EDECE8] p-5 shadow-xs space-y-4">
                  {/* Preview Top Header */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-neutral-600">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      <span className="text-xs font-semibold text-neutral-900">
                        Website preview
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Device switcher */}
                      <div className="flex items-center border border-[#EDECE8] rounded-lg p-0.5 bg-neutral-50 text-neutral-500">
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("desktop")}
                          className={`p-1 rounded transition ${
                            previewDevice === "desktop"
                              ? "bg-[#FDF3EB] text-[#C35000]"
                              : "hover:text-neutral-900"
                          }`}
                          aria-label="Desktop view"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDevice("mobile")}
                          className={`p-1 rounded transition ${
                            previewDevice === "mobile"
                              ? "bg-[#FDF3EB] text-[#C35000]"
                              : "hover:text-neutral-900"
                          }`}
                          aria-label="Mobile view"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                            <line x1="12" y1="18" x2="12.01" y2="18" />
                          </svg>
                        </button>
                      </div>

                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                        Draft preview
                      </span>
                    </div>
                  </div>

                  {/* Browser URL Bar */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-50 border border-[#EDECE8] text-xs font-mono text-neutral-600">
                    <div className="flex items-center gap-2 truncate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-neutral-400 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span className="truncate">{form.subdomain}.fides.app</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLivePreviewOpen(true)}
                      className="text-neutral-400 hover:text-neutral-700 ml-2"
                      aria-label="Open in full preview"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </div>

                  {/* Scaled Preview Frame */}
                  <div
                    className={`rounded-xl border border-black/5 overflow-hidden transition-all duration-200 ${
                      previewDevice === "mobile" ? "max-w-[280px] mx-auto shadow-md" : "w-full"
                    }`}
                    style={{
                      backgroundColor: form.mainColor,
                      fontFamily: form.typography.includes("Ovo")
                        ? "var(--font-display), Georgia, serif"
                        : "inherit",
                    }}
                  >
                    {/* Site Header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-black/5 bg-white/40">
                      <span className="font-serif text-sm font-semibold text-neutral-900">
                        {form.businessName.split(" ")[0] || "Bella Vita"}
                      </span>
                      <div className="flex items-center gap-3 text-[10px] font-sans">
                        <span className="hidden sm:inline text-neutral-700">Home</span>
                        <span className="hidden sm:inline text-neutral-700">Services</span>
                        <span className="hidden sm:inline text-neutral-700">Contact</span>
                        <span
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: form.accentColor }}
                        >
                          Book now
                        </span>
                      </div>
                    </div>

                    {/* Site Hero */}
                    <div className="p-4 grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-7 space-y-1.5">
                        <span
                          className="text-[9px] uppercase tracking-wider font-bold block"
                          style={{ color: form.accentColor }}
                        >
                          {form.businessCategory.toUpperCase()}
                        </span>
                        <h3 className="text-base font-serif font-medium text-neutral-900 leading-snug">
                          {form.headline}
                        </h3>
                        <p className="text-[10px] text-neutral-700 font-sans leading-relaxed line-clamp-2">
                          {form.supportingMessage}
                        </p>
                        <div className="pt-1">
                          <span
                            className="inline-block px-3 py-1 rounded-md text-[10px] font-semibold text-white shadow-2xs font-sans"
                            style={{ backgroundColor: form.accentColor }}
                          >
                            Book an appointment
                          </span>
                        </div>
                      </div>

                      <div className="col-span-5 h-24 rounded-lg overflow-hidden bg-neutral-200 relative">
                        <Image
                          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80"
                          alt="Specialist"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </div>

                    {/* Featured services section */}
                    {form.showFeaturedServices && (
                      <div
                        className="p-3.5 space-y-2 font-sans"
                        style={{ backgroundColor: form.secondaryColor }}
                      >
                        <span className="text-[10px] font-bold text-neutral-900 block font-serif">
                          Find your moment of care
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                          <div className="bg-white/90 p-1.5 rounded border border-black/5">
                            <span className="font-semibold text-neutral-900 block truncate">
                              Signature haircut
                            </span>
                            <span className="text-neutral-500 block text-[8px]">45 min · ₱650</span>
                            <span className="text-[8px] text-[#C35000] font-medium mt-1 block">
                              View service →
                            </span>
                          </div>
                          <div className="bg-white/90 p-1.5 rounded border border-black/5">
                            <span className="font-semibold text-neutral-900 block truncate">
                              Wellness massage
                            </span>
                            <span className="text-neutral-500 block text-[8px]">60 min · ₱1,200</span>
                            <span className="text-[8px] text-[#C35000] font-medium mt-1 block">
                              View service →
                            </span>
                          </div>
                          <div className="bg-white/90 p-1.5 rounded border border-black/5">
                            <span className="font-semibold text-neutral-900 block truncate">
                              Facial treatment
                            </span>
                            <span className="text-neutral-500 block text-[8px]">50 min · ₱950</span>
                            <span className="text-[8px] text-[#C35000] font-medium mt-1 block">
                              View service →
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Site Footer */}
                    <div className="px-4 py-2 border-t border-black/5 flex items-center justify-between text-[9px] text-neutral-600 font-sans">
                      <span>{form.businessName}</span>
                      <span>Powered by Fides</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-1">
                    <CheckIcon className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Only you can see these updates until you publish.</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: BUSINESS INFORMATION
             ========================================================================= */}
          {activeTab === "business-info" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: Public Profile & Contact */}
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">01 · PUBLIC PROFILE</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">
                      Help customers get to know you
                    </h2>
                    <p className="text-xs text-neutral-400">
                      These details appear on your About & contact page.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Business name
                      </label>
                      <input
                        type="text"
                        value={form.businessName}
                        onChange={(e) => handleChange("businessName", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Business category
                      </label>
                      <div className="relative">
                        <select
                          value={form.businessCategory}
                          onChange={(e) => handleChange("businessCategory", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 appearance-none focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                        >
                          <option value="Beauty & wellness">Beauty & wellness</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Fitness">Fitness</option>
                          <option value="Professional services">Professional services</option>
                        </select>
                        <ChevronDownIcon className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        About your business
                      </label>
                      <textarea
                        rows={3}
                        value={form.about}
                        onChange={(e) => handleChange("about", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">02 · CUSTOMER CONTACT</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">
                      Make it easy to reach you
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Use contact details your customers can access.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Business email
                      </label>
                      <input
                        type="email"
                        value={form.businessEmail}
                        onChange={(e) => handleChange("businessEmail", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Phone number
                      </label>
                      <input
                        type="text"
                        value={form.phoneNumber}
                        onChange={(e) => handleChange("phoneNumber", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Instagram profile
                      </label>
                      <input
                        type="text"
                        value={form.instagram}
                        onChange={(e) => handleChange("instagram", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Location & Opening Hours */}
              <div className="space-y-6">
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">03 · LOCATION</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">
                      Where customers can find you
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Shown with your contact details on the website.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">
                        Street address
                      </label>
                      <input
                        type="text"
                        value={form.streetAddress}
                        onChange={(e) => handleChange("streetAddress", e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          City / province
                        </label>
                        <input
                          type="text"
                          value={form.cityProvince}
                          onChange={(e) => handleChange("cityProvince", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Postal code
                        </label>
                        <input
                          type="text"
                          value={form.postalCode}
                          onChange={(e) => handleChange("postalCode", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">04 · OPENING HOURS</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">
                      Set clear expectations
                    </h2>
                    <p className="text-xs text-neutral-400">
                      These are display hours. Appointment availability follows Booking settings.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-[#EDECE8]">
                      <span className="text-neutral-700 font-medium">Monday – Friday</span>
                      <span className="font-semibold text-neutral-900">{form.hoursMonFri}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-[#EDECE8]">
                      <span className="text-neutral-700 font-medium">Saturday</span>
                      <span className="font-semibold text-neutral-900">{form.hoursSat}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-[#EDECE8]">
                      <span className="text-neutral-700 font-medium">Sunday</span>
                      <span className="font-semibold text-neutral-400">{form.hoursSun}</span>
                    </div>

                    <p className="text-[11px] text-neutral-400 pt-1">
                      Time zone · {form.timeZone}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-neutral-800 block">
                        Show opening hours
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Display your weekly hours on the contact page.
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.showOpeningHours}
                      onClick={() => handleChange("showOpeningHours", !form.showOpeningHours)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                        form.showOpeningHours ? "bg-[#C35000]" : "bg-neutral-300"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                          form.showOpeningHours ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: WEBSITE ADDRESS
             ========================================================================= */}
          {activeTab === "website-address" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between border-b border-[#EDECE8] pb-3">
                    <div>
                      <span className="text-xs font-bold text-neutral-400 block">01 · WEBSITE ADDRESS</span>
                      <h2 className="text-sm font-semibold text-neutral-900 mt-1">Your home on the web</h2>
                      <p className="text-xs text-neutral-400">Share this address with customers so they can book directly.</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Live · Secure HTTPS</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#EDECE8] bg-neutral-50/70 p-4 space-y-3">
                    <span className="text-xs font-semibold text-neutral-700 block">Fides website address</span>
                    <div className="flex items-center justify-between bg-white border border-[#EDECE8] rounded-lg px-3 py-2 font-mono text-xs text-neutral-900">
                      <span>{form.subdomain}.fides.app</span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 font-sans"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy link</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsChangeAddressOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#C35000] text-white text-xs font-semibold hover:bg-[#A94400] transition"
                      >
                        Change website address
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsShareModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg border border-[#EDECE8] bg-white text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition"
                      >
                        Share
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400">Use 3–40 lowercase letters, numbers, or hyphens. No spaces.</p>
                  </div>

                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                      <AlertCircleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Changing your address affects shared links</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed pl-6">
                      Your previous URL may stop working. Update social profiles, QR codes, and promotional links before sharing a new address.
                    </p>
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">02 · CUSTOM DOMAIN</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">Bring your own domain</h2>
                    <p className="text-xs text-neutral-400">Connect a domain you already own. Keep the Fides address as a fallback.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Domain name</label>
                    <input
                      type="text"
                      value={form.customDomain}
                      onChange={(e) => handleChange("customDomain", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] font-mono text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-50 border border-[#EDECE8]">
                    <button
                      type="button"
                      onClick={() => setIsConnectDomainOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition"
                    >
                      View connection steps
                    </button>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Pending DNS setup</span>
                    </span>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <span className="text-xs font-bold text-neutral-400 block">CUSTOMER LINK</span>
                  <h3 className="text-sm font-semibold text-neutral-900">One link. A simple way to book.</h3>
                  <div className="rounded-xl border border-[#EDECE8] bg-neutral-50 p-3.5 space-y-1">
                    <span className="text-xs font-bold text-neutral-900 block">{form.businessName}</span>
                    <span className="font-mono text-xs text-neutral-600 block">{form.subdomain}.fides.app</span>
                    <span className="text-[11px] text-neutral-400 block pt-1">Services · Online booking · About & contact</span>
                  </div>

                  <div className="space-y-2 pt-2 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-800 block">Before you make the switch</span>
                    <p>1 Review your new address: choose a memorable name customers can type easily.</p>
                    <p>2 Update your shared links: include social media bios, QR codes, and email signature.</p>
                    <p>3 Check the customer journey: open your website and test booking after publishing.</p>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 4: SEARCH & SHARING
             ========================================================================= */}
          {activeTab === "search-sharing" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">01 · SEARCH LISTING</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">Help the right customers find you</h2>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-700">Page title</label>
                      <span className="text-[11px] text-neutral-400">{form.pageTitle.length} / 60 characters recommended</span>
                    </div>
                    <input
                      type="text"
                      value={form.pageTitle}
                      onChange={(e) => handleChange("pageTitle", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-neutral-700">Meta description</label>
                      <span className="text-[11px] text-neutral-400">{form.metaDescription.length} / 160 characters recommended</span>
                    </div>
                    <textarea
                      rows={3}
                      value={form.metaDescription}
                      onChange={(e) => handleChange("metaDescription", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                    />
                  </div>
                </section>

                <section className="bg-white rounded-2xl border border-[#EDECE8] p-6 shadow-2xs space-y-4">
                  <div className="border-b border-[#EDECE8] pb-3">
                    <span className="text-xs font-bold text-neutral-400 block">02 · SOCIAL SHARING</span>
                    <h2 className="text-sm font-semibold text-neutral-900 mt-1">Look good when your link is shared</h2>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Social preview title</label>
                    <input
                      type="text"
                      value={form.socialTitle}
                      onChange={(e) => handleChange("socialTitle", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Social preview description</label>
                    <textarea
                      rows={2}
                      value={form.socialDescription}
                      onChange={(e) => handleChange("socialDescription", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-50/60 border border-[#EDECE8] text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] transition"
                    />
                  </div>
                </section>
              </div>

              {/* Right: Previews */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-2xl border border-[#EDECE8] p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-neutral-400 block">SEARCH ENGINE RESULT</span>
                  <div className="text-xs text-neutral-800 font-medium">{form.businessName}</div>
                  <div className="text-[11px] text-neutral-400 font-mono">https://{form.subdomain}.fides.app</div>
                  <h4 className="text-sm font-semibold text-blue-700">{form.pageTitle}</h4>
                  <p className="text-xs text-neutral-600 line-clamp-3">{form.metaDescription}</p>
                </div>

                <div className="bg-white rounded-2xl border border-[#EDECE8] overflow-hidden shadow-2xs">
                  <div className="h-32 bg-neutral-200 overflow-hidden relative">
                    <Image
                      src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"
                      alt="Social banner"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-1 bg-neutral-50">
                    <span className="font-mono text-[10px] uppercase font-bold text-neutral-400 block">
                      {form.subdomain.toUpperCase()}.FIDES.APP
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900">{form.socialTitle}</h4>
                    <p className="text-xs text-neutral-500 line-clamp-2">{form.socialDescription}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* STICKY BOTTOM ACTION BAR (Exact match to Screenshot 160436) */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#EDECE8] px-6 sm:px-10 py-3.5 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xs font-semibold text-neutral-900 block">
                Draft · {hasChanges ? "Unpublished changes" : "All changes published"}
              </span>
              <span className="text-[11px] text-neutral-500 hidden sm:block">
                Your current website stays live while you edit.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDiscardOpen(true)}
              disabled={!hasChanges}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                hasChanges
                  ? "border-[#EDECE8] bg-white text-neutral-700 hover:bg-neutral-50"
                  : "border-transparent text-neutral-300 cursor-not-allowed"
              }`}
            >
              Discard changes
            </button>

            <button
              type="button"
              disabled={isSavingDraft}
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-xl border border-[#EDECE8] bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition shadow-2xs disabled:opacity-60"
            >
              {isSavingDraft ? "Saving..." : "Save draft"}
            </button>

            <button
              type="button"
              disabled={isPublishing}
              onClick={() => setIsPublishReviewOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#C35000] hover:bg-[#A94400] text-white text-xs font-semibold transition shadow-xs disabled:opacity-60"
            >
              {isPublishing ? "Publishing..." : "Publish changes"}
            </button>
          </div>
        </div>
      </div>

      {/* ALL MODALS */}
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

      <WaitingDnsModal
        isOpen={isWaitingDnsOpen}
        onClose={() => setIsWaitingDnsOpen(false)}
      />

      <ChangeAddressModal
        isOpen={isChangeAddressOpen}
        onClose={() => setIsChangeAddressOpen(false)}
        currentSubdomain={form.subdomain}
        tenantId={tenantId}
        onConfirm={handleConfirmAddress}
      />

      <AddressUpdatedModal
        isOpen={isAddressUpdatedOpen}
        onClose={() => setIsAddressUpdatedOpen(false)}
        subdomain={form.subdomain}
      />

      <ShareWebsiteModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={`https://${form.subdomain}.fides.app`}
      />

      <PublishReviewModal
        isOpen={isPublishReviewOpen}
        onClose={() => setIsPublishReviewOpen(false)}
        onPublish={handlePublish}
        siteAddress={`${form.subdomain}.fides.app`}
        isPublishing={isPublishing}
        errorMessage={publishError}
      />

      <PublishedModal
        isOpen={isPublishedOpen}
        onClose={() => setIsPublishedOpen(false)}
        siteAddress={`${form.subdomain}.fides.app`}
      />

      <DraftSavedModal
        isOpen={isDraftSavedOpen}
        onClose={() => setIsDraftSavedOpen(false)}
      />

      <DiscardModal
        isOpen={isDiscardOpen}
        onClose={() => setIsDiscardOpen(false)}
        onDiscard={handleDiscard}
      />

      <LivePreviewModal
        isOpen={isLivePreviewOpen}
        onClose={() => setIsLivePreviewOpen(false)}
        data={form}
      />
    </div>
  );
}
