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
      audit_log: {
        Row: {
          actor: string
          created_at: string
          details: Json
          event: string
          id: string
          message_id: string | null
          message_subject: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          details?: Json
          event: string
          id?: string
          message_id?: string | null
          message_subject?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          details?: Json
          event?: string
          id?: string
          message_id?: string | null
          message_subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          id: string
          is_taken: boolean
          slot_date: string
          slot_time: string
        }
        Insert: {
          id?: string
          is_taken?: boolean
          slot_date: string
          slot_time: string
        }
        Update: {
          id?: string
          is_taken?: boolean
          slot_date?: string
          slot_time?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          created_at: string
          customer_name: string
          id: string
          message_id: string | null
          party_size: number
          status: string
        }
        Insert: {
          booking_date: string
          booking_time: string
          created_at?: string
          customer_name: string
          id?: string
          message_id?: string | null
          party_size: number
          status?: string
        }
        Update: {
          booking_date?: string
          booking_time?: string
          created_at?: string
          customer_name?: string
          id?: string
          message_id?: string | null
          party_size?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          content: string
          id: string
          sort: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          id?: string
          sort?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          sort?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          channel: string
          confidence: number | null
          decided_at: string | null
          edited: boolean
          id: string
          intent: string | null
          original_draft: string | null
          priority: string | null
          reasoning: string | null
          received_at: string
          reject_reason: string | null
          reply_draft: string | null
          sender_email: string
          sender_name: string
          sent_at: string | null
          sentiment: string | null
          sources: Json
          status: string
          subject: string
          triaged_at: string | null
        }
        Insert: {
          body: string
          channel?: string
          confidence?: number | null
          decided_at?: string | null
          edited?: boolean
          id?: string
          intent?: string | null
          original_draft?: string | null
          priority?: string | null
          reasoning?: string | null
          received_at?: string
          reject_reason?: string | null
          reply_draft?: string | null
          sender_email: string
          sender_name: string
          sent_at?: string | null
          sentiment?: string | null
          sources?: Json
          status?: string
          subject: string
          triaged_at?: string | null
        }
        Update: {
          body?: string
          channel?: string
          confidence?: number | null
          decided_at?: string | null
          edited?: boolean
          id?: string
          intent?: string | null
          original_draft?: string | null
          priority?: string | null
          reasoning?: string | null
          received_at?: string
          reject_reason?: string | null
          reply_draft?: string | null
          sender_email?: string
          sender_name?: string
          sent_at?: string | null
          sentiment?: string | null
          sources?: Json
          status?: string
          subject?: string
          triaged_at?: string | null
        }
        Relationships: []
      }
      proposed_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          message_id: string
          params: Json
          status: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          message_id: string
          params?: Json
          status?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          message_id?: string
          params?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposed_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          priority: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          priority?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          priority?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_fresh_demo: { Args: never; Returns: string }
      reset_demo: { Args: never; Returns: undefined }
      reset_demo_unlocked: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const
