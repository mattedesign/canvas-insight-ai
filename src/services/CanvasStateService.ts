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

  // Save canvas state immediately
  static async saveCanvasStateImmediate(state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      const { data, error } = await supabase
        .from('canvas_states')
        .upsert({
          project_id: projectId,
          user_id: user.id,
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
          ui_state: state.ui_state
        }, {
          onConflict: 'project_id,user_id'
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
  static async loadCanvasState(): Promise<CanvasState | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();
      
      // Try cache first for instant loading
      const cached = this.getCachedCanvasState(projectId);
      
      // Load from database
      const result: any = await supabase
        .from('canvas_states')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      const data = result.data;
      const error = result.error;

      if (error) {
        console.error('Failed to load canvas state:', error);
        return cached;
      }

      if (!data) {
        // No data found, return cached or null
        return cached;
      }

      // Cache the latest data
      this.cacheCanvasState(projectId, data as unknown as CanvasState);
      
      return data as unknown as CanvasState;
    } catch (error) {
      console.error('Failed to load canvas state:', error);
      // Return cached data as fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const projectId = await ProjectService.getCurrentProject();
        return this.getCachedCanvasState(projectId);
      }
      return null;
    }
  }

  // Cache canvas state locally for instant loading
  private static cacheCanvasState(projectId: string, state: any) {
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
  private static getCache(): Record<string, any> {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const projectId = await ProjectService.getCurrentProject();
    
    return {
      project_id: projectId,
      user_id: user.id,
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

  // Clear canvas state for new session
  static async clearCanvasState(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const projectId = await ProjectService.getCurrentProject();

      await supabase
        .from('canvas_states')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);

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