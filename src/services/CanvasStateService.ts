import { supabase } from '@/integrations/supabase/client';

export interface CanvasState {
  id?: string;
  project_id: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  node_positions: Record<string, { x: number; y: number }>;
  selected_nodes: string[];
  canvas_settings: {
    showAnnotations: boolean;
    tool: 'cursor' | 'draw';
  };
  session_metadata?: {
    created_at: string;
    last_upload: string;
    session_name?: string;
  };
  updated_at?: string;
}

export class CanvasStateService {
  private static readonly STORAGE_KEY = 'canvas_state_cache';
  
  // Save canvas state to database
  static async saveCanvasState(projectId: string, state: Omit<CanvasState, 'id' | 'project_id' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('canvas_states' as any)
        .upsert({
          project_id: projectId,
          viewport: state.viewport as any,
          node_positions: state.node_positions as any,
          selected_nodes: state.selected_nodes as any,
          canvas_settings: state.canvas_settings as any
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also cache locally for instant loading
      this.cacheCanvasState(projectId, data as unknown as CanvasState);
      
      return { success: true, data: data as unknown as CanvasState };
    } catch (error) {
      console.error('Failed to save canvas state:', error);
      return { success: false, error };
    }
  }

  // Load canvas state from database
  static async loadCanvasState(projectId: string): Promise<CanvasState | null> {
    try {
      // Try cache first for instant loading
      const cached = this.getCachedCanvasState(projectId);
      
      // Load from database
      const { data, error } = await supabase
        .from('canvas_states' as any)
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return cached or null
          return cached;
        }
        throw error;
      }

      // Cache the latest data
      this.cacheCanvasState(projectId, data as unknown as CanvasState);
      
      return data as unknown as CanvasState;
    } catch (error) {
      console.error('Failed to load canvas state:', error);
      // Return cached data as fallback
      return this.getCachedCanvasState(projectId);
    }
  }

  // Cache canvas state locally for instant loading
  private static cacheCanvasState(projectId: string, state: CanvasState) {
    try {
      const cache = this.getCache();
      cache[projectId] = state;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to cache canvas state:', error);
    }
  }

  // Get cached canvas state
  private static getCachedCanvasState(projectId: string): CanvasState | null {
    try {
      const cache = this.getCache();
      return cache[projectId] || null;
    } catch (error) {
      console.error('Failed to get cached canvas state:', error);
      return null;
    }
  }

  // Get entire cache
  private static getCache(): Record<string, CanvasState> {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Failed to parse canvas cache:', error);
      return {};
    }
  }

  // Clear cache for project
  static clearCache(projectId?: string) {
    try {
      if (projectId) {
        const cache = this.getCache();
        delete cache[projectId];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cache));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear canvas cache:', error);
    }
  }

  // Create default canvas state
  static createDefaultState(projectId: string, sessionName?: string): CanvasState {
    const now = new Date().toISOString();
    return {
      project_id: projectId,
      viewport: { x: 0, y: 0, zoom: 1 },
      node_positions: {},
      selected_nodes: [],
      canvas_settings: {
        showAnnotations: true,
        tool: 'cursor'
      },
      session_metadata: {
        created_at: now,
        last_upload: now,
        session_name: sessionName
      }
    };
  }

  // Clear canvas state for new session
  static async clearCanvasState(projectId: string): Promise<void> {
    try {
      await supabase
        .from('canvas_states' as any)
        .delete()
        .eq('project_id', projectId);

      // Clear local cache for this project
      this.clearCache(projectId);
    } catch (error) {
      console.error('Failed to clear canvas state:', error);
    }
  }
}