/**
 * Database typings for the Supabase client.
 *
 * These types mirror the baseline migration in `supabase/migrations`. After any
 * schema change, regenerate them from the running project instead of editing by
 * hand:
 *
 *   supabase gen types typescript --local > src/types/database.types.ts
 *
 * Only the foundational multi-tenant / profile schema is described here; domain
 * tables (services, staff, appointments, resources, inventory) are added with
 * their features.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Platform role assigned to a profile. */
export type AppRole = "admin" | "owner" | "receptionist" | "staff";

/** Lifecycle state of a tenant on the platform. */
export type TenantStatus = "pending" | "active" | "suspended" | "archived";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
};

type TenantMembershipRow = {
  tenant_id: string;
  profile_id: string;
  role: AppRole;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: TenantRow;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: TenantStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: TenantStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: AppRole;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: AppRole;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_memberships: {
        Row: TenantMembershipRow;
        Insert: {
          tenant_id: string;
          profile_id: string;
          role?: AppRole;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          profile_id?: string;
          role?: AppRole;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_tenant_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      tenant_status: TenantStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
