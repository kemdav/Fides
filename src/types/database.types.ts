export type AppRole = "admin" | "owner" | "receptionist" | "staff";
export type TenantStatus = "pending" | "active" | "suspended" | "archived";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "suspended";
export type PlanCode = "starter" | "professional" | "business";
export type ActivityCategory = "verification" | "account" | "pricing";

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
  brand_color: string | null;
  accent_color: string | null;
  secondary_color: string | null;
  address: string | null;
  phone: string | null;
  timezone: string | null;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantMembershipRow = {
  tenant_id: string;
  profile_id: string;
  role: AppRole;
  created_at: string;
};

export type TenantSettingsRow = {
  tenant_id: string;
  display_name: string | null;
  tagline: string | null;
  about: string | null;
  currency: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlanRow = {
  code: string;
  name: string;
  eyebrow: string;
  price_php: number;
  billing_cycle: string;
  staff_limit: number | null;
  location_limit: number | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AccountApplicationRow = {
  id: string;
  reference_code: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  status: ApplicationStatus;
  plan_code: string;
  terms_accepted_at: string;
  consent_accepted_at: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  approved_at: string | null;
  decided_at: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
};

export type RejectedAccountRow = {
  id: string;
  application_id: string | null;
  reference_code: string | null;
  email: string;
  full_name: string;
  owner_legal_name: string | null;
  phone: string | null;
  business_name: string | null;
  business_type: string | null;
  location: string | null;
  plan_code: string | null;
  rejection_reason: string;
  submitted_at: string | null;
  rejected_at: string;
  rejected_by: string;
  email_sent: boolean;
  created_at: string;
};

export type ApplicationIdentityRow = {
  application_id: string;
  owner_legal_name: string;
  date_of_birth: string;
  id_type: string;
  id_document_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationBusinessRow = {
  application_id: string;
  business_name: string;
  business_type: string;
  established_year: number;
  street_address: string;
  city: string;
  province: string;
  zip_code: string;
  logo_path: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PasswordResetCodeRow = {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  reset_token_hash: string | null;
  consumed_at: string | null;
  created_at: string;
};

export type DocumentTypeRow = {
  code: string;
  label: string;
  description: string;
  category: "identity" | "business";
  is_required: boolean;
  sort_order: number;
  created_at: string;
};

export type ApplicationDocumentRow = {
  id: string;
  application_id: string;
  user_id: string | null;
  document_type: string;
  file_name: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

export type AdminActivityRow = {
  id: string;
  application_id: string | null;
  business_name: string;
  actor: string;
  action: string;
  category: ActivityCategory;
  before_value: string;
  after_value: string;
  reason: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      tenants: Table<TenantRow>;
      profiles: Table<ProfileRow>;
      tenant_memberships: Table<TenantMembershipRow>;
      tenant_settings: Table<TenantSettingsRow>;
      subscription_plans: Table<SubscriptionPlanRow>;
      account_applications: Table<AccountApplicationRow>;
      application_identities: Table<ApplicationIdentityRow>;
      application_businesses: Table<ApplicationBusinessRow>;
      password_reset_codes: Table<PasswordResetCodeRow>;
      rejected_accounts: Table<RejectedAccountRow>;
      document_types: Table<DocumentTypeRow>;
      application_documents: Table<ApplicationDocumentRow>;
      admin_activity_log: Table<AdminActivityRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      tenant_status: TenantStatus;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
