export interface ColorOption {
  name: string;
  hex: string;
}

export type ColorType = "main" | "secondary" | "accent";

export interface WebsiteSettingsData {
  // Brand identity
  businessName: string;
  logoInitials: string;
  logoUrl?: string;
  typography: string;
  mainColor: string;
  secondaryColor: string;
  accentColor: string;

  // Homepage content
  headline: string;
  supportingMessage: string;
  coverPhotoName: string;
  coverPhotoUrl?: string;
  showFeaturedServices: boolean;
  showContactDetails: boolean;

  // Business info & contact
  businessCategory: string;
  about: string;
  businessEmail: string;
  phoneNumber: string;
  instagram: string;

  // Location & hours
  streetAddress: string;
  cityProvince: string;
  postalCode: string;
  hoursMonFri: string;
  hoursSat: string;
  hoursSun: string;
  timeZone: string;
  showOpeningHours: boolean;

  // Website address & domain
  subdomain: string;
  customDomain: string;
  isDomainVerified: boolean;

  // Search & sharing
  pageTitle: string;
  metaDescription: string;
  allowIndexing: boolean;
  socialTitle: string;
  socialDescription: string;
}

export type ActiveTab =
  | "branding"
  | "business-info"
  | "website-address"
  | "search-sharing";
