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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_filing_sessions: {
        Row: {
          ai_model_used: string | null
          completion_status: string | null
          conversation_log: Json
          created_at: string
          current_step: string | null
          filing_id: string
          id: string
          session_type: string
          total_tokens_used: number | null
          updated_at: string
        }
        Insert: {
          ai_model_used?: string | null
          completion_status?: string | null
          conversation_log?: Json
          created_at?: string
          current_step?: string | null
          filing_id: string
          id?: string
          session_type: string
          total_tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          ai_model_used?: string | null
          completion_status?: string | null
          conversation_log?: Json
          created_at?: string
          current_step?: string | null
          filing_id?: string
          id?: string
          session_type?: string
          total_tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_filing_sessions_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          input_variables: Json
          is_active: boolean | null
          model_parameters: Json | null
          prompt_text: string
          section_type: string
          template_name: string
          template_type: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          input_variables?: Json
          is_active?: boolean | null
          model_parameters?: Json | null
          prompt_text: string
          section_type: string
          template_name: string
          template_type: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          input_variables?: Json
          is_active?: boolean | null
          model_parameters?: Json | null
          prompt_text?: string
          section_type?: string
          template_name?: string
          template_type?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      copyright_uploads: {
        Row: {
          copyright_id: string
          file_hash: string | null
          file_path: string
          file_size: number | null
          filename: string
          id: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          copyright_id: string
          file_hash?: string | null
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          mime_type: string
          uploaded_at?: string
        }
        Update: {
          copyright_id?: string
          file_hash?: string | null
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          mime_type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copyright_uploads_copyright_id_fkey"
            columns: ["copyright_id"]
            isOneToOne: false
            referencedRelation: "copyrights"
            referencedColumns: ["id"]
          },
        ]
      }
      copyrights: {
        Row: {
          authorship_description: string | null
          created_at: string
          date_of_creation: string | null
          date_of_publication: string | null
          filing_id: string
          id: string
          is_published: boolean | null
          nature_of_authorship: string | null
          owner_address: string | null
          owner_name: string
          owner_nationality: string | null
          updated_at: string
          work_title: string
          work_type: string
        }
        Insert: {
          authorship_description?: string | null
          created_at?: string
          date_of_creation?: string | null
          date_of_publication?: string | null
          filing_id: string
          id?: string
          is_published?: boolean | null
          nature_of_authorship?: string | null
          owner_address?: string | null
          owner_name: string
          owner_nationality?: string | null
          updated_at?: string
          work_title: string
          work_type: string
        }
        Update: {
          authorship_description?: string | null
          created_at?: string
          date_of_creation?: string | null
          date_of_publication?: string | null
          filing_id?: string
          id?: string
          is_published?: boolean | null
          nature_of_authorship?: string | null
          owner_address?: string | null
          owner_name?: string
          owner_nationality?: string | null
          updated_at?: string
          work_title?: string
          work_type?: string
        }
        Relationships: []
      }
      deadlines: {
        Row: {
          created_at: string | null
          done: boolean | null
          due_on: string
          filing_id: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string | null
          done?: boolean | null
          due_on: string
          filing_id: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string | null
          done?: boolean | null
          due_on?: string
          filing_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          filing_id: string
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          sha256: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          filing_id: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          sha256?: string | null
          url?: string
        }
        Update: {
          created_at?: string | null
          filing_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          sha256?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_documents: {
        Row: {
          created_at: string
          filing_id: string
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          sha256: string | null
          url: string
        }
        Insert: {
          created_at?: string
          filing_id: string
          id: string
          kind: Database["public"]["Enums"]["doc_kind"]
          sha256?: string | null
          url: string
        }
        Update: {
          created_at?: string
          filing_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          sha256?: string | null
          url?: string
        }
        Relationships: []
      }
      filing_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          filing_id: string
          id: string
          job_type: string
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filing_id: string
          id?: string
          job_type?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          filing_id?: string
          id?: string
          job_type?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "filing_queue_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_sections: {
        Row: {
          content: string
          created_at: string | null
          filing_id: string
          id: string
          order_index: number | null
          section_key: string
          updated_at: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          filing_id: string
          id?: string
          order_index?: number | null
          section_key: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          filing_id?: string
          id?: string
          order_index?: number | null
          section_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filing_sections_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      filings: {
        Row: {
          abstract: string | null
          agent_assigned: boolean | null
          agent_contact: string | null
          agent_required: boolean | null
          background: string | null
          claims: string | null
          cn_type: Database["public"]["Enums"]["cn_type"] | null
          components: Json | null
          contact_email: string | null
          country: string
          country_code: string
          created_at: string
          detailed_description: string | null
          features: string | null
          generated_content: Json | null
          id: string
          language: string | null
          needs_translation: boolean | null
          paris_deadline: string | null
          payment_status: string | null
          pct_app_no: string | null
          pct_national_deadline: string | null
          prior_art: string | null
          priority_date: string | null
          problem: string | null
          route: Database["public"]["Enums"]["filing_route"] | null
          solution: string | null
          status: string
          summary: string | null
          title: string
          tm_classes: Json | null
          tm_cn_subclasses: Json | null
          tm_mark_image_url: string | null
          tm_mark_text: string | null
          tm_mark_type: Database["public"]["Enums"]["mark_type"] | null
          tm_specimens: Json | null
          translation_status: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          abstract?: string | null
          agent_assigned?: boolean | null
          agent_contact?: string | null
          agent_required?: boolean | null
          background?: string | null
          claims?: string | null
          cn_type?: Database["public"]["Enums"]["cn_type"] | null
          components?: Json | null
          contact_email?: string | null
          country: string
          country_code?: string
          created_at?: string
          detailed_description?: string | null
          features?: string | null
          generated_content?: Json | null
          id?: string
          language?: string | null
          needs_translation?: boolean | null
          paris_deadline?: string | null
          payment_status?: string | null
          pct_app_no?: string | null
          pct_national_deadline?: string | null
          prior_art?: string | null
          priority_date?: string | null
          problem?: string | null
          route?: Database["public"]["Enums"]["filing_route"] | null
          solution?: string | null
          status?: string
          summary?: string | null
          title: string
          tm_classes?: Json | null
          tm_cn_subclasses?: Json | null
          tm_mark_image_url?: string | null
          tm_mark_text?: string | null
          tm_mark_type?: Database["public"]["Enums"]["mark_type"] | null
          tm_specimens?: Json | null
          translation_status?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          abstract?: string | null
          agent_assigned?: boolean | null
          agent_contact?: string | null
          agent_required?: boolean | null
          background?: string | null
          claims?: string | null
          cn_type?: Database["public"]["Enums"]["cn_type"] | null
          components?: Json | null
          contact_email?: string | null
          country?: string
          country_code?: string
          created_at?: string
          detailed_description?: string | null
          features?: string | null
          generated_content?: Json | null
          id?: string
          language?: string | null
          needs_translation?: boolean | null
          paris_deadline?: string | null
          payment_status?: string | null
          pct_app_no?: string | null
          pct_national_deadline?: string | null
          prior_art?: string | null
          priority_date?: string | null
          problem?: string | null
          route?: Database["public"]["Enums"]["filing_route"] | null
          solution?: string | null
          status?: string
          summary?: string | null
          title?: string
          tm_classes?: Json | null
          tm_cn_subclasses?: Json | null
          tm_mark_image_url?: string | null
          tm_mark_text?: string | null
          tm_mark_type?: Database["public"]["Enums"]["mark_type"] | null
          tm_specimens?: Json | null
          translation_status?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          contact_email: string | null
          created_at: string
          filing_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          filing_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          filing_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      patent_sections: {
        Row: {
          ai_generated: boolean | null
          content: string
          created_at: string
          filing_id: string
          id: string
          reviewed: boolean | null
          section_type: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean | null
          content: string
          created_at?: string
          filing_id: string
          id?: string
          reviewed?: boolean | null
          section_type: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean | null
          content?: string
          created_at?: string
          filing_id?: string
          id?: string
          reviewed?: boolean | null
          section_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patent_sections_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number | null
          created_at: string
          currency: string
          filing_id: string
          id: string
          provider: string
          raw_payload: Json | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          filing_id: string
          id?: string
          provider?: string
          raw_payload?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          currency?: string
          filing_id?: string
          id?: string
          provider?: string
          raw_payload?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trademark_clearance_logs: {
        Row: {
          filing_id: string
          id: string
          recommendations: string | null
          risk_level: string | null
          risk_score: number | null
          search_results: Json | null
          searched_at: string
          searched_term: string
          similarity_matches: Json | null
        }
        Insert: {
          filing_id: string
          id?: string
          recommendations?: string | null
          risk_level?: string | null
          risk_score?: number | null
          search_results?: Json | null
          searched_at?: string
          searched_term: string
          similarity_matches?: Json | null
        }
        Update: {
          filing_id?: string
          id?: string
          recommendations?: string | null
          risk_level?: string | null
          risk_score?: number | null
          search_results?: Json | null
          searched_at?: string
          searched_term?: string
          similarity_matches?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trademark_clearance_logs_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      trademark_sections: {
        Row: {
          clearance_status: string | null
          created_at: string
          filing_basis: string
          filing_id: string
          goods_services: string
          id: string
          international_classes: Json | null
          mark_name: string
          mark_type: string
          owner_entity: string
          risk_assessment: Json | null
          updated_at: string
        }
        Insert: {
          clearance_status?: string | null
          created_at?: string
          filing_basis: string
          filing_id: string
          goods_services: string
          id?: string
          international_classes?: Json | null
          mark_name: string
          mark_type: string
          owner_entity: string
          risk_assessment?: Json | null
          updated_at?: string
        }
        Update: {
          clearance_status?: string | null
          created_at?: string
          filing_basis?: string
          filing_id?: string
          goods_services?: string
          id?: string
          international_classes?: Json | null
          mark_name?: string
          mark_type?: string
          owner_entity?: string
          risk_assessment?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trademark_sections_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_deadlines: {
        Row: {
          country_code: string | null
          done: boolean
          due_on: string
          filing_id: string
          filing_type: string | null
          id: string
          label: string
          refreshed_at: string
          route: string | null
          user_id: string
        }
        Insert: {
          country_code?: string | null
          done?: boolean
          due_on: string
          filing_id: string
          filing_type?: string | null
          id?: string
          label: string
          refreshed_at?: string
          route?: string | null
          user_id: string
        }
        Update: {
          country_code?: string | null
          done?: boolean
          due_on?: string
          filing_id?: string
          filing_type?: string | null
          id?: string
          label?: string
          refreshed_at?: string
          route?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_deadlines_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: false
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      refresh_upcoming_deadlines: {
        Args: { _filing_id?: string }
        Returns: undefined
      }
    }
    Enums: {
      cn_type: "invention" | "utility_model" | "design"
      doc_kind: "pdf" | "docx" | "xml"
      filing_route: "national" | "pct" | "paris" | "madrid"
      filing_status: "draft" | "ready" | "submitted" | "filed" | "rejected"
      filing_type: "patent" | "trademark" | "copyright"
      mark_type: "word" | "device" | "combined"
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
    Enums: {
      cn_type: ["invention", "utility_model", "design"],
      doc_kind: ["pdf", "docx", "xml"],
      filing_route: ["national", "pct", "paris", "madrid"],
      filing_status: ["draft", "ready", "submitted", "filed", "rejected"],
      filing_type: ["patent", "trademark", "copyright"],
      mark_type: ["word", "device", "combined"],
    },
  },
} as const
