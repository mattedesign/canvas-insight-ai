import { supabase } from '@/integrations/supabase/client';
import { SlugService } from './SlugService';

interface ProjectWithCounts {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  images: Array<{ count: number }>;
  ux_analyses: Array<{ count: number }>;
}

interface ProjectStats {
  imageCount: number;
  analysisCount: number;
}

/**
 * ✅ OPTIMIZATION 1: Intelligent Project Statistics Cache
 * Caches project statistics to avoid repeated database queries
 */
class ProjectStatsCache {
  private static cache = new Map<string, { stats: ProjectStats; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static get(projectId: string): ProjectStats | null {
    const cached = this.cache.get(projectId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.stats;
    }
    return null;
  }

  static set(projectId: string, stats: ProjectStats): void {
    this.cache.set(projectId, {
      stats,
      timestamp: Date.now()
    });
  }

  static invalidate(projectId: string): void {
    this.cache.delete(projectId);
  }

  static clear(): void {
    this.cache.clear();
  }
}

/**
 * ✅ OPTIMIZATION 2: Optimized Project Service
 * Fixes empty query logic and implements query batching
 */
export class OptimizedProjectService {
  private static currentProjectId: string | null = null;
  private static isSwitching = false;

  static async getCurrentProject() {
    try {
      if (this.currentProjectId) {
        console.log('[OptimizedProjectService] Using cached project ID:', this.currentProjectId);
        return this.currentProjectId;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[OptimizedProjectService] User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[OptimizedProjectService] Looking for existing projects for user:', user.id);

      // Get or create default project for user
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('[OptimizedProjectService] Error fetching projects:', error);
        throw error;
      }

      if (projects && projects.length > 0) {
        this.currentProjectId = projects[0].id;
        console.log('[OptimizedProjectService] Found existing project:', this.currentProjectId);
        return this.currentProjectId;
      }

      console.log('[OptimizedProjectService] No projects found, creating default project...');

      // Create default project with slug
      const slug = await SlugService.generateUniqueSlug('Default Project');
      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: 'Default Project',
          description: 'Your UX analysis workspace',
          slug
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[OptimizedProjectService] Error creating project:', createError);
        throw createError;
      }
      
      this.currentProjectId = newProject.id;
      console.log('[OptimizedProjectService] Created new project:', this.currentProjectId);
      return this.currentProjectId;
    } catch (error) {
      console.error('[OptimizedProjectService] getCurrentProject failed:', error);
      throw error;
    }
  }

  /**
   * ✅ OPTIMIZATION 3: Batched Project Statistics Query
   * Single optimized query instead of N+2 queries per project
   */
  static async getAllProjects(): Promise<ProjectWithCounts[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get basic project info first
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    if (!projects || projects.length === 0) return [];

    // ✅ FIX: Use single batched query for all project statistics
    const projectIds = projects.map(p => p.id);
    
    // Single query to get all image counts
    const { data: imageCounts } = await supabase
      .from('images')
      .select('project_id, id')
      .in('project_id', projectIds);

    // Single query to get all analysis counts
    // ✅ FIX: Only query analyses if we have images
    const imageCountsByProject = new Map<string, number>();
    const analysisCountsByProject = new Map<string, number>();
    
    // Count images per project
    imageCounts?.forEach(img => {
      const count = imageCountsByProject.get(img.project_id) || 0;
      imageCountsByProject.set(img.project_id, count + 1);
    });

    // Only query analyses for projects that have images
    const projectsWithImages = Array.from(imageCountsByProject.keys());
    
    if (projectsWithImages.length > 0) {
      // Get all image IDs for projects with images
      const { data: allImages } = await supabase
        .from('images')
        .select('id, project_id')
        .in('project_id', projectsWithImages);

      if (allImages && allImages.length > 0) {
        const allImageIds = allImages.map(img => img.id);
        
        // Single query to get all analysis counts
        const { data: allAnalyses } = await supabase
          .from('ux_analyses')
          .select('image_id')
          .in('image_id', allImageIds);

        // Map analyses back to projects
        allAnalyses?.forEach(analysis => {
          const image = allImages.find(img => img.id === analysis.image_id);
          if (image) {
            const count = analysisCountsByProject.get(image.project_id) || 0;
            analysisCountsByProject.set(image.project_id, count + 1);
          }
        });
      }
    }

    // Combine results with caching
    const projectsWithCounts = projects.map(project => {
      const imageCount = imageCountsByProject.get(project.id) || 0;
      const analysisCount = analysisCountsByProject.get(project.id) || 0;
      
      // Cache the statistics
      ProjectStatsCache.set(project.id, { imageCount, analysisCount });
      
      return {
        ...project,
        images: [{ count: imageCount }],
        ux_analyses: [{ count: analysisCount }]
      };
    });

    console.log(`[OptimizedProjectService] Loaded ${projectsWithCounts.length} projects with optimized queries`);
    return projectsWithCounts;
  }

  /**
   * ✅ OPTIMIZATION 4: Cached Project Statistics
   * Fast retrieval of project stats without database queries
   */
  static async getProjectStatistics(projectId: string): Promise<ProjectStats> {
    // Try cache first
    const cached = ProjectStatsCache.get(projectId);
    if (cached) {
      console.log(`[OptimizedProjectService] Using cached stats for project ${projectId}`);
      return cached;
    }

    // Fallback to database with optimized queries
    const { count: imageCount } = await supabase
      .from('images')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    let analysisCount = 0;
    
    if (imageCount && imageCount > 0) {
      // Only query analyses if there are images
      const { data: projectImages } = await supabase
        .from('images')
        .select('id')
        .eq('project_id', projectId);
      
      const imageIds = projectImages?.map(img => img.id) || [];
      
      if (imageIds.length > 0) {
        const { count } = await supabase
          .from('ux_analyses')
          .select('id', { count: 'exact' })
          .in('image_id', imageIds);
        
        analysisCount = count || 0;
      }
    }

    const stats = { imageCount: imageCount || 0, analysisCount };
    
    // Cache the result
    ProjectStatsCache.set(projectId, stats);
    
    return stats;
  }

  static async createProject(name: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const slug = await SlugService.generateUniqueSlug(name);

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: description || '',
        slug
      })
      .select('*')
      .single();

    if (error) throw error;
    
    // Initialize empty stats in cache
    ProjectStatsCache.set(newProject.id, { imageCount: 0, analysisCount: 0 });
    
    return newProject;
  }

  static async getProjectBySlug(slug: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: project, error } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('[OptimizedProjectService] Project not found for slug:', slug, error);
        throw new Error(`Project not found: ${slug}`);
      }

      return project.id;
    } catch (error) {
      console.error('[OptimizedProjectService] getProjectBySlug failed:', error);
      throw error;
    }
  }

  static async switchToProject(projectId: string): Promise<void> {
    if (this.isSwitching) {
      console.log('[OptimizedProjectService] Already switching projects, waiting…');
      return;
    }

    try {
      this.isSwitching = true;
      console.log('[OptimizedProjectService] Switching to project:', projectId);

      const oldProjectId = this.currentProjectId;
      this.currentProjectId = projectId;

      // Clear cache for old project to ensure fresh data on return
      if (oldProjectId) {
        ProjectStatsCache.invalidate(oldProjectId);
      }

      // Emit project change event
      const event = new CustomEvent('projectChanged', { 
        detail: { 
          projectId, 
          oldProjectId,
          timestamp: Date.now()
        } 
      });
      window.dispatchEvent(event);

      console.log('[OptimizedProjectService] Project switched successfully to:', projectId);
    } finally {
      this.isSwitching = false;
    }
  }

  static async createNewProject(name?: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let projectName: string;
    let slug: string;

    if (name) {
      projectName = name;
      slug = await SlugService.generateUniqueSlug(name);
    } else {
      const randomProject = await SlugService.generateRandomProject();
      projectName = randomProject.name;
      slug = randomProject.slug;
    }

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        description: description || `Created on ${new Date().toLocaleDateString()}`,
        slug
      })
      .select('*')
      .single();

    if (error) throw error;
    
    // Switch to the new project and initialize cache
    this.currentProjectId = newProject.id;
    ProjectStatsCache.set(newProject.id, { imageCount: 0, analysisCount: 0 });
    
    return newProject;
  }

  static async clearCurrentProject() {
    const projectId = await this.getCurrentProject();
    
    // Clear canvas state
    const { error: canvasError } = await supabase
      .from('canvas_states')
      .delete()
      .eq('project_id', projectId);
    
    if (canvasError) console.error('Failed to clear canvas state:', canvasError);
    
    // Invalidate cache
    ProjectStatsCache.invalidate(projectId);
    
    return projectId;
  }

  static resetProject() {
    this.currentProjectId = null;
    ProjectStatsCache.clear();
  }

  /**
   * ✅ OPTIMIZATION 5: Cache invalidation methods
   */
  static invalidateProjectCache(projectId: string) {
    ProjectStatsCache.invalidate(projectId);
  }

  static clearAllCache() {
    ProjectStatsCache.clear();
  }
}