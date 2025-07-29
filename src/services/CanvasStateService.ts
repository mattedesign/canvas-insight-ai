import { supabase } from '@/integrations/supabase/client';
import { ProjectService } from './DataMigrationService';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { Node, Edge } from '@xyflow/react';

// Use native Supabase types
type CanvasStateRow = Tables<'canvas_states'>;
type CanvasStateInsert = TablesInsert<'canvas_states'>;

// Phase 4: Typed interfaces for JSON columns with validation
interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasUIState {
  showAnnotations: boolean;
  galleryTool: 'cursor' | 'draw';
  groupDisplayModes: Record<string, 'standard' | 'stacked'>;
  selectedNodes: string[];
}

// Validation helpers for data integrity
class CanvasDataValidator {
  static isValidViewport(viewport: any): viewport is CanvasViewport {
    return viewport && 
           typeof viewport.x === 'number' && 
           typeof viewport.y === 'number' && 
           typeof viewport.zoom === 'number';
  }

  static isValidUIState(uiState: any): uiState is CanvasUIState {
    return uiState &&
           typeof uiState.showAnnotations === 'boolean' &&
           typeof uiState.galleryTool === 'string' &&
           ['cursor', 'draw'].includes(uiState.galleryTool) &&
           typeof uiState.groupDisplayModes === 'object' &&
           Array.isArray(uiState.selectedNodes);
  }

  static isValidNodesArray(nodes: any): nodes is Node[] {
    return Array.isArray(nodes) && nodes.every(node => 
      node && typeof node.id === 'string' && typeof node.type === 'string'
    );
  }

  static isValidEdgesArray(edges: any): edges is Edge[] {
    return Array.isArray(edges) && edges.every(edge => 
      edge && typeof edge.id === 'string' && typeof edge.source === 'string' && typeof edge.target === 'string'
    );
  }
}

// Serialization/Deserialization utilities
class CanvasDataSerializer {
  static serializeForDatabase(
    state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>, 
    projectId: string, 
    userId: string
  ): CanvasStateInsert {
    try {
      return {
        project_id: projectId,
        user_id: userId,
        nodes: JSON.parse(JSON.stringify(state.nodes)) as any,
        edges: JSON.parse(JSON.stringify(state.edges)) as any,
        viewport: JSON.parse(JSON.stringify(state.viewport)) as any,
        ui_state: JSON.parse(JSON.stringify(state.ui_state)) as any
      };
    } catch (error) {
      console.error('Failed to serialize canvas data:', error);
      throw new Error('Invalid canvas data for serialization');
    }
  }

  static deserializeFromDatabase(row: CanvasStateRow): CanvasState {
    const createDefault = (projectId: string, userId: string): CanvasState => ({
      id: row.id,
      project_id: projectId,
      user_id: userId,
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      ui_state: { showAnnotations: true, galleryTool: 'cursor', groupDisplayModes: {}, selectedNodes: [] },
      updated_at: row.updated_at || undefined
    });

    try {
      const projectId = row.project_id || '';
      const userId = row.user_id || '';

      // Validate and parse nodes
      const nodes = CanvasDataValidator.isValidNodesArray(row.nodes) ? row.nodes : [];
      
      // Validate and parse edges
      const edges = CanvasDataValidator.isValidEdgesArray(row.edges) ? row.edges : [];
      
      // Validate and parse viewport
      const viewport = CanvasDataValidator.isValidViewport(row.viewport) ? 
        row.viewport : { x: 0, y: 0, zoom: 1 };
      
      // Validate and parse UI state
      const ui_state = CanvasDataValidator.isValidUIState(row.ui_state) ? 
        row.ui_state : { showAnnotations: true, galleryTool: 'cursor' as const, groupDisplayModes: {}, selectedNodes: [] };

      return {
        id: row.id,
        project_id: projectId,
        user_id: userId,
        nodes,
        edges,
        viewport,
        ui_state,
        updated_at: row.updated_at || undefined
      };
    } catch (error) {
      console.error('Failed to deserialize canvas data, using defaults:', error);
      return createDefault(row.project_id || '', row.user_id || '');
    }
  }
}

// Updated CanvasState interface to use typed viewport and ui_state
export interface CanvasState {
  id?: string;
  project_id: string;
  user_id: string;
  nodes: Node[];
  edges: Edge[];
  viewport: CanvasViewport;
  ui_state: CanvasUIState;
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

      // Use new serialization utility
      const upsertData = CanvasDataSerializer.serializeForDatabase(state, projectId, authData.user.id);

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

  // Transform database row to our application state type using new deserialization
  private static transformRowToState(row: CanvasStateRow): CanvasState {
    return CanvasDataSerializer.deserializeFromDatabase(row);
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