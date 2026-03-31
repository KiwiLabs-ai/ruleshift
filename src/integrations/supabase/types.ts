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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          brief_id: string | null
          created_at: string
          id: string
          is_read: boolean
          org_source_id: string | null
          organization_id: string
          severity: string
          source_name: string
          title: string
        }
        Insert: {
          brief_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          org_source_id?: string | null
          organization_id: string
          severity?: string
          source_name: string
          title: string
        }
        Update: {
          brief_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          org_source_id?: string | null
          organization_id?: string
          severity?: string
          source_name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_org_source_id_fkey"
            columns: ["org_source_id"]
            isOneToOne: false
            referencedRelation: "organization_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          organization_id: string
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          organization_id: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          organization_id?: string
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_action_items: {
        Row: {
          action_index: number
          brief_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          id: string
        }
        Insert: {
          action_index: number
          brief_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          id?: string
        }
        Update: {
          action_index?: number
          brief_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_action_items_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          alert_id: string | null
          content: string | null
          created_at: string
          id: string
          organization_id: string
          source_name: string
          summary: string | null
          tags: string[]
          title: string
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          alert_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          organization_id: string
          source_name: string
          summary?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          alert_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          source_name?: string
          summary?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_queue: {
        Row: {
          brief_id: string
          id: string
          organization_id: string
          queued_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          brief_id: string
          id?: string
          organization_id: string
          queued_at?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          brief_id?: string
          id?: string
          organization_id?: string
          queued_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_queue_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digest_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          digest_frequency: string
          email_enabled: boolean
          id: string
          preferred_day: string | null
          preferred_time: string | null
          severity_threshold: string
          slack_enabled: boolean
          slack_webhook_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string
          email_enabled?: boolean
          id?: string
          preferred_day?: string | null
          preferred_time?: string | null
          severity_threshold?: string
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string
          email_enabled?: boolean
          id?: string
          preferred_day?: string | null
          preferred_time?: string | null
          severity_threshold?: string
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          invited_email: string | null
          organization_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_email?: string | null
          organization_id: string
          role?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_email?: string | null
          organization_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sources: {
        Row: {
          check_frequency: string
          consecutive_errors: number
          created_at: string
          custom_name: string | null
          custom_selector: string | null
          custom_url: string | null
          id: string
          is_custom: boolean
          last_changed_at: string | null
          last_checked_at: string | null
          last_error: string | null
          organization_id: string
          source_id: string | null
          status: string
        }
        Insert: {
          check_frequency?: string
          consecutive_errors?: number
          created_at?: string
          custom_name?: string | null
          custom_selector?: string | null
          custom_url?: string | null
          id?: string
          is_custom?: boolean
          last_changed_at?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          organization_id: string
          source_id?: string | null
          status?: string
        }
        Update: {
          check_frequency?: string
          consecutive_errors?: number
          created_at?: string
          custom_name?: string | null
          custom_selector?: string | null
          custom_url?: string | null
          id?: string
          is_custom?: boolean
          last_changed_at?: string | null
          last_checked_at?: string | null
          last_error?: string | null
          organization_id?: string
          source_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "policy_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_size: string
          compliance_concern: string | null
          created_at: string
          created_by: string
          id: string
          industry: string
          name: string
          updated_at: string
        }
        Insert: {
          company_size: string
          compliance_concern?: string | null
          created_at?: string
          created_by: string
          id?: string
          industry: string
          name: string
          updated_at?: string
        }
        Update: {
          company_size?: string
          compliance_concern?: string | null
          created_at?: string
          created_by?: string
          id?: string
          industry?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_snapshots: {
        Row: {
          content_hash: string
          fetched_at: string
          id: string
          org_source_id: string
          text_content: string | null
        }
        Insert: {
          content_hash: string
          fetched_at?: string
          id?: string
          org_source_id: string
          text_content?: string | null
        }
        Update: {
          content_hash?: string
          fetched_at?: string
          id?: string
          org_source_id?: string
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_snapshots_org_source_id_fkey"
            columns: ["org_source_id"]
            isOneToOne: false
            referencedRelation: "organization_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_sources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          onboarding_status: string
          onboarding_step: number
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_status?: string
          onboarding_step?: number
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarding_status?: string
          onboarding_step?: number
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          organization_id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industries: string[]
          key_sources: string[]
          name: string
          source_count: number
          source_ids: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industries?: string[]
          key_sources?: string[]
          name: string
          source_count?: number
          source_ids?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industries?: string[]
          key_sources?: string[]
          name?: string
          source_count?: number
          source_ids?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_org_owner: { Args: { _org_id: string }; Returns: boolean }
      search_briefs: {
        Args: { _limit?: number; _org_id: string; _query: string }
        Returns: {
          alert_id: string
          content: string
          created_at: string
          id: string
          organization_id: string
          relevance: number
          source_name: string
          summary: string
          tags: string[]
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
