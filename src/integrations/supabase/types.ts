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
      applications: {
        Row: {
          applicant_email: string | null
          applicant_id: string | null
          applicant_name: string
          created_at: string
          id: string
          message: string | null
          move_in: string | null
          property_id: string
          room_id: string | null
          status: string
        }
        Insert: {
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name: string
          created_at?: string
          id?: string
          message?: string | null
          move_in?: string | null
          property_id: string
          room_id?: string | null
          status?: string
        }
        Update: {
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string
          created_at?: string
          id?: string
          message?: string | null
          move_in?: string | null
          property_id?: string
          room_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          property_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_disputes: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          property_id: string
          raised_by: string | null
          reason: string
          status: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          property_id: string
          raised_by?: string | null
          reason: string
          status?: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          property_id?: string
          raised_by?: string | null
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_disputes_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_disputes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_type: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          property_id: string
          provider: string
          reference: string | null
          source: string
          start_date: string
          total: number
        }
        Insert: {
          bill_type?: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          property_id: string
          provider: string
          reference?: string | null
          source?: string
          start_date: string
          total: number
        }
        Update: {
          bill_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          property_id?: string
          provider?: string
          reference?: string | null
          source?: string
          start_date?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bills_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      chores: {
        Row: {
          assignee_id: string | null
          assignee_name: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          property_id: string
          repeat: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          property_id: string
          repeat?: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          assignee_name?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          property_id?: string
          repeat?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          property_id: string
          room_id: string
          status: string
          tenancy_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          property_id: string
          room_id: string
          status?: string
          tenancy_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          property_id?: string
          room_id?: string
          status?: string
          tenancy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          kind: string
          property_id: string
          storage_path: string | null
          title: string
          uploaded_by: string
          uploaded_by_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          property_id: string
          storage_path?: string | null
          title: string
          uploaded_by?: string
          uploaded_by_name: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          property_id?: string
          storage_path?: string | null
          title?: string
          uploaded_by?: string
          uploaded_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          property_id: string
          spent_on: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          id?: string
          property_id: string
          spent_on?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          property_id?: string
          spent_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      house_rules: {
        Row: {
          agreed_by: string[]
          body: string
          created_at: string
          created_by_name: string
          id: string
          property_id: string
        }
        Insert: {
          agreed_by?: string[]
          body: string
          created_at?: string
          created_by_name: string
          id?: string
          property_id: string
        }
        Update: {
          agreed_by?: string[]
          body?: string
          created_at?: string
          created_by_name?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          property_id: string
          room_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          property_id: string
          room_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          property_id?: string
          room_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          cost: number | null
          created_at: string
          details: string | null
          id: string
          property_id: string
          raised_by: string | null
          room_id: string | null
          status: string
          title: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          details?: string | null
          id?: string
          property_id: string
          raised_by?: string | null
          room_id?: string | null
          status?: string
          title: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          details?: string | null
          id?: string
          property_id?: string
          raised_by?: string | null
          room_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          property_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          property_id: string
          sender_id?: string
          sender_name: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          property_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bill_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          method: string
          payee_name: string
          payer_id: string | null
          payer_name: string
          property_id: string
          reference: string
          status: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          method?: string
          payee_name: string
          payer_id?: string | null
          payer_name: string
          property_id: string
          reference?: string
          status?: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          method?: string
          payee_name?: string
          payer_id?: string | null
          payer_name?: string
          property_id?: string
          reference?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          photo_url: string | null
          rent_day: number
        }
        Insert: {
          address?: string
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id?: string
          photo_url?: string | null
          rent_day?: number
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          photo_url?: string | null
          rent_day?: number
        }
        Relationships: []
      }
      rooms: {
        Row: {
          available: boolean
          created_at: string
          deposit: number
          id: string
          name: string
          property_id: string
          rent: number
          weight: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          deposit?: number
          id?: string
          name: string
          property_id: string
          rent?: number
          weight?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          deposit?: number
          id?: string
          name?: string
          property_id?: string
          rent?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          created_at: string
          id: string
          items: Json
          property_id: string
          status: string
          tenancy_id: string
          tenant_id: string | null
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          property_id: string
          status?: string
          tenancy_id: string
          tenant_id?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          property_id?: string
          status?: string
          tenancy_id?: string
          tenant_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          property_id: string
          proposed_end_date: string | null
          room_id: string
          start_date: string
          status: string
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          property_id: string
          proposed_end_date?: string | null
          room_id: string
          start_date: string
          status?: string
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          property_id?: string
          proposed_end_date?: string | null
          room_id?: string
          start_date?: string
          status?: string
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_with_code: {
        Args: {
          _code: string
          _message: string
          _move_in: string
          _name: string
        }
        Returns: string
      }
      claim_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_tenant: { Args: { _pid: string }; Returns: boolean }
      is_member: { Args: { _pid: string }; Returns: boolean }
      is_owner: { Args: { _pid: string }; Returns: boolean }
      request_moveout: {
        Args: { _date: string; _tenancy: string }
        Returns: undefined
      }
      send_reminder: {
        Args: { _body: string; _tenancy: string }
        Returns: undefined
      }
      was_tenant: { Args: { _pid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "landlord" | "tenant" | "admin"
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
      app_role: ["landlord", "tenant", "admin"],
    },
  },
} as const
