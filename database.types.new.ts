export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_applications: {
        Row: {
          approved_at: string | null
          consent_accepted_at: string
          created_at: string
          decided_at: string | null
          email: string
          full_name: string
          id: string
          phone: string
          plan_code: string
          reference_code: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string
          tenant_id: string | null
          terms_accepted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          consent_accepted_at: string
          created_at?: string
          decided_at?: string | null
          email: string
          full_name: string
          id?: string
          phone: string
          plan_code: string
          reference_code?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          tenant_id?: string | null
          terms_accepted_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          consent_accepted_at?: string
          created_at?: string
          decided_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          plan_code?: string
          reference_code?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string
          tenant_id?: string | null
          terms_accepted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_applications_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "account_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_log: {
        Row: {
          action: string
          actor: string
          after_value: string
          application_id: string | null
          before_value: string
          business_name: string
          category: string
          created_at: string
          id: string
          reason: string
        }
        Insert: {
          action: string
          actor?: string
          after_value?: string
          application_id?: string | null
          before_value?: string
          business_name: string
          category: string
          created_at?: string
          id?: string
          reason?: string
        }
        Update: {
          action?: string
          actor?: string
          after_value?: string
          application_id?: string | null
          before_value?: string
          business_name?: string
          category?: string
          created_at?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "account_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_businesses: {
        Row: {
          application_id: string
          business_name: string
          business_type: string
          city: string
          created_at: string
          established_year: number
          logo_path: string | null
          logo_url: string | null
          province: string
          street_address: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          application_id: string
          business_name: string
          business_type: string
          city: string
          created_at?: string
          established_year: number
          logo_path?: string | null
          logo_url?: string | null
          province: string
          street_address: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          application_id?: string
          business_name?: string
          business_type?: string
          city?: string
          created_at?: string
          established_year?: number
          logo_path?: string | null
          logo_url?: string | null
          province?: string
          street_address?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_businesses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "account_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          file_name: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "account_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_documents_document_type_fkey"
            columns: ["document_type"]
            isOneToOne: false
            referencedRelation: "document_types"
            referencedColumns: ["code"]
          },
        ]
      }
      application_identities: {
        Row: {
          application_id: string
          created_at: string
          date_of_birth: string
          id_document_path: string | null
          id_type: string
          owner_legal_name: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          date_of_birth: string
          id_document_path?: string | null
          id_type: string
          owner_legal_name: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          date_of_birth?: string
          id_document_path?: string | null
          id_type?: string
          owner_legal_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_identities_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "account_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string
          is_required: boolean
          label: string
          sort_order: number
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string
          is_required?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string
          is_required?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          reset_token_hash: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          reset_token_hash?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          reset_token_hash?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rejected_accounts: {
        Row: {
          application_id: string | null
          business_name: string | null
          business_type: string | null
          created_at: string
          email: string
          email_sent: boolean
          full_name: string
          id: string
          location: string | null
          owner_legal_name: string | null
          phone: string | null
          plan_code: string | null
          reference_code: string | null
          rejected_at: string
          rejected_by: string
          rejection_reason: string
          submitted_at: string | null
        }
        Insert: {
          application_id?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email: string
          email_sent?: boolean
          full_name: string
          id?: string
          location?: string | null
          owner_legal_name?: string | null
          phone?: string | null
          plan_code?: string | null
          reference_code?: string | null
          rejected_at?: string
          rejected_by?: string
          rejection_reason: string
          submitted_at?: string | null
        }
        Update: {
          application_id?: string | null
          business_name?: string | null
          business_type?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean
          full_name?: string
          id?: string
          location?: string | null
          owner_legal_name?: string | null
          phone?: string | null
          plan_code?: string | null
          reference_code?: string | null
          rejected_at?: string
          rejected_by?: string
          rejection_reason?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          code: string
          created_at: string
          eyebrow: string
          features: string[]
          is_active: boolean
          location_limit: number | null
          name: string
          price_php: number
          sort_order: number
          staff_limit: number | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          code: string
          created_at?: string
          eyebrow?: string
          features?: string[]
          is_active?: boolean
          location_limit?: number | null
          name: string
          price_php: number
          sort_order?: number
          staff_limit?: number | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          code?: string
          created_at?: string
          eyebrow?: string
          features?: string[]
          is_active?: boolean
          location_limit?: number | null
          name?: string
          price_php?: number
          sort_order?: number
          staff_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tenant_memberships: {
        Row: {
          created_at: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          about: string | null
          created_at: string
          currency: string
          display_name: string | null
          locale: string
          tagline: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          about?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          locale?: string
          tagline?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          about?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          locale?: string
          tagline?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          address: string | null
          brand_color: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          secondary_color: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          brand_color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          secondary_color?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          brand_color?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          secondary_color?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      missing_required_documents: {
        Args: { _application_id: string }
        Returns: {
          code: string
          label: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "receptionist" | "staff"
      application_status: "pending" | "approved" | "rejected" | "suspended"
      tenant_status: "pending" | "active" | "suspended" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "owner", "receptionist", "staff"],
      application_status: ["pending", "approved", "rejected", "suspended"],
      tenant_status: ["pending", "active", "suspended", "archived"],
    },
  },
} as const
