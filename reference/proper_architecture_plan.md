# COMPLETE PROJECT-SCOPED ARCHITECTURE REBUILD
## Lovable Implementation Guide with AI Assistant Instructions

---

## 🎯 OBJECTIVE
Replace the current broken multi-project polling architecture with a clean, project-scoped data architecture that eliminates race conditions and infinite loops.

## 📋 AI ASSISTANT INSTRUCTIONS FOR LOVABLE

**CRITICAL RULES FOR AI ASSISTANT:**
1. **Follow this document EXACTLY** - no deviations or "improvements"
2. **Complete ALL steps in sequence** - do not skip or reorder
3. **Test after each phase** - ensure functionality before proceeding
4. **Use EXACT code provided** - do not modify variable names or structure
5. **If any step fails, STOP and ask for guidance** - do not attempt fixes
6. **Preserve all existing UI/UX behavior** - only change internal architecture
7. **Each phase should take 2-4 hours maximum** - if longer, break it down

---

## 🏗️ NEW ARCHITECTURE OVERVIEW

### BEFORE (Broken):
```
User → Load ALL images → Filter by project → Display (BROKEN)
```

### AFTER (Fixed):
```
User → Switch to Project ID → Load ONLY project images → Display (WORKS)
```

### Core Principles:
1. **Project-First Database Queries** - Every query includes `project_id`
2. **Single Source of Truth** - One context, one state manager
3. **No Cross-Project Data** - Complete isolation between projects
4. **Atomic Operations** - No race conditions between project switches

---

## 🗄️ PHASE 1: DATABASE SCHEMA UPDATES (Day 1)

### Step 1.1: Update Database Schema

**📁 CREATE:** `supabase/migrations/20250131000001_project_scoped_architecture.sql`

```sql
-- Ensure all tables have proper project_id foreign keys
-- and indexes for performance

-- Add project_id to tables that might be missing it
ALTER TABLE public.ux_analyses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.image_groups 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update existing records to have project_id (from their related images)
UPDATE public.ux_analyses 
SET project_id = (
  SELECT i.project_id 
  FROM public.images i 
  WHERE i.id = ux_analyses.image_id
)
WHERE project_id IS NULL;

UPDATE public.image_groups 
SET project_id = (
  SELECT i.project_id 
  FROM public.images i 
  JOIN public.group_images gi ON gi.image_id = i.id 
  WHERE gi.group_id = image_groups.id 
  LIMIT 1
)
WHERE project_id IS NULL;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_images_project_id_created 
ON public.images(project_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_analyses_project_id_created 
ON public.ux_analyses(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_groups_project_id_created 
ON public.image_groups(project_id, created_at DESC);

-- Update RLS policies to be project-aware
DROP POLICY IF EXISTS "Users can view own images" ON public.images;
CREATE POLICY "Users can view own project images" 
ON public.images FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own analyses" ON public.ux_analyses;
CREATE POLICY "Users can view own project analyses" 
ON public.ux_analyses FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own groups" ON public.image_groups;
CREATE POLICY "Users can view own project groups" 
ON public.image_groups FOR SELECT 
USING (auth.uid() = user_id);
```

### Step 1.2: Run Migration

**COMMAND:**
```bash
# In Lovable terminal
supabase db reset
```

**VERIFY:** Check that all tables have `project_id` columns and indexes.

---

## 🔧 PHASE 2: PROJECT SERVICE SIMPLIFICATION (Day 2)

### Step 2.1: Simplify ProjectService

**📝 REPLACE:** `src/services/ProjectService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';

export class ProjectService {
  private static currentProjectId: string | null = null;
  
  /**
   * Get current project ID - always returns a valid project
   */
  static async getCurrentProject(): Promise<string> {
    // If we have a cached project, return it
    if (this.currentProjectId) {
      return this.currentProjectId;
    }
    
    // Try to get user's most recent project
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);
      
    if (error) throw error;
    
    if (projects && projects.length > 0) {
      this.currentProjectId = projects[0].id;
      return this.currentProjectId;
    }
    
    // No projects exist - create a default one
    const newProject = await this.createDefaultProject();
    return newProject.id;
  }
  
  /**
   * Switch to a specific project
   */
  static async switchToProject(projectId: string): Promise<void> {
    console.log('[ProjectService] Switching to project:', projectId);
    
    // Verify project exists and user has access
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();
      
    if (error || !project) {
      throw new Error(`Project ${projectId} not found or access denied`);
    }
    
    // Update cache
    this.currentProjectId = projectId;
    
    // Emit event for contexts to reload data
    window.dispatchEvent(new CustomEvent('projectChanged', {
      detail: { projectId, timestamp: Date.now() }
    }));
    
    console.log('[ProjectService] Successfully switched to:', project.name);
  }
  
  /**
   * Create a new project
   */
  static async createNewProject(name?: string): Promise<{ id: string; name: string; slug: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const projectName = name || `Project ${Date.now()}`;
    const slug = this.generateSlug(projectName);
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        slug,
        description: `Created on ${new Date().toLocaleDateString()}`
      })
      .select('id, name, slug')
      .single();
      
    if (error) throw error;
    
    // Switch to new project
    await this.switchToProject(project.id);
    
    return project;
  }
  
  /**
   * Get all user projects
   */
  static async getAllProjects() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        slug,
        created_at,
        updated_at,
        images:images(count),
        analyses:ux_analyses(count)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
      
    if (error) throw error;
    return projects || [];
  }
  
  /**
   * Create default project if none exists
   */
  private static async createDefaultProject() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: 'My First Project',
        slug: 'my-first-project',
        description: 'Your first UX analysis project'
      })
      .select('id, name, slug')
      .single();
      
    if (error) throw error;
    
    this.currentProjectId = project.id;
    return project;
  }
  
  /**
   * Generate URL-safe slug
   */
  private static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  }
  
  /**
   * Clear project cache (for logout)
   */
  static clearCache(): void {
    this.currentProjectId = null;
  }
}
```

---

## 📊 PHASE 3: PROJECT-SCOPED DATA SERVICES (Day 3)

### Step 3.1: Create Project-Scoped Image Service

**📁 CREATE:** `src/services/ProjectScopedImageService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { ProjectService } from './ProjectService';
import type { UploadedImage } from '@/context/AppStateTypes';

export class ProjectScopedImageService {
  /**
   * Load images for current project only
   */
  static async loadProjectImages(): Promise<UploadedImage[]> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      console.log('[ProjectScopedImageService] Loading images for project:', projectId);
      
      const { data: images, error } = await supabase
        .from('images')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });
        
      if (error) throw error;
      if (!images) return [];
      
      console.log('[ProjectScopedImageService] Found', images.length, 'images');
      
      return images.map(img => {
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(img.storage_path);
          
        return {
          id: img.id,
          name: img.original_name,
          url: urlData.publicUrl,
          file: new File([], img.original_name, { type: 'image/*' }),
          dimensions: img.dimensions as { width: number; height: number },
          status: 'completed' as const
        };
      });
    } catch (error) {
      console.error('[ProjectScopedImageService] Failed to load images:', error);
      return [];
    }
  }
  
  /**
   * Upload images to current project
   */
  static async uploadImages(files: File[]): Promise<UploadedImage[]> {
    const projectId = await ProjectService.getCurrentProject();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    console.log('[ProjectScopedImageService] Uploading', files.length, 'images to project:', projectId);
    
    const uploadedImages: UploadedImage[] = [];
    
    for (const file of files) {
      try {
        const imageId = crypto.randomUUID();
        const fileName = `${user.id}/${projectId}/${imageId}/${file.name}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        
        // Get image dimensions
        const dimensions = await this.getImageDimensions(file);
        
        // Save to database
        const { data: dbImage, error: dbError } = await supabase
          .from('images')
          .insert({
            id: imageId,
            project_id: projectId,
            user_id: user.id,
            filename: file.name,
            original_name: file.name,
            storage_path: fileName,
            dimensions,
            file_size: file.size,
            file_type: file.type
          })
          .select('*')
          .single();
          
        if (dbError) throw dbError;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);
          
        uploadedImages.push({
          id: imageId,
          name: file.name,
          url: urlData.publicUrl,
          file,
          dimensions,
          status: 'completed'
        });
        
      } catch (error) {
        console.error('[ProjectScopedImageService] Failed to upload:', file.name, error);
      }
    }
    
    console.log('[ProjectScopedImageService] Successfully uploaded', uploadedImages.length, 'images');
    return uploadedImages;
  }
  
  /**
   * Delete image from current project
   */
  static async deleteImage(imageId: string): Promise<void> {
    const projectId = await ProjectService.getCurrentProject();
    
    // Delete from database (cascades to analyses)
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
      .eq('project_id', projectId);
      
    if (error) throw error;
    
    console.log('[ProjectScopedImageService] Deleted image:', imageId);
  }
  
  /**
   * Get image dimensions from file
   */
  private static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  }
}
```

### Step 3.2: Create Project-Scoped Analysis Service

**📁 CREATE:** `src/services/ProjectScopedAnalysisService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { ProjectService } from './ProjectService';
import type { LegacyUXAnalysis as UXAnalysis } from '@/context/AppStateTypes';

export class ProjectScopedAnalysisService {
  /**
   * Load analyses for current project only
   */
  static async loadProjectAnalyses(): Promise<UXAnalysis[]> {
    try {
      const projectId = await ProjectService.getCurrentProject();
      console.log('[ProjectScopedAnalysisService] Loading analyses for project:', projectId);
      
      const { data: analyses, error } = await supabase
        .from('ux_analyses')
        .select(`
          *,
          images!inner(original_name, storage_path)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (!analyses) return [];
      
      console.log('[ProjectScopedAnalysisService] Found', analyses.length, 'analyses');
      
      return analyses.map(analysis => ({
        id: analysis.id,
        imageId: analysis.image_id,
        imageName: analysis.images.original_name,
        imageUrl: this.getImageUrl(analysis.images.storage_path),
        userContext: analysis.user_context || '',
        visualAnnotations: analysis.visual_annotations as any || [],
        suggestions: analysis.suggestions as any || [],
        summary: analysis.summary as any || {},
        metadata: analysis.metadata as any || {},
        status: 'completed' as const,
        createdAt: new Date(analysis.created_at)
      }));
    } catch (error) {
      console.error('[ProjectScopedAnalysisService] Failed to load analyses:', error);
      return [];
    }
  }
  
  /**
   * Create analysis for image in current project
   */
  static async createAnalysis(analysisData: {
    imageId: string;
    userContext?: string;
    visualAnnotations?: any[];
    suggestions?: any[];
    summary?: any;
    metadata?: any;
  }): Promise<UXAnalysis> {
    const projectId = await ProjectService.getCurrentProject();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: analysis, error } = await supabase
      .from('ux_analyses')
      .insert({
        project_id: projectId,
        user_id: user.id,
        image_id: analysisData.imageId,
        user_context: analysisData.userContext,
        visual_annotations: analysisData.visualAnnotations,
        suggestions: analysisData.suggestions,
        summary: analysisData.summary,
        metadata: analysisData.metadata,
        status: 'completed'
      })
      .select(`
        *,
        images!inner(original_name, storage_path)
      `)
      .single();
      
    if (error) throw error;
    
    return {
      id: analysis.id,
      imageId: analysis.image_id,
      imageName: analysis.images.original_name,
      imageUrl: this.getImageUrl(analysis.images.storage_path),
      userContext: analysis.user_context || '',
      visualAnnotations: analysis.visual_annotations as any || [],
      suggestions: analysis.suggestions as any || [],
      summary: analysis.summary as any || {},
      metadata: analysis.metadata as any || {},
      status: 'completed',
      createdAt: new Date(analysis.created_at)
    };
  }
  
  /**
   * Delete analysis from current project
   */
  static async deleteAnalysis(analysisId: string): Promise<void> {
    const projectId = await ProjectService.getCurrentProject();
    
    const { error } = await supabase
      .from('ux_analyses')
      .delete()
      .eq('id', analysisId)
      .eq('project_id', projectId);
      
    if (error) throw error;
    
    console.log('[ProjectScopedAnalysisService] Deleted analysis:', analysisId);
  }
  
  /**
   * Get public URL for image
   */
  private static getImageUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }
}
```

---

## ⚛️ PHASE 4: SIMPLIFIED STATE MANAGEMENT (Day 4)

### Step 4.1: Create New App State Manager

**📁 CREATE:** `src/hooks/useProjectScopedState.tsx`

```typescript
import { useReducer, useCallback, useRef } from 'react';
import { ProjectScopedImageService } from '@/services/ProjectScopedImageService';
import { ProjectScopedAnalysisService } from '@/services/ProjectScopedAnalysisService';
import type { UploadedImage, LegacyUXAnalysis as UXAnalysis } from '@/context/AppStateTypes';

interface ProjectState {
  images: UploadedImage[];
  analyses: UXAnalysis[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

type ProjectAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_IMAGES'; payload: UploadedImage[] }
  | { type: 'SET_ANALYSES'; payload: UXAnalysis[] }
  | { type: 'ADD_IMAGES'; payload: UploadedImage[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'RESET_PROJECT' };

const initialState: ProjectState = {
  images: [],
  analyses: [],
  loading: false,
  error: null,
  lastUpdated: 0
};

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
      
    case 'SET_IMAGES':
      return { 
        ...state, 
        images: action.payload, 
        lastUpdated: Date.now(),
        error: null 
      };
      
    case 'SET_ANALYSES':
      return { 
        ...state, 
        analyses: action.payload, 
        lastUpdated: Date.now(),
        error: null 
      };
      
    case 'ADD_IMAGES':
      return { 
        ...state, 
        images: [...state.images, ...action.payload],
        lastUpdated: Date.now()
      };
      
    case 'REMOVE_IMAGE':
      return { 
        ...state, 
        images: state.images.filter(img => img.id !== action.payload),
        analyses: state.analyses.filter(analysis => analysis.imageId !== action.payload),
        lastUpdated: Date.now()
      };
      
    case 'RESET_PROJECT':
      return initialState;
      
    default:
      return state;
  }
}

export const useProjectScopedState = () => {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const loadingRef = useRef(false);
  
  // Load all project data
  const loadProjectData = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      console.log('[useProjectScopedState] Loading project data...');
      
      const [images, analyses] = await Promise.all([
        ProjectScopedImageService.loadProjectImages(),
        ProjectScopedAnalysisService.loadProjectAnalyses()
      ]);
      
      dispatch({ type: 'SET_IMAGES', payload: images });
      dispatch({ type: 'SET_ANALYSES', payload: analyses });
      
      console.log('[useProjectScopedState] Loaded:', {
        images: images.length,
        analyses: analyses.length
      });
      
    } catch (error) {
      console.error('[useProjectScopedState] Failed to load project data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      loadingRef.current = false;
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  // Upload images
  const uploadImages = useCallback(async (files: File[]) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      console.log('[useProjectScopedState] Uploading', files.length, 'images...');
      
      const uploadedImages = await ProjectScopedImageService.uploadImages(files);
      dispatch({ type: 'ADD_IMAGES', payload: uploadedImages });
      
      console.log('[useProjectScopedState] Upload completed:', uploadedImages.length, 'images');
      
    } catch (error) {
      console.error('[useProjectScopedState] Upload failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);
  
  // Delete image
  const deleteImage = useCallback(async (imageId: string) => {
    try {
      await ProjectScopedImageService.deleteImage(imageId);
      dispatch({ type: 'REMOVE_IMAGE', payload: imageId });
      
      console.log('[useProjectScopedState] Deleted image:', imageId);
      
    } catch (error) {
      console.error('[useProjectScopedState] Delete failed:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, []);
  
  // Reset project (for project switches)
  const resetProject = useCallback(() => {
    dispatch({ type: 'RESET_PROJECT' });
  }, []);
  
  return {
    // State
    images: state.images,
    analyses: state.analyses,
    loading: state.loading,
    error: state.error,
    
    // Actions
    loadProjectData,
    uploadImages,
    deleteImage,
    resetProject
  };
};
```

### Step 4.2: Create Simple App Context

**📝 REPLACE:** `src/context/AppContext.tsx`

```typescript
import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProjectScopedState } from '@/hooks/useProjectScopedState';
import { ProjectService } from '@/services/ProjectService';

interface AppContextType {
  // State
  images: ReturnType<typeof useProjectScopedState>['images'];
  analyses: ReturnType<typeof useProjectScopedState>['analyses'];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadProjectData: () => Promise<void>;
  uploadImages: (files: File[]) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  resetProject: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const projectState = useProjectScopedState();
  
  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = async (event: CustomEvent) => {
      console.log('[AppContext] Project changed, reloading data...');
      projectState.resetProject();
      await projectState.loadProjectData();
    };
    
    window.addEventListener('projectChanged', handleProjectChange as any);
    return () => window.removeEventListener('projectChanged', handleProjectChange as any);
  }, [projectState]);
  
  // Load data on user login
  useEffect(() => {
    if (user) {
      console.log('[AppContext] User authenticated, loading project data...');
      projectState.loadProjectData();
    } else {
      console.log('[AppContext] User logged out, clearing data...');
      projectState.resetProject();
      ProjectService.clearCache();
    }
  }, [user?.id, projectState]);
  
  const contextValue: AppContextType = {
    // State
    images: projectState.images,
    analyses: projectState.analyses,
    loading: projectState.loading,
    error: projectState.error,
    
    // Actions
    loadProjectData: projectState.loadProjectData,
    uploadImages: projectState.uploadImages,
    deleteImage: projectState.deleteImage,
    resetProject: projectState.resetProject
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Convenience hooks
export const useAppImages = () => useAppContext().images;
export const useAppAnalyses = () => useAppContext().analyses;
export const useAppActions = () => {
  const { loadProjectData, uploadImages, deleteImage, resetProject } = useAppContext();
  return { loadProjectData, uploadImages, deleteImage, resetProject };
};
```

---

## 🎨 PHASE 5: UPDATE COMPONENTS (Day 5)

### Step 5.1: Update App.tsx

**📝 REPLACE:** `src/App.tsx`

```typescript
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Canvas = lazy(() => import("./pages/Canvas"));
const Projects = lazy(() => import("./pages/Projects"));
const Auth = lazy(() => import("./pages/Auth"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <BrowserRouter>
              <div className="min-h-screen bg-background">
                <Suspense fallback={<div>Loading...</div>}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/projects" element={
                      <ProtectedRoute>
                        <Projects />
                      </ProtectedRoute>
                    } />
                    <Route path="/canvas/:slug?" element={
                      <ProtectedRoute>
                        <Canvas />
                      </ProtectedRoute>
                    } />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </Suspense>
              </div>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
```

### Step 5.2: Update Canvas Component

**📝 REPLACE:** `src/pages/Canvas.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ProjectService } from '@/services/ProjectService';
import { Sidebar } from '@/components/Sidebar';

const Canvas = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { images, loading, error, uploadImages } = useAppContext();
  const [projectLoaded, setProjectLoaded] = useState(false);
  
  // Handle project loading from slug
  useEffect(() => {
    const loadProject = async () => {
      try {
        if (slug) {
          console.log('[Canvas] Loading project by slug:', slug);
          
          // Get project by slug
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .eq('slug', slug)
            .single();
            
          if (!projects) {
            console.error('[Canvas] Project not found:', slug);
            navigate('/projects');
            return;
          }
          
          // Switch to project
          await ProjectService.switchToProject(projects.id);
          setProjectLoaded(true);
          
          console.log('[Canvas] Project loaded successfully:', projects.name);
        }
      } catch (error) {
        console.error('[Canvas] Failed to load project:', error);
        navigate('/projects');
      }
    };
    
    loadProject();
  }, [slug, navigate]);
  
  // Handle file drop
  const handleFileDrop = async (files: File[]) => {
    if (!projectLoaded) return;
    
    console.log('[Canvas] Uploading', files.length, 'files...');
    await uploadImages(files);
  };
  
  if (!projectLoaded) {
    return <div>Loading project...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">Error: {error}</div>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Canvas</h1>
          <p className="text-gray-600">
            {loading ? 'Loading...' : `${images.length} images loaded`}
          </p>
        </div>
        
        {/* Simple upload zone */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          onDrop={(e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            handleFileDrop(files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <p>Drop images here or click to upload</p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              handleFileDrop(files);
            }}
            className="mt-4"
          />
        </div>
        
        {/* Simple image grid */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          {images.map((image) => (
            <div key={image.id} className="border rounded-lg p-2">
              <img 
                src={image.url} 
                alt={image.name}
                className="w-full h-32 object-cover rounded"
              />
              <p className="text-sm mt-2 truncate">{image.name}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Canvas;
```

### Step 5.3: Update Projects Component

**📝 REPLACE:** `src/pages/Projects.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectService } from '@/services/ProjectService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Projects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProjects();
  }, []);
  
  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await ProjectService.getAllProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const createNewProject = async () => {
    try {
      const project = await ProjectService.createNewProject();
      
      toast({
        title: "Project created",
        description: `"${project.name}" is ready for analysis`
      });
      
      // Navigate to new project
      navigate(`/canvas/${project.slug}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive"
      });
    }
  };
  
  const openProject = async (project: any) => {
    try {
      await ProjectService.switchToProject(project.id);
      navigate(`/canvas/${project.slug}`);
    } catch (error) {
      console.error('Failed to open project:', error);
      toast({
        title: "Error",
        description: "Failed to open project",
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return <div className="p-8">Loading projects...</div>;
  }
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button onClick={createNewProject}>
          + New Project
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: any) => (
          <Card key={project.id} className="cursor-pointer hover:shadow-lg">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <p className="text-sm text-gray-600">{project.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {project.images?.[0]?.count || 0} images
                </div>
                <Button 
                  size="sm"
                  onClick={() => openProject(project)}
                >
                  Open
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {projects.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first project to get started with UX analysis
          </p>
          <Button onClick={createNewProject}>
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  );
};

export default Projects;
```

---

## ✅ PHASE 6: TESTING & VALIDATION (Day 6)

### Step 6.1: Test Checklist

**🧪 MANUAL TESTING STEPS:**

1. **Project Creation**
   - [ ] Can create new project
   - [ ] Project appears in projects list
   - [ ] Navigates to canvas correctly

2. **Image Upload**
   - [ ] Can upload images to project
   - [ ] Images display immediately
   - [ ] Images persist after refresh

3. **Project Switching**
   - [ ] Can switch between projects
   - [ ] Each project shows only its images
   - [ ] No cross-project data contamination

4. **Data Persistence**
   - [ ] Refresh page maintains project context
   - [ ] Images remain in correct project
   - [ ] No images lost during project switches

### Step 6.2: Performance Validation

**📊 METRICS TO CHECK:**

```typescript
// Add this to Canvas.tsx for testing
useEffect(() => {
  console.log('[Performance] Canvas render:', {
    imageCount: images.length,
    renderTime: Date.now(),
    projectLoaded
  });
}, [images.length, projectLoaded]);
```

**SUCCESS CRITERIA:**
- [ ] Canvas loads in < 2 seconds
- [ ] Image upload completes in < 5 seconds
- [ ] Project switching takes < 1 second
- [ ] No infinite loops in console
- [ ] Memory usage stable over time

---

## 🚀 DEPLOYMENT STEPS

### Step 6.3: Final Cleanup

**🗑️ DELETE OLD FILES:**
```bash
# Delete old problematic files
rm src/services/AtomicStateManager.ts
rm src/services/DataMigrationService.ts
rm src/context/SimplifiedAppContext.tsx
rm src/hooks/useLoadingStateMachine.tsx
```

### Step 6.4: Update Dependencies

**📦 VERIFY IMPORTS:**
Run through project and update any remaining imports to use new services.

---

## 📋 SUCCESS VALIDATION

**✅ AFTER COMPLETION, YOU SHOULD HAVE:**

1. **Clean Architecture**
   - ✅ One context, one state manager
   - ✅ Project-scoped database queries
   - ✅ No race conditions between projects

2. **Working Features**
   - ✅ Create projects
   - ✅ Upload images to specific projects
   - ✅ Switch between projects cleanly
   - ✅ Images display correctly

3. **Performance**
   - ✅ Fast loading (< 2 seconds)
   - ✅ No infinite loops
   - ✅ Stable memory usage

4. **Reliability**
   - ✅ No data loss during project switches
   - ✅ Images always appear in correct project
   - ✅ Refresh maintains project context

---

## 🆘 TROUBLESHOOTING

**IF SOMETHING BREAKS:**

1. **Check Console Logs**
   - Look for specific error messages
   - Note which phase/step caused the issue

2. **Revert Changes**
   ```bash
   git checkout HEAD~1  # Go back one commit
   ```

3. **Test Individual Components**
   - Test ProjectService methods in browser console
   - Verify database schema changes
   - Check API calls in network tab

4. **Ask for Help**
   - Provide exact error message
   - Share console logs
   - Mention which step failed

---

**Remember: This architecture eliminates the root cause (cross-project data pollution) rather than treating symptoms. Follow each step exactly as written for guaranteed success! 🎯**
