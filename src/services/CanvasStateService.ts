import { supabase } from '@/integrations/supabase/client';
import { ProjectService } from './DataMigrationService';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

// Use native Supabase types
type CanvasStateRow = Tables<'canvas_states'>;
type CanvasStateInsert = TablesInsert<'canvas_states'>;

export interface CanvasState {
  id?: string;
  project_id: string;
  user_id: string;
  nodes: any[];
  edges: any[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  ui_state: {
    showAnnotations: boolean;
    galleryTool: 'cursor' | 'draw';
    groupDisplayModes: Record<string, 'standard' | 'stacked'>;
    selectedNodes: string[];
  };
  updated_at?: string;
}

export class CanvasStateService {
  private static readonly STORAGE_KEY = 'canvas_state_cache';
  
  // Save canvas state to database with optimistic updates (no debouncing)
  static async saveCanvasState(state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      // Optimistically cache the state immediately
      const optimisticState: CanvasState = {
        project_id: projectId,
        user_id: authData.user.id,
        ...state
      };
      this.cacheCanvasState(projectId, optimisticState);

      // Then persist to database
      return await this.saveCanvasStateImmediate(state);
    } catch (error) {
      console.error('Failed to save canvas state:', error);
      return { success: false, error };
    }
  }

  // Save canvas state immediately with proper typing
  static async saveCanvasStateImmediate(state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      // Create upsert data with proper JSON types
      const upsertData: CanvasStateInsert = {
        project_id: projectId,
        user_id: authData.user.id,
        nodes: state.nodes as any,
        edges: state.edges as any,
        viewport: state.viewport as any,
        ui_state: state.ui_state as any
      };

      // Use native Supabase types without .returns override
      const { data, error } = await supabase
        .from('canvas_states')
        .upsert(upsertData)
        .select('*');

      if (error) throw error;
      
      // Cache locally for instant loading
      if (data && data[0]) {
        const canvasState = this.transformRowToState(data[0]);
        this.cacheCanvasState(projectId, canvasState);
      }
      
      return { success: true, data: data?.[0] };
    } catch (error) {
      console.error('Failed to save canvas state:', error);
      return { success: false, error };
    }
  }

  // Load canvas state from database with proper typing
  static async loadCanvasState(): Promise<CanvasState | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();
      
      // Try cache first for instant loading
      const cached = this.getCachedCanvasState(projectId);
      
      try {
        // Use native Supabase types
        const { data, error } = await supabase
          .from('canvas_states')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', authData.user.id)
          .limit(1);

        if (error) {
          console.error('Failed to load canvas state:', error);
          return cached;
        }

        if (!data || data.length === 0) {
          return cached;
        }

        const canvasState = this.transformRowToState(data[0]);
        
        // Cache the latest data
        this.cacheCanvasState(projectId, canvasState);
        return canvasState;
      } catch (queryError) {
        console.error('Query failed:', queryError);
        return cached;
      }
      
    } catch (error) {
      console.error('Failed to load canvas state:', error);
      // Return cached data as fallback
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const projectId = await ProjectService.getCurrentProject();
          return this.getCachedCanvasState(projectId);
        }
      } catch {
        // Ignore nested errors
      }
      return null;
    }
  }

  // Transform database row to our application state type
  private static transformRowToState(row: CanvasStateRow): CanvasState {
    return {
      id: row.id,
      project_id: row.project_id || '',
      user_id: row.user_id,
      nodes: Array.isArray(row.nodes) ? row.nodes : [],
      edges: Array.isArray(row.edges) ? row.edges : [],
      viewport: typeof row.viewport === 'object' && row.viewport ? 
        row.viewport as CanvasState['viewport'] : 
        { x: 0, y: 0, zoom: 1 },
      ui_state: typeof row.ui_state === 'object' && row.ui_state ?
        row.ui_state as CanvasState['ui_state'] :
        { showAnnotations: true, galleryTool: 'cursor', groupDisplayModes: {}, selectedNodes: [] },
      updated_at: row.updated_at || undefined
    };
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
  static async createDefaultState(sessionName?: string): Promise<CanvasState> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('User not authenticated');

    const projectId = await ProjectService.getCurrentProject();
    
    return {
      project_id: projectId,
      user_id: authData.user.id,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      ui_state: {
        showAnnotations: true,
        galleryTool: 'cursor',
        groupDisplayModes: {},
        selectedNodes: []
      }
    };
  }

  // Clear canvas state for new session with proper typing
  static async clearCanvasState(): Promise<void> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      // Use typed delete operation
      const { error } = await supabase
        .from('canvas_states')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', authData.user.id);

      if (error) throw error;

      // Clear local cache for this project
      this.clearCache(projectId);
    } catch (error) {
      console.error('Failed to clear canvas state:', error);
    }
  }

  // No cleanup needed since we removed debouncing
  static cleanup(): void {
    // Reserved for future cleanup operations
  }
}