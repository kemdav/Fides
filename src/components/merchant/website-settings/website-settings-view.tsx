"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  WebsiteSettingsData,
  ActiveTab,
  ColorType,
  PreviewServiceItem,
} from "./types";
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
import {
  PageContent,
  PageHeading,
  Surface,
} from "@/components/admin/primitives";
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
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from "@/lib/validations/website-settings";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Serif+Display&family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&family=Montserrat:wght@400;500;600;700&family=Mulish:wght@400;500;600;700&family=Ovo&family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap";

const TYPOGRAPHY_FONT_MAP: Record<string, { display: string; body: string }> = {
  "Ovo + Mulish": {
    display: "'Ovo', Georgia, serif",
    body: "'Mulish', system-ui, sans-serif",
  },
  "Playfair + Inter": {
    display: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  "Cormorant + Plus Jakarta Sans": {
    display: "'Cormorant Garamond', Georgia, serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  "DM Serif + Montserrat": {
    display: "'DM Serif Display', Georgia, serif",
    body: "'Montserrat', system-ui, sans-serif",
  },
  "Lora + Source Sans 3": {
    display: "'Lora', Georgia, serif",
    body: "'Source Sans 3', system-ui, sans-serif",
  },
};

function getTypographyFonts(typography: string) {
  return TYPOGRAPHY_FONT_MAP[typography] ?? TYPOGRAPHY_FONT_MAP["Ovo + Mulish"];
}

const TYPOGRAPHY_OPTIONS = [
  { value: "Ovo + Mulish", label: "Ovo + Mulish" },
  { value: "Playfair + Inter", label: "Playfair + Inter" },
  {
    value: "Cormorant + Plus Jakarta Sans",
    label: "Cormorant + Plus Jakarta Sans",
  },
  { value: "DM Serif + Montserrat", label: "DM Serif + Montserrat" },
  { value: "Lora + Source Sans 3", label: "Lora + Source Sans 3" },
];

const BUSINESS_CATEGORY_OPTIONS = [
  { value: "Beauty & wellness", label: "Beauty & wellness" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Fitness", label: "Fitness" },
  { value: "Professional services", label: "Professional services" },
];

const FALLBACK_PREVIEW_SERVICES: PreviewServiceItem[] = [
  {
    id: "fallback-1",
    name: "Signature haircut",
    durationMinutes: 45,
    priceCents: 65000,
  },
  {
    id: "fallback-2",
    name: "Wellness massage",
    durationMinutes: 60,
    priceCents: 120000,
  },
  {
    id: "fallback-3",
    name: "Facial treatment",
    durationMinutes: 50,
    priceCents: 95000,
  },
];

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
  about: "Thoughtful hair, skin, and wellness care in a calm, welcoming space.",
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
  socialImageUrl: "",
  socialImageName: "",
};

// Shared field & section header classes
const fieldInput =
  "h-11 w-full min-w-0 rounded-lg border border-outline bg-white px-3 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30 transition-shadow disabled:bg-mist disabled:text-muted disabled:cursor-not-allowed";

const fieldTextarea =
  "w-full min-w-0 rounded-lg border border-outline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-glyph focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/30 transition-shadow leading-relaxed disabled:bg-mist disabled:text-muted disabled:cursor-not-allowed";

const sectionEyebrow =
  "text-[11px] font-bold uppercase tracking-[0.06em] text-burnt block";

const sectionTitle =
  "text-lg font-semibold tracking-tight text-ink mt-1 leading-snug";

const sectionSubtitle = "text-xs text-muted mt-0.5";

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

function CustomSelect({
  value,
  options,
  disabled = false,
  onChange,
  ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        className={`h-11 w-full min-w-0 rounded-lg border bg-white px-3 text-left text-sm text-ink flex items-center justify-between gap-2 transition-all focus:outline-none disabled:bg-mist disabled:text-muted disabled:cursor-not-allowed ${
          isOpen
            ? "border-burnt ring-2 ring-burnt/20"
            : "border-outline hover:border-ink/40 focus:border-burnt focus:ring-2 focus:ring-burnt/30"
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-glyph transition-transform duration-150 ${
            isOpen ? "rotate-180 text-burnt" : ""
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1.5 rounded-xl border border-hairline bg-white py-1.5 shadow-lg max-h-60 overflow-y-auto"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? "bg-burnt/10 text-burnt font-semibold"
                    : "text-ink hover:bg-mist"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <CheckIcon className="w-4 h-4 shrink-0 text-burnt" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

function ToggleSwitch({
  checked,
  disabled = false,
  onChange,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span
        className={`block h-3.5 w-full rounded-full transition-colors duration-200 ${
          checked ? "bg-neutral-300/80" : "bg-neutral-200"
        }`}
      />
      <span
        className={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full shadow-xs transition-all duration-200 ${
          checked
            ? "translate-x-4 bg-burnt"
            : "translate-x-0 bg-white border border-neutral-300"
        }`}
      />
    </button>
  );
}

interface WebsiteSettingsViewProps {
  initialData?: Partial<WebsiteSettingsData>;
  initialDraft?: Partial<WebsiteSettingsData> | null;
  tenantSlug?: string;
  tenantId?: string;
  basePath?: string;
  canEdit?: boolean;
  previewServices?: PreviewServiceItem[];
  customDomainToken?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

export function WebsiteSettingsView({
  initialData,
  initialDraft = null,
  tenantSlug,
  tenantId,
  basePath,
  canEdit = true,
  previewServices = [],
  customDomainToken,
  userName = "Maria Santos",
  userEmail = "Maria Santos",
  userRole = "Business owner",
}: WebsiteSettingsViewProps) {
  const router = useRouter();

  // Load Google Fonts for all 5 typography pairings once for live preview
  React.useEffect(() => {
    const linkId = "fides-preview-google-fonts";
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  // Live published state
  const [savedSettings, setSavedSettings] = React.useState<WebsiteSettingsData>(
    {
      ...INITIAL_SETTINGS,
      ...(tenantSlug ? { subdomain: tenantSlug } : {}),
      ...initialData,
    },
  );

  // Current draft state (hydrates from saved draft if present)
  const [form, setForm] = React.useState<WebsiteSettingsData>(() => ({
    ...INITIAL_SETTINGS,
    ...(tenantSlug ? { subdomain: tenantSlug } : {}),
    ...initialData,
    ...(initialDraft ?? {}),
  }));
  const [hasSavedDraft, setHasSavedDraft] = React.useState<boolean>(
    Boolean(initialDraft),
  );
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("branding");
  const [previewDevice, setPreviewDevice] = React.useState<
    "desktop" | "mobile"
  >("desktop");

  const hasChanges = React.useMemo(() => {
    return (
      hasSavedDraft || JSON.stringify(form) !== JSON.stringify(savedSettings)
    );
  }, [form, savedSettings, hasSavedDraft]);

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
  const [isUploadingSocial, setIsUploadingSocial] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [saveDraftError, setSaveDraftError] = React.useState<string | null>(
    null,
  );
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement | null>(null);
  const socialInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleChange = <K extends keyof WebsiteSettingsData>(
    key: K,
    val: WebsiteSettingsData[K],
  ) => {
    if (!canEdit) return;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    assetType: "logo" | "cover" | "social",
  ) => {
    if (!canEdit) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed =
      assetType === "logo"
        ? ALLOWED_LOGO_MIME_TYPES
        : assetType === "cover"
          ? ALLOWED_COVER_MIME_TYPES
          : ALLOWED_MIME_TYPES;

    if (!allowed.has(file.type)) {
      const allowedText =
        assetType === "cover"
          ? "PNG, JPEG, or WEBP"
          : "PNG, JPEG, WEBP, or SVG";
      setUploadError(
        `Unsupported file format (${file.type}). Please upload a ${allowedText}.`,
      );
      event.target.value = "";
      return;
    }

    const maxBytes = MAX_FILE_SIZES[assetType];
    if (file.size > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      setUploadError(
        `File is too large. Maximum allowed size for ${assetType} is ${maxMb} MB.`,
      );
      event.target.value = "";
      return;
    }

    if (assetType === "logo") setIsUploadingLogo(true);
    else if (assetType === "cover") setIsUploadingCover(true);
    else setIsUploadingSocial(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);

      const res = await uploadTenantMediaAction(formData, tenantId);
      if (res.success && res.data) {
        if (assetType === "logo") {
          handleChange("logoUrl", res.data.url);
        } else if (assetType === "cover") {
          handleChange("coverPhotoName", res.data.filename);
          handleChange("coverPhotoUrl", res.data.url);
        } else {
          handleChange("socialImageName", res.data.filename);
          handleChange("socialImageUrl", res.data.url);
        }
      } else if (!res.success) {
        setUploadError(res.error || "Upload failed");
      }
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload file",
      );
    } finally {
      if (assetType === "logo") setIsUploadingLogo(false);
      else if (assetType === "cover") setIsUploadingCover(false);
      else setIsUploadingSocial(false);
      event.target.value = "";
    }
  };

  const handleApplyColor = (type: ColorType, hex: string) => {
    if (type === "main") handleChange("mainColor", hex);
    if (type === "secondary") handleChange("secondaryColor", hex);
    if (type === "accent") handleChange("accentColor", hex);
  };

  const handleConfirmAddress = (newSubdomain: string) => {
    setForm((prev) => ({ ...prev, subdomain: newSubdomain }));
    setSavedSettings((prev) => ({ ...prev, subdomain: newSubdomain }));
    setIsChangeAddressOpen(false);
    setIsAddressUpdatedOpen(true);
  };

  const handleCloseAddressUpdated = () => {
    setIsAddressUpdatedOpen(false);
    if (tenantSlug && form.subdomain !== tenantSlug) {
      router.replace(`/${form.subdomain}/dashboard/settings/website`);
    }
  };

  const handleCopyLink = () => {
    const url = `https://${form.subdomain}.fides.app`;
    navigator.clipboard?.writeText(url);
    setLinkCopiedToast(true);
    setTimeout(() => setLinkCopiedToast(false), 2200);
  };

  const handleSaveDraft = async () => {
    if (!canEdit) return;
    setIsSavingDraft(true);
    setSaveDraftError(null);
    try {
      const res = await saveWebsiteDraftAction(form, tenantId);
      if (!res.success) {
        setSaveDraftError(res.error || "Failed to save draft.");
        return;
      }
      setHasSavedDraft(true);
      setIsDraftSavedOpen(true);
    } catch (err: unknown) {
      setSaveDraftError(
        err instanceof Error ? err.message : "Failed to save draft.",
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!canEdit) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const res = await publishWebsiteSettingsAction(form, tenantId);
      if (!res.success) {
        setPublishError(res.error || "Failed to publish settings.");
        return;
      }
      setSavedSettings(form);
      setHasSavedDraft(false);
      setIsPublishReviewOpen(false);
      setIsPublishedOpen(true);
    } catch (err: unknown) {
      setPublishError(
        err instanceof Error ? err.message : "Failed to publish settings.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClosePublished = () => {
    setIsPublishedOpen(false);
    if (tenantSlug && form.subdomain !== tenantSlug) {
      router.replace(`/${form.subdomain}/dashboard/settings/website`);
    }
  };

  const handleDiscard = async () => {
    if (!canEdit) return;
    setForm(savedSettings);
    setHasSavedDraft(false);
    await discardWebsiteDraftAction(tenantId);
    setIsDiscardOpen(false);
  };

  const displayedPreviewServices =
    previewServices.length > 0 ? previewServices : FALLBACK_PREVIEW_SERVICES;

  const resolvedCoverImage = form.coverPhotoUrl || DEFAULT_COVER_IMAGE;
  const resolvedSocialImage = form.socialImageUrl || resolvedCoverImage;
  const isMobilePreview = previewDevice === "mobile";
  const previewFonts = getTypographyFonts(form.typography);

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: "branding", label: "Branding & homepage" },
    { id: "business-info", label: "Business information" },
    { id: "website-address", label: "Website address" },
    { id: "search-sharing", label: "Search & sharing" },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Toast notifications */}
      {linkCopiedToast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-ink text-white px-4 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 text-xs font-medium max-w-md">
          <CheckIcon className="w-4 h-4 shrink-0 text-mint" />
          <span>Website link copied to clipboard</span>
        </div>
      )}

      {uploadError && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-danger text-white px-4 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 text-xs font-medium max-w-md">
          <AlertCircleIcon className="w-4 h-4 shrink-0 text-white" />
          <span className="flex-1 min-w-0 break-words">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-2 shrink-0 font-bold hover:opacity-80"
          >
            ×
          </button>
        </div>
      )}

      {saveDraftError && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 bg-danger text-white px-4 py-2.5 rounded-[10px] shadow-xl flex items-center gap-2 text-xs font-medium max-w-md">
          <AlertCircleIcon className="w-4 h-4 shrink-0 text-white" />
          <span className="flex-1 min-w-0 break-words">{saveDraftError}</span>
          <button
            type="button"
            onClick={() => setSaveDraftError(null)}
            className="ml-2 shrink-0 font-bold hover:opacity-80"
          >
            ×
          </button>
        </div>
      )}

      {/* Sidebar */}
      <MerchantSidebar
        businessName={
          savedSettings.businessName || form.businessName || "Bella Vita"
        }
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        basePath={basePath ?? (tenantSlug ? `/${tenantSlug}` : "")}
      />

      {/* Main content */}
      <div className="flex-1 flex min-w-0 flex-col overflow-x-hidden lg:h-dvh lg:overflow-y-auto">
        <PageContent>
          {/* Page Heading */}
          <PageHeading
            title="Website Settings"
            description="Set your logo, colors and homepage content. Preview your changes before publishing."
            actions={
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-wash px-2.5 py-1 text-xs font-semibold leading-[18px] text-success whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Website is live
                </span>
                <AdminButton
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLivePreviewOpen(true)}
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  Preview website
                </AdminButton>
              </div>
            }
          />

          {/* Staff View-Only Banner */}
          {!canEdit && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2.5">
              <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div className="min-w-0">
                <p className="font-semibold">View-only access</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Only business owners can edit or publish website settings. You
                  can still review configurations and preview the website.
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="-mt-1 border-b border-hairline">
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto text-sm font-medium">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none ${
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
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 2xl:gap-6 items-start">
              {/* Left: Form controls */}
              <div className="xl:col-span-7 min-w-0 space-y-5">
                {/* 01 Brand identity */}
                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>01 · BRAND IDENTITY</span>
                    <h2 className={sectionTitle}>Brand identity</h2>
                    <p className={sectionSubtitle}>
                      Visible across your website.
                    </p>
                  </div>

                  {/* Logo, Display Name, Typography */}
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    {/* Business logo */}
                    <div className="shrink-0">
                      <span className="block text-xs font-semibold text-ink mb-1.5">
                        Business logo
                      </span>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={!canEdit}
                        onChange={(e) => handleFileUpload(e, "logo")}
                      />
                      <div className="w-16 h-16 rounded-xl bg-powder border border-hairline flex items-center justify-center font-display text-2xl font-bold text-burnt shadow-sm overflow-hidden relative">
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
                      <span className="block text-[10px] text-subtle mt-1 whitespace-nowrap">
                        PNG or SVG · 2 MB
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          disabled={!canEdit || isUploadingLogo}
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs font-semibold text-burnt hover:text-burnt-dark underline whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUploadingLogo ? "Uploading..." : "Replace logo"}
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            const val =
                              prompt(
                                "Logo initials (1-3 letters):",
                                form.logoInitials,
                              ) || form.logoInitials;
                            handleChange(
                              "logoInitials",
                              val.toUpperCase().slice(0, 3),
                            );
                          }}
                          className="text-[11px] text-muted hover:text-ink underline whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Initials
                        </button>
                      </div>
                    </div>

                    {/* Display name & Typography */}
                    <div className="flex-1 min-w-0 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-ink mb-1.5">
                          Business display name
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={form.businessName}
                          onChange={(e) =>
                            handleChange("businessName", e.target.value)
                          }
                          className={fieldInput}
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-ink mb-1.5">
                          Website typography
                        </label>
                        <CustomSelect
                          ariaLabel="Website typography"
                          value={form.typography}
                          options={TYPOGRAPHY_OPTIONS}
                          disabled={!canEdit}
                          onChange={(val) => handleChange("typography", val)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Website color palette */}
                  <div className="pt-1">
                    <span className="block text-xs font-semibold text-ink mb-2">
                      Website color palette
                    </span>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-3">
                      {(["main", "secondary", "accent"] as ColorType[]).map(
                        (type) => {
                          const labels = {
                            main: "Main",
                            secondary: "Secondary",
                            accent: "Accent",
                          };
                          const descs = {
                            main: "Backgrounds",
                            secondary: "Sections & cards",
                            accent: "Buttons & links",
                          };
                          const percents = {
                            main: "60%",
                            secondary: "30%",
                            accent: "10%",
                          };
                          const color =
                            type === "main"
                              ? form.mainColor
                              : type === "secondary"
                                ? form.secondaryColor
                                : form.accentColor;
                          return (
                            <button
                              key={type}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setActiveColorPicker(type)}
                              className="p-3 rounded-[10px] border border-hairline bg-white hover:border-outline transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="font-semibold text-ink">
                                  {labels[type]}
                                </span>
                                <span className="text-[10px] text-subtle">
                                  {percents[type]}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 p-1 rounded-lg bg-mist border border-hairline">
                                <span
                                  className="w-5 h-5 rounded border border-black/10 shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-mono text-xs uppercase font-medium text-body truncate">
                                  {color}
                                </span>
                              </div>
                              <span className="block text-[10px] text-subtle mt-1.5">
                                {descs[type]}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden flex my-3 border border-black/5">
                      <div
                        style={{
                          width: "60%",
                          backgroundColor: form.mainColor,
                        }}
                      />
                      <div
                        style={{
                          width: "30%",
                          backgroundColor: form.secondaryColor,
                        }}
                      />
                      <div
                        style={{
                          width: "10%",
                          backgroundColor: form.accentColor,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Use 60% Main for backgrounds, 30% Secondary for supporting
                      sections, and 10% Accent for key actions.
                    </p>
                  </div>
                </Surface>

                {/* 02 Homepage content */}
                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>
                      02 · HOMEPAGE CONTENT
                    </span>
                    <h2 className={sectionTitle}>Make it feel like you</h2>
                    <p className={sectionSubtitle}>
                      Set the headline, supporting message, and hero imagery on
                      your storefront.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Headline
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={form.headline}
                      onChange={(e) => handleChange("headline", e.target.value)}
                      className={fieldInput}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Supporting message
                    </label>
                    <textarea
                      rows={2}
                      disabled={!canEdit}
                      value={form.supportingMessage}
                      onChange={(e) =>
                        handleChange("supportingMessage", e.target.value)
                      }
                      className={fieldTextarea}
                    />
                  </div>

                  <div className="pt-1 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Cover photo */}
                    <div className="md:col-span-5 flex items-center gap-3 min-w-0">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={!canEdit}
                        onChange={(e) => handleFileUpload(e, "cover")}
                      />
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-mist border border-hairline shrink-0 relative">
                        <Image
                          src={resolvedCoverImage}
                          alt="Cover"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="text-xs min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-ink">
                            Cover photo
                          </span>
                          <button
                            type="button"
                            disabled={!canEdit || isUploadingCover}
                            onClick={() => coverInputRef.current?.click()}
                            className="text-burnt hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isUploadingCover ? "Uploading..." : "Change"}
                          </button>
                        </div>
                        <span className="text-muted block truncate">
                          {form.coverPhotoName}
                        </span>
                        <span className="text-subtle text-[10px] block">
                          Recommended: 1600 × 900
                        </span>
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="md:col-span-7 space-y-3 min-w-0">
                      {[
                        {
                          key: "showFeaturedServices" as const,
                          label: "Show featured services",
                          desc: "Help visitors find their next appointment.",
                        },
                        {
                          key: "showContactDetails" as const,
                          label: "Show contact details",
                          desc: "Display your business email and phone.",
                        },
                      ].map(({ key, label, desc }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-ink block">
                              {label}
                            </span>
                            <span className="text-[11px] text-muted block">
                              {desc}
                            </span>
                          </div>
                          <ToggleSwitch
                            checked={form[key]}
                            disabled={!canEdit}
                            ariaLabel={label}
                            onChange={() => handleChange(key, !form[key])}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Surface>
              </div>

              {/* Right: Website Preview */}
              <div className="xl:col-span-5 xl:sticky xl:top-6 min-w-0 space-y-4">
                <Surface className="space-y-4">
                  {/* Preview header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <div className="flex items-center gap-2">
                      <Icon name="settings" className="size-4 text-glyph" />
                      <span className="text-xs font-semibold text-ink">
                        Website preview
                      </span>
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
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="w-3.5 h-3.5"
                              >
                                <rect
                                  x="2"
                                  y="3"
                                  width="20"
                                  height="14"
                                  rx="2"
                                />
                                <line x1="12" y1="17" x2="12" y2="21" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                              </svg>
                            ) : (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="w-3.5 h-3.5"
                              >
                                <rect
                                  x="5"
                                  y="2"
                                  width="14"
                                  height="20"
                                  rx="2"
                                />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                      <span className="inline-flex items-center rounded-md bg-warn-bg px-2 py-1 text-xs font-semibold leading-[18px] text-warn-fg whitespace-nowrap">
                        Draft preview
                      </span>
                    </div>
                  </div>

                  {/* Browser URL bar */}
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-mist border border-hairline text-xs font-mono text-body">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-3.5 h-3.5 text-glyph shrink-0"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span className="truncate">
                        {form.subdomain}.fides.app
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLivePreviewOpen(true)}
                      className="text-glyph hover:text-ink shrink-0 transition-colors"
                      aria-label="Open in full preview"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="w-3.5 h-3.5"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </div>

                  {/* Scaled preview frame */}
                  <div
                    className={`rounded-xl border border-black/5 overflow-hidden transition-all duration-200 ${
                      isMobilePreview
                        ? "max-w-[290px] mx-auto shadow-md"
                        : "w-full"
                    }`}
                    style={{
                      backgroundColor: form.mainColor,
                      fontFamily: previewFonts.body,
                    }}
                  >
                    <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-black/5 bg-white/40">
                      <span
                        className="text-sm font-semibold text-ink truncate min-w-0"
                        style={{ fontFamily: previewFonts.display }}
                      >
                        {form.businessName || "Bella Vita"}
                      </span>
                      <div className="flex items-center gap-2.5 text-[10px] shrink-0">
                        {!isMobilePreview && (
                          <>
                            <span className="hidden sm:inline text-body">
                              Home
                            </span>
                            <span className="hidden sm:inline text-body">
                              Services
                            </span>
                            <span className="hidden sm:inline text-body">
                              Contact
                            </span>
                          </>
                        )}
                        <span
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                          style={{ backgroundColor: form.accentColor }}
                        >
                          Book now
                        </span>
                      </div>
                    </div>

                    <div
                      className={`p-4 grid gap-3 items-center ${
                        isMobilePreview
                          ? "grid-cols-1"
                          : "grid-cols-1 sm:grid-cols-12"
                      }`}
                    >
                      <div
                        className={`${
                          isMobilePreview ? "" : "sm:col-span-7"
                        } space-y-1.5 min-w-0`}
                      >
                        <span
                          className="text-[9px] uppercase tracking-wider font-bold block truncate"
                          style={{ color: form.accentColor }}
                        >
                          {form.businessCategory.toUpperCase()}
                        </span>
                        <h3
                          className="text-base font-medium text-ink leading-snug break-words"
                          style={{ fontFamily: previewFonts.display }}
                        >
                          {form.headline}
                        </h3>
                        <p className="text-[10px] text-body leading-relaxed line-clamp-2">
                          {form.supportingMessage}
                        </p>
                        <div className="pt-1">
                          <span
                            className="inline-block px-3 py-1 rounded-md text-[10px] font-semibold text-white shadow-sm"
                            style={{ backgroundColor: form.accentColor }}
                          >
                            Book an appointment
                          </span>
                        </div>
                      </div>
                      <div
                        className={`${
                          isMobilePreview
                            ? "h-32"
                            : "sm:col-span-5 h-28 sm:h-24"
                        } w-full rounded-lg overflow-hidden bg-mist relative`}
                      >
                        <Image
                          src={resolvedCoverImage}
                          alt="Specialist"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    </div>

                    {form.showFeaturedServices && (
                      <div
                        className="p-3.5 space-y-2"
                        style={{ backgroundColor: form.secondaryColor }}
                      >
                        <span
                          className="text-[11px] font-semibold text-ink block"
                          style={{ fontFamily: previewFonts.display }}
                        >
                          Find your moment of care
                        </span>
                        <div
                          className={`grid gap-1.5 text-[9px] ${
                            isMobilePreview
                              ? "grid-cols-1"
                              : "grid-cols-1 sm:grid-cols-3"
                          }`}
                        >
                          {displayedPreviewServices.slice(0, 3).map((svc) => {
                            const formattedPrice = `₱${Math.round(
                              svc.priceCents / 100,
                            ).toLocaleString("en-PH")}`;
                            return (
                              <div
                                key={svc.id}
                                className="bg-white/90 p-2 rounded border border-black/5 min-w-0"
                              >
                                <span className="font-semibold text-ink block truncate">
                                  {svc.name}
                                </span>
                                <span className="text-muted block text-[8px] truncate">
                                  {svc.durationMinutes} min · {formattedPrice}
                                </span>
                                <span
                                  className="text-[8px] font-medium mt-1 block"
                                  style={{ color: form.accentColor }}
                                >
                                  View service →
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-2 border-t border-black/5 flex flex-wrap items-center justify-between gap-2 text-[9px] text-muted">
                      <span className="truncate">{form.businessName}</span>
                      <span className="shrink-0">Powered by Fides</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted flex items-center gap-1.5 pt-1">
                    <CheckIcon className="w-3.5 h-3.5 shrink-0 text-glyph" />
                    <span>
                      Only you can see these updates until you publish.
                    </span>
                  </p>
                </Surface>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB 2: BUSINESS INFORMATION
             ====================================================================== */}
          {activeTab === "business-info" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {/* Left: Public Profile & Contact */}
              <div className="min-w-0 space-y-5">
                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>01 · PUBLIC PROFILE</span>
                    <h2 className={sectionTitle}>
                      Help customers get to know you
                    </h2>
                    <p className={sectionSubtitle}>
                      These details appear on your About &amp; contact page.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        Business name
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={form.businessName}
                        onChange={(e) =>
                          handleChange("businessName", e.target.value)
                        }
                        className={fieldInput}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        Business category
                      </label>
                      <CustomSelect
                        ariaLabel="Business category"
                        value={form.businessCategory}
                        options={BUSINESS_CATEGORY_OPTIONS}
                        disabled={!canEdit}
                        onChange={(val) =>
                          handleChange("businessCategory", val)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        About your business
                      </label>
                      <textarea
                        rows={3}
                        disabled={!canEdit}
                        value={form.about}
                        onChange={(e) => handleChange("about", e.target.value)}
                        className={fieldTextarea}
                      />
                    </div>
                  </div>
                </Surface>

                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>
                      02 · CUSTOMER CONTACT
                    </span>
                    <h2 className={sectionTitle}>Make it easy to reach you</h2>
                    <p className={sectionSubtitle}>
                      Use contact details your customers can access.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-ink mb-1.5">
                          Business email
                        </label>
                        <input
                          type="email"
                          disabled={!canEdit}
                          value={form.businessEmail}
                          onChange={(e) =>
                            handleChange("businessEmail", e.target.value)
                          }
                          className={fieldInput}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-ink mb-1.5">
                          Phone number
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={form.phoneNumber}
                          onChange={(e) =>
                            handleChange("phoneNumber", e.target.value)
                          }
                          className={fieldInput}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        Instagram profile
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={form.instagram}
                        onChange={(e) =>
                          handleChange("instagram", e.target.value)
                        }
                        className={fieldInput}
                      />
                    </div>
                  </div>
                </Surface>
              </div>

              {/* Right: Location & Opening Hours */}
              <div className="min-w-0 space-y-5">
                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>03 · LOCATION</span>
                    <h2 className={sectionTitle}>
                      Where customers can find you
                    </h2>
                    <p className={sectionSubtitle}>
                      Shown with your contact details on the website.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">
                        Street address
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={form.streetAddress}
                        onChange={(e) =>
                          handleChange("streetAddress", e.target.value)
                        }
                        className={fieldInput}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-ink mb-1.5">
                          City / province
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={form.cityProvince}
                          onChange={(e) =>
                            handleChange("cityProvince", e.target.value)
                          }
                          className={fieldInput}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block text-xs font-semibold text-ink mb-1.5">
                          Postal code
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={form.postalCode}
                          onChange={(e) =>
                            handleChange("postalCode", e.target.value)
                          }
                          className={fieldInput}
                        />
                      </div>
                    </div>
                  </div>
                </Surface>

                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>04 · OPENING HOURS</span>
                    <h2 className={sectionTitle}>Set clear expectations</h2>
                    <p className={sectionSubtitle}>
                      These are display hours. Appointment availability follows
                      Booking settings.
                    </p>
                  </div>
                  <div className="divide-y divide-hairline text-sm">
                    {[
                      { label: "Monday – Friday", value: form.hoursMonFri },
                      { label: "Saturday", value: form.hoursSat },
                      { label: "Sunday", value: form.hoursSun },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0"
                      >
                        <span className="font-semibold text-ink">{label}</span>
                        <span className="text-muted">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-hairline pt-3 space-y-3">
                    <p className="text-xs text-muted">
                      Time zone · {form.timeZone}
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-ink block">
                          Show opening hours
                        </span>
                        <span className="text-xs text-muted block">
                          Display your weekly hours on the contact page.
                        </span>
                      </div>
                      <ToggleSwitch
                        checked={form.showOpeningHours}
                        disabled={!canEdit}
                        ariaLabel="Show opening hours"
                        onChange={() =>
                          handleChange(
                            "showOpeningHours",
                            !form.showOpeningHours,
                          )
                        }
                      />
                    </div>
                  </div>
                </Surface>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB 3: WEBSITE ADDRESS
             ====================================================================== */}
          {activeTab === "website-address" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 min-w-0 space-y-5">
                <Surface className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={sectionEyebrow}>
                        01 · WEBSITE ADDRESS
                      </span>
                      <h2 className={sectionTitle}>Your home on the web</h2>
                      <p className={sectionSubtitle}>
                        Share this address with customers so they can book
                        directly.
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-wash px-2 py-1 text-xs font-semibold leading-[18px] text-success whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                      Live · Secure HTTPS
                    </span>
                  </div>

                  <div className="rounded-lg border border-hairline bg-mist p-4 space-y-3">
                    <span className="text-xs font-semibold text-ink block">
                      Fides website address
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-sm text-ink">
                      <span className="truncate min-w-0">
                        {form.subdomain}.fides.app
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 shrink-0 text-xs text-muted hover:text-ink font-sans transition-colors"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                        <span>Copy link</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <AdminButton
                        variant="primary"
                        size="xs"
                        disabled={!canEdit}
                        onClick={() => setIsChangeAddressOpen(true)}
                      >
                        Change website address
                      </AdminButton>
                      <AdminButton
                        variant="outline"
                        size="xs"
                        onClick={() => setIsShareModalOpen(true)}
                      >
                        Share
                      </AdminButton>
                    </div>
                    <p className="text-xs text-muted">
                      Use 3–40 lowercase letters, numbers, or hyphens. No
                      spaces.
                    </p>
                  </div>

                  <div className="rounded-lg bg-warn-bg border border-warn-bg p-4 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-warn-fg">
                      <AlertCircleIcon className="w-4 h-4 shrink-0" />
                      <span>Changing your address affects shared links</span>
                    </div>
                    <p className="text-sm text-warn-fg leading-relaxed pl-6">
                      Your previous URL may stop working. Update social
                      profiles, QR codes, and promotional links before sharing a
                      new address.
                    </p>
                  </div>
                </Surface>

                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>02 · CUSTOM DOMAIN</span>
                    <h2 className={sectionTitle}>Bring your own domain</h2>
                    <p className={sectionSubtitle}>
                      Connect a domain you already own. Keep the Fides address
                      as a fallback.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Domain name
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={form.customDomain}
                      onChange={(e) =>
                        handleChange("customDomain", e.target.value)
                      }
                      className={`${fieldInput} font-mono`}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg bg-mist border border-hairline">
                    <AdminButton
                      variant="primary"
                      size="xs"
                      disabled={!canEdit}
                      onClick={() => setIsConnectDomainOpen(true)}
                    >
                      View connection steps
                    </AdminButton>
                    {form.isDomainVerified ? (
                      <span className="inline-flex items-center rounded-md bg-wash px-2 py-1 text-xs font-semibold leading-[18px] text-success whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                        Connected · Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-warn-bg px-2 py-1 text-xs font-semibold leading-[18px] text-warn-fg whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-warn-fg mr-1.5" />
                        Pending DNS setup
                      </span>
                    )}
                  </div>
                </Surface>
              </div>

              <div className="xl:col-span-5 min-w-0 space-y-4">
                <Surface className="space-y-4">
                  <div>
                    <span className={sectionEyebrow}>CUSTOMER LINK</span>
                    <h3 className={sectionTitle}>
                      One link. A simple way to book.
                    </h3>
                  </div>
                  <div className="rounded-lg border border-hairline bg-mist p-4 space-y-1">
                    <span className="text-sm font-bold text-ink block break-words">
                      {form.businessName}
                    </span>
                    <span className="font-mono text-xs text-muted block break-all">
                      {form.subdomain}.fides.app
                    </span>
                    <span className="text-xs text-subtle block pt-1">
                      Services · Online booking · About &amp; contact
                    </span>
                  </div>
                  <div className="space-y-2 pt-1 text-sm text-muted">
                    <span className="font-semibold text-ink block">
                      Before you make the switch
                    </span>
                    <p>
                      1 Review your new address: choose a memorable name
                      customers can type easily.
                    </p>
                    <p>
                      2 Update your shared links: include social media bios, QR
                      codes, and email signature.
                    </p>
                    <p>
                      3 Check the customer journey: open your website and test
                      booking after publishing.
                    </p>
                  </div>
                </Surface>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB 4: SEARCH & SHARING
             ====================================================================== */}
          {activeTab === "search-sharing" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 min-w-0 space-y-5">
                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>01 · SEARCH LISTING</span>
                    <h2 className={sectionTitle}>
                      Help the right customers find you
                    </h2>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <label className="text-xs font-semibold text-ink">
                        Page title
                      </label>
                      <span className="text-xs text-muted">
                        {form.pageTitle.length} / 60 characters recommended
                      </span>
                    </div>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={form.pageTitle}
                      onChange={(e) =>
                        handleChange("pageTitle", e.target.value)
                      }
                      className={fieldInput}
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <label className="text-xs font-semibold text-ink">
                        Meta description
                      </label>
                      <span className="text-xs text-muted">
                        {form.metaDescription.length} / 160 characters
                        recommended
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      disabled={!canEdit}
                      value={form.metaDescription}
                      onChange={(e) =>
                        handleChange("metaDescription", e.target.value)
                      }
                      className={fieldTextarea}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-hairline">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink">
                        Allow search engine indexing
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Search engines may take time to reflect published
                        changes.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={form.allowIndexing}
                      disabled={!canEdit}
                      ariaLabel="Allow search engine indexing"
                      onChange={() =>
                        handleChange("allowIndexing", !form.allowIndexing)
                      }
                    />
                  </div>
                </Surface>

                <Surface className="space-y-5">
                  <div>
                    <span className={sectionEyebrow}>02 · SOCIAL SHARING</span>
                    <h2 className={sectionTitle}>
                      Look good when your link is shared
                    </h2>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Social preview title
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={form.socialTitle}
                      onChange={(e) =>
                        handleChange("socialTitle", e.target.value)
                      }
                      className={fieldInput}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">
                      Social preview description
                    </label>
                    <textarea
                      rows={2}
                      disabled={!canEdit}
                      value={form.socialDescription}
                      onChange={(e) =>
                        handleChange("socialDescription", e.target.value)
                      }
                      className={fieldTextarea}
                    />
                  </div>
                  <div className="pt-2 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
                    <input
                      ref={socialInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={!canEdit}
                      onChange={(e) => handleFileUpload(e, "social")}
                    />
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-hairline bg-mist">
                        <Image
                          src={resolvedSocialImage}
                          alt="Social preview thumbnail"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">
                          {form.socialImageUrl
                            ? form.socialImageName || "Custom social image"
                            : "Using your homepage cover photo"}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          Recommended social image size: 1200 × 630
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {form.socialImageUrl && canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            handleChange("socialImageUrl", "");
                            handleChange("socialImageName", "");
                          }}
                          className="text-xs text-muted hover:text-ink underline"
                        >
                          Use cover
                        </button>
                      )}
                      <AdminButton
                        variant="outline"
                        size="xs"
                        type="button"
                        disabled={!canEdit || isUploadingSocial}
                        onClick={() => socialInputRef.current?.click()}
                      >
                        {isUploadingSocial ? "Uploading..." : "Change image"}
                      </AdminButton>
                    </div>
                  </div>
                </Surface>
              </div>

              {/* Right: Previews */}
              <div className="xl:col-span-5 xl:sticky xl:top-6 min-w-0 space-y-4">
                <Surface className="space-y-3">
                  <span className={sectionEyebrow}>SEARCH ENGINE RESULT</span>
                  <div className="text-sm text-ink font-medium break-words">
                    {form.businessName}
                  </div>
                  <div className="text-xs text-subtle font-mono break-all">
                    https://{form.subdomain}.fides.app
                  </div>
                  <h4 className="text-sm font-semibold text-info break-words">
                    {form.pageTitle}
                  </h4>
                  <p className="text-sm text-muted line-clamp-3 break-words">
                    {form.metaDescription}
                  </p>
                </Surface>

                <Surface className="overflow-hidden !p-0">
                  <div className="h-36 sm:h-40 bg-mist overflow-hidden relative">
                    <Image
                      src={resolvedSocialImage}
                      alt="Social banner"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4 space-y-1 bg-mist">
                    <span className="font-mono text-[10px] uppercase font-bold text-subtle block break-all">
                      {form.subdomain.toUpperCase()}.FIDES.APP
                    </span>
                    <h4 className="text-sm font-bold text-ink break-words">
                      {form.socialTitle}
                    </h4>
                    <p className="text-sm text-muted line-clamp-2 break-words">
                      {form.socialDescription}
                    </p>
                    <p className="text-[11px] text-subtle pt-1">
                      Preview appearance may vary by platform. Existing shares
                      can keep a cached preview.
                    </p>
                  </div>
                </Surface>
              </div>
            </div>
          )}
        </PageContent>

        {/* Sticky bottom action bar */}
        {canEdit && (
          <div className="sticky bottom-0 z-30 mt-auto bg-white/95 backdrop-blur-md border-t border-hairline px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <span className="text-sm font-semibold text-ink block">
                Draft ·{" "}
                {hasChanges ? "Unpublished changes" : "All changes published"}
              </span>
              <span className="text-xs text-muted hidden sm:block">
                Your current website stays live while you edit.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
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
        )}
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
        isOpen={canEdit && activeColorPicker !== null}
        onClose={() => setActiveColorPicker(null)}
        onApply={handleApplyColor}
      />
      <ConnectDomainModal
        isOpen={canEdit && isConnectDomainOpen}
        onClose={() => setIsConnectDomainOpen(false)}
        domainName={form.customDomain}
        verificationToken={
          customDomainToken ||
          `fides-verify=${(tenantId || form.subdomain).slice(0, 12)}`
        }
        tenantId={tenantId}
        onVerified={() => handleChange("isDomainVerified", true)}
        onCheckStatus={() => setIsWaitingDnsOpen(true)}
      />
      <WaitingDnsModal
        isOpen={isWaitingDnsOpen}
        onClose={() => setIsWaitingDnsOpen(false)}
      />
      <ChangeAddressModal
        isOpen={canEdit && isChangeAddressOpen}
        onClose={() => setIsChangeAddressOpen(false)}
        currentSubdomain={form.subdomain}
        tenantId={tenantId}
        onConfirm={handleConfirmAddress}
      />
      <AddressUpdatedModal
        isOpen={isAddressUpdatedOpen}
        onClose={handleCloseAddressUpdated}
        subdomain={form.subdomain}
      />
      <ShareWebsiteModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={`https://${form.subdomain}.fides.app`}
      />
      <PublishReviewModal
        isOpen={canEdit && isPublishReviewOpen}
        onClose={() => setIsPublishReviewOpen(false)}
        onPublish={handlePublish}
        siteAddress={`${form.subdomain}.fides.app`}
        isPublishing={isPublishing}
        errorMessage={publishError}
      />
      <PublishedModal
        isOpen={isPublishedOpen}
        onClose={handleClosePublished}
        siteAddress={`${form.subdomain}.fides.app`}
      />
      <DraftSavedModal
        isOpen={isDraftSavedOpen}
        onClose={() => setIsDraftSavedOpen(false)}
      />
      <DiscardModal
        isOpen={canEdit && isDiscardOpen}
        onClose={() => setIsDiscardOpen(false)}
        onDiscard={handleDiscard}
      />
      <LivePreviewModal
        isOpen={isLivePreviewOpen}
        onClose={() => setIsLivePreviewOpen(false)}
        data={form}
        services={previewServices}
      />
    </div>
  );
}
