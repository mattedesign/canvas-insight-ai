import { supabase } from '@/integrations/supabase/client';
import { ProjectService } from './DataMigrationService';

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
  private static saveDebounceTimer: NodeJS.Timeout | null = null;
  private static readonly SAVE_DEBOUNCE_MS = 1000;
  
  // Save canvas state to database with debouncing
  static async saveCanvasState(state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>) {
    return new Promise((resolve) => {
      // Clear existing timer
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
      }

      // Set new timer
      this.saveDebounceTimer = setTimeout(async () => {
        try {
          const result = await this.saveCanvasStateImmediate(state);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error });
        }
      }, this.SAVE_DEBOUNCE_MS);
    });
  }

  // Save canvas state immediately - using direct SQL to avoid type issues
  static async saveCanvasStateImmediate(state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      // Direct upsert with explicit typing
      const { data, error } = await supabase
        .from('canvas_states')
        .upsert({
          project_id: projectId,
          user_id: authData.user.id,
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          ui_state: state.ui_state
        })
        .select('*');

      if (error) throw error;
      
      // Cache locally for instant loading
      if (data && data[0]) {
        this.cacheCanvasState(projectId, data[0] as unknown as CanvasState);
      }
      
      return { success: true, data: data?.[0] };
    } catch (error) {
      console.error('Failed to save canvas state:', error);
      return { success: false, error };
    }
  }

  // Load canvas state from database - using direct SQL to avoid type issues
  static async loadCanvasState(): Promise<CanvasState | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();
      
      // Try cache first for instant loading
      const cached = this.getCachedCanvasState(projectId);
      
      // Break the type recursion by completely avoiding the problematic query builder
      try {
        const query = supabase.from('canvas_states');
        const selectQuery = query.select('*');
        const projectQuery = selectQuery.eq('project_id', projectId);
        const userQuery = projectQuery.eq('user_id', authData.user.id);
        const limitQuery = userQuery.limit(1);
        const result = await limitQuery;
        
        const data = result.data;
        const error = result.error;

        if (error) {
          console.error('Failed to load canvas state:', error);
          return cached;
        }

        if (!data || data.length === 0) {
          return cached;
        }

        const canvasState = data[0] as unknown as CanvasState;
        
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

  // Clear canvas state for new session - using direct SQL to avoid type issues
  static async clearCanvasState(): Promise<void> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      // Direct delete with explicit typing
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

  // Clean up timers
  static cleanup(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
  }
}