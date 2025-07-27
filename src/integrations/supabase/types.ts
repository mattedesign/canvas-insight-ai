export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      canvas_states: {
        Row: {
          canvas_settings: Json
          created_at: string | null
          id: string
          node_positions: Json
          project_id: string | null
          selected_nodes: Json
          updated_at: string | null
          viewport: Json
        }
        Insert: {
          canvas_settings?: Json
          created_at?: string | null
          id?: string
          node_positions?: Json
          project_id?: string | null
          selected_nodes?: Json
          updated_at?: string | null
          viewport?: Json
        }
        Update: {
          canvas_settings?: Json
          created_at?: string | null
          id?: string
          node_positions?: Json
          project_id?: string | null
          selected_nodes?: Json
          updated_at?: string | null
          viewport?: Json
        }
        Relationships: [
          {
            foreignKeyName: "canvas_states_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      group_analyses: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          insights: Json
          is_custom: boolean | null
          parent_analysis_id: string | null
          patterns: Json
          prompt: string
          recommendations: Json
          summary: Json
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          insights?: Json
          is_custom?: boolean | null
          parent_analysis_id?: string | null
          patterns?: Json
          prompt: string
          recommendations?: Json
          summary?: Json
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          insights?: Json
          is_custom?: boolean | null
          parent_analysis_id?: string | null
          patterns?: Json
          prompt?: string
          recommendations?: Json
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "group_analyses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "image_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_analyses_parent_analysis_id_fkey"
            columns: ["parent_analysis_id"]
            isOneToOne: false
            referencedRelation: "group_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_images: {
        Row: {
          group_id: string
          image_id: string
        }
        Insert: {
          group_id: string
          image_id: string
        }
        Update: {
          group_id?: string
          image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_images_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "image_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_images_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
      image_groups: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          position: Json
          project_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          position: Json
          project_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: Json
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "image_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          dimensions: Json
          filename: string
          id: string
          original_name: string
          project_id: string | null
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          dimensions: Json
          filename: string
          id?: string
          original_name: string
          project_id?: string | null
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          dimensions?: Json
          filename?: string
          id?: string
          original_name?: string
          project_id?: string | null
          storage_path?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ux_analyses: {
        Row: {
          created_at: string | null
          id: string
          image_id: string | null
          metadata: Json
          suggestions: Json
          summary: Json
          user_context: string | null
          visual_annotations: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id?: string | null
          metadata?: Json
          suggestions?: Json
          summary?: Json
          user_context?: string | null
          visual_annotations?: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string | null
          metadata?: Json
          suggestions?: Json
          summary?: Json
          user_context?: string | null
          visual_annotations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ux_analyses_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
