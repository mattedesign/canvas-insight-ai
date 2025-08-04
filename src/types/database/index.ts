// Database types that match your Supabase schema
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      images: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          url: string;
          width: number;
          height: number;
          user_id: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          url: string;
          width: number;
          height: number;
          user_id: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          url?: string;
          width?: number;
          height?: number;
          user_id?: string;
          uploaded_at?: string;
        };
      };
      ux_analyses: {
        Row: {
          id: string;
          project_id: string;
          image_id: string;
          user_context: string;
          analysis_data: any; // JSON data
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          image_id: string;
          user_context: string;
          analysis_data: any;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          image_id?: string;
          user_context?: string;
          analysis_data?: any;
          created_at?: string;
          user_id?: string;
        };
      };
      image_groups: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          color: string;
          position: { x: number; y: number };
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          color: string;
          position: { x: number; y: number };
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          position?: { x: number; y: number };
          created_at?: string;
          user_id?: string;
        };
      };
      group_images: {
        Row: {
          id: string;
          group_id: string;
          image_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          image_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          image_id?: string;
          created_at?: string;
        };
      };
    };
  };
}

// Helper types for easier use
export type Project = Database['public']['Tables']['projects']['Row'];
export type Image = Database['public']['Tables']['images']['Row'];
export type UXAnalysisDB = Database['public']['Tables']['ux_analyses']['Row'];
export type ImageGroupDB = Database['public']['Tables']['image_groups']['Row'];
export type GroupImage = Database['public']['Tables']['group_images']['Row'];
