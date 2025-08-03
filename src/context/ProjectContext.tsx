/**
 * Phase 4A: Project Context Integration
 * Enhanced ProjectContext with RouterStateManager integration and local storage persistence
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { RouterStateManager, useRouterStateManager } from '@/services/RouterStateManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ProjectState {
  id: string | null;
  name: string | null;
  slug: string | null;
  description: string | null;
  isLoading: boolean;
  error: string | null;
  lastAccessed: Date | null;
  isDefault: boolean;
}

export interface ProjectContextValue {
  // Project State
  currentProject: ProjectState;
  
  // Navigation
  navigateToProject: (slug: string) => Promise<boolean>;
  navigateToDefaultWorkspace: () => Promise<boolean>;
  
  // Project Management
  createProject: (name: string, description?: string) => Promise<string | null>;
  updateProject: (updates: Partial<Pick<ProjectState, 'name' | 'description'>>) => Promise<boolean>;
  deleteProject: () => Promise<boolean>;
  
  // Local Storage Persistence
  persistProjectState: () => void;
  clearPersistedState: () => void;
  
  // Context Metadata
  getProjectMetadata: () => any;
  setProjectMetadata: (metadata: any) => void;
}

const STORAGE_KEY = 'ux-analysis-project-context';
const PERSISTENCE_VERSION = '1.0.0';

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * Enhanced Project Provider with RouterStateManager integration
 */
export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { projectSlug } = useParams<{ projectSlug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { state: routerState, setMetadata, getMetadata } = useRouterStateManager();
  
  const [currentProject, setCurrentProject] = useState<ProjectState>({
    id: null,
    name: null,
    slug: null,
    description: null,
    isLoading: false,
    error: null,
    lastAccessed: null,
    isDefault: true
  });

  /**
   * Load persisted project state from localStorage
   */
  const loadPersistedState = useCallback((): ProjectState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      if (parsed.version !== PERSISTENCE_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return {
        ...parsed.projectState,
        lastAccessed: parsed.projectState.lastAccessed ? new Date(parsed.projectState.lastAccessed) : null
      };
    } catch (error) {
      console.error('[ProjectContext] Failed to load persisted state:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  /**
   * Persist project state to localStorage
   */
  const persistProjectState = useCallback(() => {
    try {
      const stateToStore = {
        version: PERSISTENCE_VERSION,
        projectState: {
          ...currentProject,
          lastAccessed: currentProject.lastAccessed?.toISOString()
        },
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
      console.log('[ProjectContext] State persisted to localStorage');
    } catch (error) {
      console.error('[ProjectContext] Failed to persist state:', error);
    }
  }, [currentProject]);

  /**
   * Clear persisted state
   */
  const clearPersistedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[ProjectContext] Persisted state cleared');
  }, []);

  /**
   * Fetch project data from database
   */
  const fetchProjectData = useCallback(async (slug: string): Promise<ProjectState | null> => {
    if (!user) return null;
    
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Project not found
          return null;
        }
        throw error;
      }

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        isLoading: false,
        error: null,
        lastAccessed: new Date(),
        isDefault: false
      };
    } catch (error) {
      console.error('[ProjectContext] Failed to fetch project:', error);
      return null;
    }
  }, [user]);

  /**
   * Update project state and persist
   */
  const updateProjectState = useCallback((updates: Partial<ProjectState>) => {
    setCurrentProject(prev => {
      const newState = { ...prev, ...updates };
      
      // Auto-persist on significant changes
      if (updates.id || updates.slug || updates.name) {
        setTimeout(() => persistProjectState(), 100);
      }
      
      return newState;
    });
  }, [persistProjectState]);

  /**
   * Navigate to project with RouterStateManager integration
   */
  const navigateToProject = useCallback(async (slug: string): Promise<boolean> => {
    console.log(`[ProjectContext] Navigating to project: ${slug}`);
    
    updateProjectState({ isLoading: true, error: null });
    
    try {
      // Fetch project data
      const projectData = await fetchProjectData(slug);
      
      if (!projectData) {
        updateProjectState({ 
          isLoading: false, 
          error: `Project '${slug}' not found or access denied` 
        });
        return false;
      }
      
      // Update project state
      updateProjectState({
        ...projectData,
        lastAccessed: new Date()
      });
      
      // Set router metadata for project context
      setMetadata(`/canvas/${slug}`, {
        projectId: projectData.id,
        projectName: projectData.name,
        projectSlug: slug,
        contextType: 'project'
      });
      
      // Navigate using router
      navigate(`/canvas/${slug}`);
      
      console.log(`[ProjectContext] Successfully navigated to project: ${projectData.name}`);
      return true;
      
    } catch (error) {
      console.error('[ProjectContext] Navigation failed:', error);
      updateProjectState({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Navigation failed' 
      });
      return false;
    }
  }, [fetchProjectData, updateProjectState, setMetadata, navigate]);

  /**
   * Navigate to default workspace
   */
  const navigateToDefaultWorkspace = useCallback(async (): Promise<boolean> => {
    console.log('[ProjectContext] Navigating to default workspace');
    
    updateProjectState({
      id: null,
      name: null,
      slug: null,
      description: null,
      isLoading: false,
      error: null,
      lastAccessed: new Date(),
      isDefault: true
    });
    
    // Set router metadata for default workspace
    setMetadata('/canvas', {
      contextType: 'default',
      isDefaultWorkspace: true
    });
    
    navigate('/canvas');
    
    console.log('[ProjectContext] Navigated to default workspace');
    return true;
  }, [updateProjectState, setMetadata, navigate]);

  /**
   * Create new project
   */
  const createProject = useCallback(async (name: string, description?: string): Promise<string | null> => {
    if (!user) return null;
    
    console.log(`[ProjectContext] Creating project: ${name}`);
    
    try {
      // Generate slug from name
      const baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || 'project';
      
      // Create unique slug by adding timestamp
      const uniqueSlug = `${baseSlug}-${Date.now()}`;
      
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          name,
          description: description || '',
          slug: uniqueSlug,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`[ProjectContext] Project created: ${project.slug}`);
      return project.slug;
      
    } catch (error) {
      console.error('[ProjectContext] Failed to create project:', error);
      return null;
    }
  }, [user]);

  /**
   * Update current project
   */
  const updateProject = useCallback(async (updates: Partial<Pick<ProjectState, 'name' | 'description'>>): Promise<boolean> => {
    if (!currentProject.id || currentProject.isDefault) return false;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', currentProject.id);

      if (error) throw error;

      updateProjectState(updates);
      console.log('[ProjectContext] Project updated successfully');
      return true;
      
    } catch (error) {
      console.error('[ProjectContext] Failed to update project:', error);
      return false;
    }
  }, [currentProject.id, currentProject.isDefault, updateProjectState]);

  /**
   * Delete current project
   */
  const deleteProject = useCallback(async (): Promise<boolean> => {
    if (!currentProject.id || currentProject.isDefault) return false;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', currentProject.id);

      if (error) throw error;

      // Navigate to default workspace after deletion
      await navigateToDefaultWorkspace();
      clearPersistedState();
      
      console.log('[ProjectContext] Project deleted successfully');
      return true;
      
    } catch (error) {
      console.error('[ProjectContext] Failed to delete project:', error);
      return false;
    }
  }, [currentProject.id, currentProject.isDefault, navigateToDefaultWorkspace, clearPersistedState]);

  /**
   * Get project metadata from router
   */
  const getProjectMetadata = useCallback(() => {
    return getMetadata(location.pathname);
  }, [getMetadata, location.pathname]);

  /**
   * Set project metadata in router
   */
  const setProjectMetadata = useCallback((metadata: any) => {
    setMetadata(location.pathname, {
      ...getProjectMetadata(),
      ...metadata
    });
  }, [setMetadata, location.pathname, getProjectMetadata]);

  /**
   * Initialize project context on mount and route changes
   */
  useEffect(() => {
    const initializeProject = async () => {
      if (!user) {
        updateProjectState({
          id: null,
          name: null,
          slug: null,
          description: null,
          isLoading: false,
          error: null,
          lastAccessed: null,
          isDefault: true
        });
        return;
      }
      
      // Load persisted state first
      const persistedState = loadPersistedState();
      if (persistedState && persistedState.slug === projectSlug) {
        setCurrentProject(persistedState);
      }
      
      if (projectSlug) {
        // Fetch fresh project data
        const projectData = await fetchProjectData(projectSlug);
        
        if (projectData) {
          updateProjectState({
            ...projectData,
            lastAccessed: new Date()
          });
        } else {
          updateProjectState({
            isLoading: false,
            error: `Project '${projectSlug}' not found`
          });
        }
      } else {
        // Default workspace
        updateProjectState({
          id: null,
          name: null,
          slug: null,
          description: null,
          isLoading: false,
          error: null,
          lastAccessed: new Date(),
          isDefault: true
        });
      }
    };

    initializeProject();
  }, [projectSlug, user, fetchProjectData, updateProjectState, loadPersistedState]);

  /**
   * Auto-persist state changes
   */
  useEffect(() => {
    if (currentProject.id || currentProject.isDefault) {
      persistProjectState();
    }
  }, [currentProject, persistProjectState]);

  /**
   * Memoized context value
   */
  const contextValue = useMemo<ProjectContextValue>(() => ({
    currentProject,
    navigateToProject,
    navigateToDefaultWorkspace,
    createProject,
    updateProject,
    deleteProject,
    persistProjectState,
    clearPersistedState,
    getProjectMetadata,
    setProjectMetadata
  }), [
    currentProject,
    navigateToProject,
    navigateToDefaultWorkspace,
    createProject,
    updateProject,
    deleteProject,
    persistProjectState,
    clearPersistedState,
    getProjectMetadata,
    setProjectMetadata
  ]);

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

/**
 * Hook to access project context
 */
export const useProjectContext = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

/**
 * Hook for project-specific navigation guards
 */
export const useProjectNavigationGuards = () => {
  const { currentProject } = useProjectContext();
  const { addGuard, removeGuard } = useRouterStateManager();

  useEffect(() => {
    // Add project-specific navigation guard
    const projectGuard = {
      id: 'project-context-guard',
      priority: 100,
      predicate: async (from: string, to: string, params: Record<string, string>) => {
        // Allow navigation within same project
        if (from.includes('/canvas/') && to.includes('/canvas/')) {
          const fromProject = from.split('/canvas/')[1]?.split('/')[0];
          const toProject = to.split('/canvas/')[1]?.split('/')[0];
          
          if (fromProject === toProject) {
            return true;
          }
        }
        
        // Always allow navigation to dashboard, auth, etc.
        if (!to.includes('/canvas/')) {
          return true;
        }
        
        // Check if target project exists and is accessible
        // This would involve checking permissions, etc.
        return true; // Simplified for now
      }
    };

    addGuard(projectGuard);

    return () => {
      removeGuard('project-context-guard');
    };
  }, [currentProject, addGuard, removeGuard]);
};