// Canvas State Service - isolated to avoid Supabase type recursion
// Using direct HTTP calls to bypass TypeScript type inference issues

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
  
  // Get minimal HTTP client to avoid all Supabase type inference
  private static getClient() {
    const SUPABASE_URL = "https://sdcmbfdtafkzpimwjpij.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkY21iZmR0YWZrenBpbXdqcGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NTc1MDEsImV4cCI6MjA2OTEzMzUwMX0.aYBZucbfmPjABOjmVjXd96eSeZHKAhnq2QOj4K4FWKM";
    
    return {
      async request(method: string, endpoint: string, body?: any) {
        const token = localStorage.getItem('sb-sdcmbfdtafkzpimwjpij-auth-token');
        const authData = token ? JSON.parse(token) : null;
        const accessToken = authData?.access_token || SUPABASE_KEY;
        
        const response = await fetch(`${SUPABASE_URL}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': method === 'POST' ? 'return=representation' : undefined
          },
          body: body ? JSON.stringify(body) : undefined
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      async getCurrentUser() {
        try {
          const token = localStorage.getItem('sb-sdcmbfdtafkzpimwjpij-auth-token');
          if (!token) throw new Error('No auth token');
          
          const authData = JSON.parse(token);
          return { user: authData.user, error: null };
        } catch (error) {
          return { user: null, error };
        }
      }
    };
  }

  // Save canvas state with debouncing
  static async saveCanvasState(state: Omit<CanvasState, 'id' | 'project_id' | 'user_id' | 'updated_at'>) {
    return new Promise((resolve) => {
      if (this.saveDebounceTimer) {
        clearTimeout(this.saveDebounceTimer);
      }

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
      const client = this.getClient();
      const { user } = await client.getCurrentUser();
      
      if (!user) throw new Error('User not authenticated');

      // Get project ID from localStorage or default
      const projectId = localStorage.getItem('current_project_id') || user.id;

      const payload = {
        project_id: projectId,
        user_id: user.id,
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        ui_state: state.ui_state
      };

      const result = await client.request(
        'POST', 
        '/rest/v1/canvas_states?on_conflict=project_id,user_id',
        payload
      );
      
      // Cache locally for instant loading
      if (result && result[0]) {
        this.cacheCanvasState(projectId, result[0] as CanvasState);
      }
      
      return { success: true, data: result?.[0] };
    } catch (error) {
      console.error('Failed to save canvas state:', error);
      return { success: false, error };
    }
  }

  // Load canvas state from database
  static async loadCanvasState(): Promise<CanvasState | null> {
    try {
      const client = this.getClient();
      const { user } = await client.getCurrentUser();
      
      if (!user) throw new Error('User not authenticated');

      const projectId = localStorage.getItem('current_project_id') || user.id;
      
      // Try cache first for instant loading
      const cached = this.getCachedCanvasState(projectId);
      
      try {
        const result = await client.request(
          'GET',
          `/rest/v1/canvas_states?project_id=eq.${projectId}&user_id=eq.${user.id}&limit=1`
        );
        
        if (!result || result.length === 0) {
          return cached;
        }

        const canvasState = result[0] as CanvasState;
        
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
        const projectId = localStorage.getItem('current_project_id');
        if (projectId) {
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
    const client = this.getClient();
    const { user } = await client.getCurrentUser();
    
    if (!user) throw new Error('User not authenticated');

    const projectId = localStorage.getItem('current_project_id') || user.id;
    
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
      const client = this.getClient();
      const { user } = await client.getCurrentUser();
      
      if (!user) throw new Error('User not authenticated');

      const projectId = localStorage.getItem('current_project_id') || user.id;

      await client.request(
        'DELETE',
        `/rest/v1/canvas_states?project_id=eq.${projectId}&user_id=eq.${user.id}`
      );

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