export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      appointment_services: {
        Row: {
          appointment_id: string;
          duration_minutes: number;
          price_cents: number;
          service_id: string;
          staff_id: string | null;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          appointment_id: string;
          duration_minutes: number;
          price_cents: number;
          service_id: string;
          staff_id?: string | null;
          tenant_id: string;
        };
        Update: {
          appointment_id?: string;
          duration_minutes?: number;
          price_cents?: number;
          service_id?: string;
          staff_id?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_services_appointment_fkey";
            columns: ["tenant_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "appointment_services_service_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "appointment_services_staff_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "appointment_services_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      appointment_status_history: {
        Row: {
          appointment_id: string;
          changed_at: string;
          changed_by: string | null;
          from_status: Database["public"]["Enums"]["appointment_status"];
          id: string;
          note: string | null;
          tenant_id: string;
          to_status: Database["public"]["Enums"]["appointment_status"];
        };
        ComputedFields: never;
        Insert: {
          appointment_id: string;
          changed_at?: string;
          changed_by?: string | null;
          from_status: Database["public"]["Enums"]["appointment_status"];
          id?: string;
          note?: string | null;
          tenant_id: string;
          to_status: Database["public"]["Enums"]["appointment_status"];
        };
        Update: {
          appointment_id?: string;
          changed_at?: string;
          changed_by?: string | null;
          from_status?: Database["public"]["Enums"]["appointment_status"];
          id?: string;
          note?: string | null;
          tenant_id?: string;
          to_status?: Database["public"]["Enums"]["appointment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_fkey";
            columns: ["tenant_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "appointment_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointment_status_history_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      appointments: {
        Row: {
          cancellation_reason: string | null;
          cancelled_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          ends_at: string;
          id: string;
          notes: string | null;
          source: Database["public"]["Enums"]["booking_source"];
          staff_id: string;
          starts_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          tenant_id: string;
          timezone: string | null;
          total_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          ends_at: string;
          id?: string;
          notes?: string | null;
          source?: Database["public"]["Enums"]["booking_source"];
          staff_id: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          tenant_id: string;
          timezone?: string | null;
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          ends_at?: string;
          id?: string;
          notes?: string | null;
          source?: Database["public"]["Enums"]["booking_source"];
          staff_id?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          tenant_id?: string;
          timezone?: string | null;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_tenant_staff_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["tenant_id", "id"];
          },
        ];
      };
      breaks: {
        Row: {
          ends_at: string;
          id: string;
          shift_id: string;
          starts_at: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          shift_id: string;
          starts_at: string;
          tenant_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          shift_id?: string;
          starts_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "breaks_shift_fkey";
            columns: ["tenant_id", "shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "breaks_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      business_closures: {
        Row: {
          ends_at: string;
          id: string;
          reason: string | null;
          starts_at: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          reason?: string | null;
          starts_at: string;
          tenant_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          reason?: string | null;
          starts_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_closures_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      business_hours: {
        Row: {
          closes_at: string;
          day_of_week: number;
          id: string;
          is_closed: boolean;
          opens_at: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          closes_at: string;
          day_of_week: number;
          id?: string;
          is_closed?: boolean;
          opens_at: string;
          tenant_id: string;
        };
        Update: {
          closes_at?: string;
          day_of_week?: number;
          id?: string;
          is_closed?: boolean;
          opens_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_hours_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      leaves: {
        Row: {
          approved: boolean;
          ends_on: string;
          id: string;
          reason: string | null;
          staff_id: string;
          starts_on: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          approved?: boolean;
          ends_on: string;
          id?: string;
          reason?: string | null;
          staff_id: string;
          starts_on: string;
          tenant_id: string;
        };
        Update: {
          approved?: boolean;
          ends_on?: string;
          id?: string;
          reason?: string | null;
          staff_id?: string;
          starts_on?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leaves_staff_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "leaves_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"];
          created_at: string;
          id: string;
          payload: NonNullable<Json>;
          read_at: string | null;
          recipient_id: string;
          tenant_id: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          recipient_id: string;
          tenant_id: string;
          type: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"];
          created_at?: string;
          id?: string;
          payload?: NonNullable<Json>;
          read_at?: string | null;
          recipient_id?: string;
          tenant_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_membership_fkey";
            columns: ["tenant_id", "recipient_id"];
            isOneToOne: false;
            referencedRelation: "tenant_memberships";
            referencedColumns: ["tenant_id", "profile_id"];
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      package_items: {
        Row: {
          package_id: string;
          quantity: number;
          service_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          package_id: string;
          quantity?: number;
          service_id: string;
          tenant_id: string;
        };
        Update: {
          package_id?: string;
          quantity?: number;
          service_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "package_items_package_fkey";
            columns: ["tenant_id", "package_id"];
            isOneToOne: false;
            referencedRelation: "packages";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "package_items_service_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "package_items_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      packages: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          price_cents: number;
          slug: string;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          price_cents?: number;
          slug: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          price_cents?: number;
          slug?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "packages_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      qr_passes: {
        Row: {
          appointment_id: string;
          expires_at: string;
          id: string;
          issued_at: string;
          tenant_id: string;
          token: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          appointment_id: string;
          expires_at: string;
          id?: string;
          issued_at?: string;
          tenant_id: string;
          token?: string;
          used_at?: string | null;
        };
        Update: {
          appointment_id?: string;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          tenant_id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "qr_passes_appointment_fkey";
            columns: ["tenant_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "qr_passes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_allocations: {
        Row: {
          appointment_id: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          resource_id: string;
          starts_at: string;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          appointment_id?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          resource_id: string;
          starts_at: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          appointment_id?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          resource_id?: string;
          starts_at?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_allocations_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_allocations_resource_fkey";
            columns: ["tenant_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "resource_allocations_tenant_appointment_fkey";
            columns: ["tenant_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "resource_allocations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          active: boolean;
          capacity: number;
          created_at: string;
          id: string;
          name: string;
          tenant_id: string;
          type: Database["public"]["Enums"]["resource_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          capacity?: number;
          created_at?: string;
          id?: string;
          name: string;
          tenant_id: string;
          type?: Database["public"]["Enums"]["resource_type"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          capacity?: number;
          created_at?: string;
          id?: string;
          name?: string;
          tenant_id?: string;
          type?: Database["public"]["Enums"]["resource_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resources_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_addon_links: {
        Row: {
          addon_id: string;
          service_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          addon_id: string;
          service_id: string;
          tenant_id: string;
        };
        Update: {
          addon_id?: string;
          service_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_addon_links_addon_fkey";
            columns: ["tenant_id", "addon_id"];
            isOneToOne: false;
            referencedRelation: "service_addons";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "service_addon_links_service_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "service_addon_links_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_addons: {
        Row: {
          active: boolean;
          created_at: string;
          duration_minutes: number;
          id: string;
          name: string;
          price_cents: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          name: string;
          price_cents?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          name?: string;
          price_cents?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_addons_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      service_resources: {
        Row: {
          resource_id: string;
          service_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          resource_id: string;
          service_id: string;
          tenant_id: string;
        };
        Update: {
          resource_id?: string;
          service_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_resources_resource_fkey";
            columns: ["tenant_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resources";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "service_resources_service_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "service_resources_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          buffer_minutes: number;
          category_id: string | null;
          created_at: string;
          description: string | null;
          duration_minutes: number;
          embedding: string | null;
          id: string;
          name: string;
          price_cents: number;
          slug: string;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          buffer_minutes?: number;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_minutes: number;
          embedding?: string | null;
          id?: string;
          name: string;
          price_cents?: number;
          slug: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          buffer_minutes?: number;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          embedding?: string | null;
          id?: string;
          name?: string;
          price_cents?: number;
          slug?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_tenant_category_fkey";
            columns: ["tenant_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "service_categories";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "services_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          ends_at: string;
          id: string;
          staff_id: string;
          starts_at: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          staff_id: string;
          starts_at: string;
          tenant_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          staff_id?: string;
          starts_at?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_staff_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_members: {
        Row: {
          active: boolean;
          bio: string | null;
          commission_type: Database["public"]["Enums"]["commission_type"];
          commission_value: number;
          created_at: string;
          full_name: string;
          id: string;
          image_url: string | null;
          profile_id: string | null;
          sort_order: number;
          tenant_id: string;
          title: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          bio?: string | null;
          commission_type?: Database["public"]["Enums"]["commission_type"];
          commission_value?: number;
          created_at?: string;
          full_name: string;
          id?: string;
          image_url?: string | null;
          profile_id?: string | null;
          sort_order?: number;
          tenant_id: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          bio?: string | null;
          commission_type?: Database["public"]["Enums"]["commission_type"];
          commission_value?: number;
          created_at?: string;
          full_name?: string;
          id?: string;
          image_url?: string | null;
          profile_id?: string | null;
          sort_order?: number;
          tenant_id?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_service_skills: {
        Row: {
          service_id: string;
          staff_id: string;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          service_id: string;
          staff_id: string;
          tenant_id: string;
        };
        Update: {
          service_id?: string;
          staff_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_service_skills_service_fkey";
            columns: ["tenant_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "staff_service_skills_staff_fkey";
            columns: ["tenant_id", "staff_id"];
            isOneToOne: false;
            referencedRelation: "staff_members";
            referencedColumns: ["tenant_id", "id"];
          },
          {
            foreignKeyName: "staff_service_skills_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_memberships: {
        Row: {
          created_at: string;
          profile_id: string;
          role: Database["public"]["Enums"]["app_role"];
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          profile_id: string;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          profile_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenant_settings: {
        Row: {
          about: string | null;
          created_at: string;
          currency: string;
          display_name: string | null;
          locale: string;
          tagline: string | null;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          about?: string | null;
          created_at?: string;
          currency?: string;
          display_name?: string | null;
          locale?: string;
          tagline?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          about?: string | null;
          created_at?: string;
          currency?: string;
          display_name?: string | null;
          locale?: string;
          tagline?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: true;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      tenants: {
        Row: {
          accent_color: string | null;
          address: string | null;
          brand_color: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          phone: string | null;
          secondary_color: string | null;
          slug: string;
          status: Database["public"]["Enums"]["tenant_status"];
          timezone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accent_color?: string | null;
          address?: string | null;
          brand_color?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          phone?: string | null;
          secondary_color?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["tenant_status"];
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          accent_color?: string | null;
          address?: string | null;
          brand_color?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          secondary_color?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["tenant_status"];
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_profile_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      get_my_tenant_id: { Args: Record<PropertyKey, never>; Returns: string };
      is_platform_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      match_services: {
        Args: { match_count: number; p_tenant_id: string; query_embedding: string };
        Returns: {
          description: string;
          duration_minutes: number;
          id: string;
          name: string;
          price_cents: number;
          similarity: number;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "owner" | "receptionist" | "staff";
      appointment_status:
        | "pending_approval"
        | "confirmed"
        | "checked_in"
        | "in_service"
        | "completed"
        | "cancelled"
        | "rejected"
        | "expired"
        | "no_show";
      booking_source: "online" | "walk_in" | "phone";
      commission_type: "fixed" | "percentage";
      notification_channel: "in_app" | "email" | "sms";
      resource_type: "room" | "chair" | "equipment" | "vehicle" | "other";
      tenant_status: "pending" | "active" | "suspended" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "owner", "receptionist", "staff"],
      appointment_status: [
        "pending_approval",
        "confirmed",
        "checked_in",
        "in_service",
        "completed",
        "cancelled",
        "rejected",
        "expired",
        "no_show",
      ],
      booking_source: ["online", "walk_in", "phone"],
      commission_type: ["fixed", "percentage"],
      notification_channel: ["in_app", "email", "sms"],
      resource_type: ["room", "chair", "equipment", "vehicle", "other"],
      tenant_status: ["pending", "active", "suspended", "archived"],
    },
  },
} as const;
