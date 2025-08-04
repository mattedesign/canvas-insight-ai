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
      alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string
          metadata: Json
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analyses: {
        Row: {
          analysis_type: string | null
          created_at: string | null
          id: string
          image_name: string | null
          image_url: string
          results: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_type?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_url: string
          results?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_type?: string | null
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_url?: string
          results?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_cache: {
        Row: {
          created_at: string
          id: string
          image_hash: string
          results: Json
        }
        Insert: {
          created_at?: string
          id?: string
          image_hash: string
          results?: Json
        }
        Update: {
          created_at?: string
          id?: string
          image_hash?: string
          results?: Json
        }
        Relationships: []
      }
      analysis_insights: {
        Row: {
          created_at: string | null
          id: string
          image_id: string
          insights: Json
          job_id: string | null
          quality_score: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id: string
          insights: Json
          job_id?: string | null
          quality_score?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string
          insights?: Json
          job_id?: string | null
          quality_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_insights_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          image_id: string
          image_url: string
          metadata: Json | null
          progress: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          image_id: string
          image_url: string
          metadata?: Json | null
          progress?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          image_id?: string
          image_url?: string
          metadata?: Json | null
          progress?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analysis_metrics: {
        Row: {
          analysis_id: string | null
          cost_usd: number | null
          created_at: string | null
          duration_ms: number | null
          id: string
          model: string
          stage: string
          tokens_used: number | null
        }
        Insert: {
          analysis_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          model: string
          stage: string
          tokens_used?: number | null
        }
        Update: {
          analysis_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          model?: string
          stage?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_metrics_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_name: string
          last_used_at: string | null
          rate_limit: number
          requests_made: number
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_name: string
          last_used_at?: string | null
          rate_limit?: number
          requests_made?: number
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_name?: string
          last_used_at?: string | null
          rate_limit?: number
          requests_made?: number
          user_id?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          api_key_id: string
          endpoint: string
          id: string
          response_time_ms: number
          success: boolean
          timestamp: string
          user_id: string
        }
        Insert: {
          api_key_id: string
          endpoint: string
          id?: string
          response_time_ms: number
          success: boolean
          timestamp?: string
          user_id: string
        }
        Update: {
          api_key_id?: string
          endpoint?: string
          id?: string
          response_time_ms?: number
          success?: boolean
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      backup_metadata: {
        Row: {
          backup_path: string
          backup_type: string
          checksum: string | null
          created_at: string | null
          file_size: number | null
          id: string
          restored_at: string | null
          status: string | null
        }
        Insert: {
          backup_path: string
          backup_type: string
          checksum?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          restored_at?: string | null
          status?: string | null
        }
        Update: {
          backup_path?: string
          backup_type?: string
          checksum?: string | null
          created_at?: string | null
          file_size?: number | null
          id?: string
          restored_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      batch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_images: number
          id: string
          name: string
          processed_images: number
          progress: number
          results: Json | null
          settings: Json
          status: string
          total_images: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_images?: number
          id?: string
          name: string
          processed_images?: number
          progress?: number
          results?: Json | null
          settings?: Json
          status?: string
          total_images: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_images?: number
          id?: string
          name?: string
          processed_images?: number
          progress?: number
          results?: Json | null
          settings?: Json
          status?: string
          total_images?: number
          user_id?: string
        }
        Relationships: []
      }
      canvas_states: {
        Row: {
          canvas_settings: Json
          created_at: string | null
          edges: Json
          id: string
          node_positions: Json
          nodes: Json
          project_id: string | null
          selected_nodes: Json
          ui_state: Json
          updated_at: string | null
          user_id: string
          viewport: Json
        }
        Insert: {
          canvas_settings?: Json
          created_at?: string | null
          edges?: Json
          id?: string
          node_positions?: Json
          nodes?: Json
          project_id?: string | null
          selected_nodes?: Json
          ui_state?: Json
          updated_at?: string | null
          user_id: string
          viewport?: Json
        }
        Update: {
          canvas_settings?: Json
          created_at?: string | null
          edges?: Json
          id?: string
          node_positions?: Json
          nodes?: Json
          project_id?: string | null
          selected_nodes?: Json
          ui_state?: Json
          updated_at?: string | null
          user_id?: string
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
          {
            foreignKeyName: "fk_canvas_states_project_id"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          metadata: Json
          session_id: string
          stack_trace: string | null
          url: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type: string
          id?: string
          metadata?: Json
          session_id: string
          stack_trace?: string | null
          url: string
          user_agent: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          metadata?: Json
          session_id?: string
          stack_trace?: string | null
          url?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      generated_concepts: {
        Row: {
          analysis_id: string | null
          created_at: string
          description: string
          id: string
          image_id: string | null
          image_url: string
          improvements: Json
          metadata: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          description: string
          id?: string
          image_id?: string | null
          image_url: string
          improvements?: Json
          metadata?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          description?: string
          id?: string
          image_id?: string | null
          image_url?: string
          improvements?: Json
          metadata?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_concepts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ux_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_concepts_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
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
            foreignKeyName: "fk_group_analyses_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "image_groups"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "fk_image_groups_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
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
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          metadata: Json | null
          original_name: string
          project_id: string | null
          security_scan_status: string | null
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          dimensions: Json
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          metadata?: Json | null
          original_name: string
          project_id?: string | null
          security_scan_status?: string | null
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          dimensions?: Json
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          metadata?: Json | null
          original_name?: string
          project_id?: string | null
          security_scan_status?: string | null
          storage_path?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_images_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inpainting_results: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          id: string
          inpainted_url: string
          mask_data: Json | null
          original_url: string
          suggestion_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          id?: string
          inpainted_url: string
          mask_data?: Json | null
          original_url: string
          suggestion_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          id?: string
          inpainted_url?: string
          mask_data?: Json | null
          original_url?: string
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inpainting_results_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          metric_name: string
          metric_type: string
          session_id: string
          user_id: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          metric_name: string
          metric_type: string
          session_id: string
          user_id?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          metric_name?: string
          metric_type?: string
          session_id?: string
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      storage_data: {
        Row: {
          created_at: string
          id: string
          key: string
          metadata: Json
          updated_at: string
          user_id: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          metadata?: Json
          updated_at?: string
          user_id?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          metadata?: Json
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      strategic_insights: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          data: Json
          id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          data: Json
          id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_insights_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ux_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          analysis_count: number | null
          analysis_limit: number | null
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_count?: number | null
          analysis_limit?: number | null
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_count?: number | null
          analysis_limit?: number | null
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_name: string
          event_type: string
          id: string
          properties: Json
          session_id: string
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          event_type: string
          id?: string
          properties?: Json
          session_id: string
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          event_type?: string
          id?: string
          properties?: Json
          session_id?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ux_analyses: {
        Row: {
          analysis_type: string | null
          counted_towards_limit: boolean | null
          created_at: string | null
          has_strategic_insights: boolean | null
          id: string
          image_id: string | null
          metadata: Json
          project_id: string | null
          status: string | null
          strategic_summary: Json | null
          suggestions: Json
          summary: Json
          user_context: string | null
          user_id: string | null
          visual_annotations: Json
        }
        Insert: {
          analysis_type?: string | null
          counted_towards_limit?: boolean | null
          created_at?: string | null
          has_strategic_insights?: boolean | null
          id?: string
          image_id?: string | null
          metadata?: Json
          project_id?: string | null
          status?: string | null
          strategic_summary?: Json | null
          suggestions?: Json
          summary?: Json
          user_context?: string | null
          user_id?: string | null
          visual_annotations?: Json
        }
        Update: {
          analysis_type?: string | null
          counted_towards_limit?: boolean | null
          created_at?: string | null
          has_strategic_insights?: boolean | null
          id?: string
          image_id?: string | null
          metadata?: Json
          project_id?: string | null
          status?: string | null
          strategic_summary?: Json | null
          suggestions?: Json
          summary?: Json
          user_context?: string | null
          user_id?: string | null
          visual_annotations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "fk_ux_analyses_image_id"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ux_analyses_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ux_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_ant_results: {
        Row: {
          ant_type: string
          completed_at: string | null
          error: string | null
          id: string
          job_id: string | null
          result: Json | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          ant_type: string
          completed_at?: string | null
          error?: string | null
          id?: string
          job_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          ant_type?: string
          completed_at?: string | null
          error?: string | null
          id?: string
          job_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_ant_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_database_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          component: string
          status: string
          details: Json
        }[]
      }
      check_rate_limit: {
        Args: {
          endpoint_name: string
          max_requests?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_monitoring_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_project_slug: {
        Args: { project_name: string }
        Returns: string
      }
      generate_random_project_name: {
        Args: Record<PropertyKey, never>
        Returns: {
          name: string
          slug: string
        }[]
      }
      get_analysis_job_status: {
        Args: { p_job_id?: string }
        Returns: {
          id: string
          user_id: string
          image_id: string
          status: string
          progress: number
          created_at: string
          error: string
          completed_ants: number
          total_ants: number
        }[]
      }
      get_cached_analysis: {
        Args: { p_image_hash: string }
        Returns: {
          results: Json
        }[]
      }
      store_analysis_result: {
        Args: {
          p_image_id: string
          p_analysis_data: Json
          p_user_id: string
          p_status?: string
        }
        Returns: string
      }
      upsert_cached_analysis: {
        Args: { p_image_hash: string; p_results: Json }
        Returns: undefined
      }
      validate_user_permission: {
        Args: { operation: string; resource_id?: string }
        Returns: boolean
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
