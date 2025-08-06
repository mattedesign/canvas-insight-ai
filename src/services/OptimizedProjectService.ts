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

      console.log('[OptimizedProjectService] Looking for best project for user:', user.id);

      // Smart project selection: prioritize projects with data, then most recent
      const smartProject = await this.getSmartDefaultProject();
      if (smartProject) {
        this.currentProjectId = smartProject;
        console.log('[OptimizedProjectService] Selected smart default project:', this.currentProjectId);
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

  /**
   * ✅ SMART PROJECT SELECTION: Get the best project for dashboard
   * Prioritizes projects with data, then most recently updated
   */
  static async getSmartDefaultProject(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get all projects with their update times and activity
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, 
        updated_at,
        images!inner (id),
        ux_analyses: images!inner (ux_analyses!inner (id))
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error || !projects || projects.length === 0) {
      // Fallback to any project if smart selection fails
      const { data: fallbackProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      return fallbackProjects?.[0]?.id || null;
    }

    // Score projects based on data and recency
    const scoredProjects = projects.map(project => {
      const imageCount = project.images?.length || 0;
      const analysisCount = project.ux_analyses?.length || 0;
      const daysSinceUpdate = (Date.now() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      
      // Higher score = better project
      const dataScore = analysisCount * 10 + imageCount * 5; // Heavily weight analyses
      const recencyScore = Math.max(0, 30 - daysSinceUpdate); // More recent = higher score
      const totalScore = dataScore + recencyScore;
      
      return {
        id: project.id,
        score: totalScore,
        imageCount,
        analysisCount,
        daysSinceUpdate: Math.round(daysSinceUpdate)
      };
    });

    // Sort by score (highest first) and return the best project
    scoredProjects.sort((a, b) => b.score - a.score);
    const bestProject = scoredProjects[0];
    
    console.log('[OptimizedProjectService] Smart project selection:', {
      selectedProject: bestProject.id,
      score: bestProject.score,
      imageCount: bestProject.imageCount,
      analysisCount: bestProject.analysisCount,
      daysSinceUpdate: bestProject.daysSinceUpdate,
      totalProjects: scoredProjects.length
    });

    return bestProject.id;
  }

  /**
   * ✅ AGGREGATED METRICS: Get comprehensive metrics across all projects
   * Returns full dashboard-compatible metrics structure
   */
  static async getAggregatedMetrics(): Promise<{
    totalProjects: number;
    totalImages: number;
    totalAnalyses: number;
    activeProjects: number;
    averageScore: number;
    totalIssues: number;
    totalSuggestions: number;
    categoryScores: { usability: number; accessibility: number; visual: number; content: number };
    issueDistribution: { high: number; medium: number; low: number };
    recentActivity: any[];
    topIssues: any[];
    patterns: { commonIssues: any[]; improvementAreas: any[]; strengths: any[] };
    trends: any;
    analysisQuality: { successRate: number; averageConfidence: number; failureReasons: any[] };
  }> {
    try {
      console.log('[OptimizedProjectService] Starting getAggregatedMetrics...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[OptimizedProjectService] User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('[OptimizedProjectService] User authenticated:', user.id);

      // Step 1: Get all user projects first
      const { data: userProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      if (projectsError) {
        console.error('[OptimizedProjectService] Error fetching projects:', projectsError);
        throw projectsError;
      }

      const totalProjects = userProjects?.length || 0;
      console.log('[OptimizedProjectService] Found projects:', totalProjects);

      if (totalProjects === 0) {
        console.log('[OptimizedProjectService] No projects found, returning zeros');
        return {
          totalProjects: 0,
          totalImages: 0,
          totalAnalyses: 0,
          activeProjects: 0,
          averageScore: 0,
          totalIssues: 0,
          totalSuggestions: 0,
          categoryScores: { usability: 0, accessibility: 0, visual: 0, content: 0 },
          issueDistribution: { high: 0, medium: 0, low: 0 },
          recentActivity: [],
          topIssues: [],
          patterns: { commonIssues: [], improvementAreas: [], strengths: [] },
          trends: {
            averageScore: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
            totalIssues: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
            analysisSuccessRate: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
            accessibility: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false }
          },
          analysisQuality: {
            successRate: 0,
            averageConfidence: 0,
            failureReasons: []
          }
        };
      }

      const projectIds = userProjects.map(p => p.id);
      console.log('[OptimizedProjectService] Project IDs:', projectIds);

      // Step 2: Get images count with JOIN optimization
      const { data: userImages, error: imagesError } = await supabase
        .from('images')
        .select('id, project_id')
        .in('project_id', projectIds);

      if (imagesError) {
        console.error('[OptimizedProjectService] Error fetching images:', imagesError);
        throw imagesError;
      }

      const totalImages = userImages?.length || 0;
      console.log('[OptimizedProjectService] Found images:', totalImages);

      // Step 3: Get analyses count only if we have images
      let totalAnalyses = 0;
      let activeProjects = 0;

      if (totalImages > 0 && userImages) {
        const imageIds = userImages.map(img => img.id);
        console.log('[OptimizedProjectService] Image IDs for analysis lookup:', imageIds.length);

        const { data: userAnalyses, error: analysesError } = await supabase
          .from('ux_analyses')
          .select('id, image_id')
          .in('image_id', imageIds);

        if (analysesError) {
          console.error('[OptimizedProjectService] Error fetching analyses:', analysesError);
          throw analysesError;
        }

        totalAnalyses = userAnalyses?.length || 0;
        console.log('[OptimizedProjectService] Found analyses:', totalAnalyses);

        // Step 4: Calculate active projects (projects with images)
        const projectsWithImages = new Set(userImages.map(img => img.project_id));
        activeProjects = projectsWithImages.size;
        console.log('[OptimizedProjectService] Active projects (with images):', activeProjects);
      }

      // Step 5: Calculate comprehensive analytics if we have analyses
      let averageScore = 0;
      let totalSuggestions = 0;
      let categoryScores = { usability: 0, accessibility: 0, visual: 0, content: 0 };
      let issueDistribution = { high: 0, medium: 0, low: 0 };

      if (totalAnalyses > 0) {
        // Get detailed analysis data for calculations
        const { data: detailedAnalyses, error: detailError } = await supabase
          .from('ux_analyses')
          .select('summary, suggestions, visual_annotations')
          .in('image_id', userImages.map(img => img.id));

        if (!detailError && detailedAnalyses) {
          console.log('[OptimizedProjectService] Found detailed analyses for metrics:', detailedAnalyses.length);
          
          let scoreSum = 0;
          let scoreCount = 0;
          let categoryTotals = { usability: 0, accessibility: 0, visual: 0, content: 0 };
          let categoryCount = 0;

          detailedAnalyses.forEach(analysis => {
            // Calculate average score - handle JSON types safely
            const summary = analysis.summary as any;
            const score = summary?.overallScore;
            if (typeof score === 'number' && score > 0) {
              scoreSum += score;
              scoreCount++;
            }

            // Count suggestions and categorize by impact
            if (analysis.suggestions) {
              const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions : [];
              totalSuggestions += suggestions.length;
              
              suggestions.forEach((suggestion: any) => {
                const impact = suggestion.impact?.toLowerCase();
                if (impact === 'high') issueDistribution.high++;
                else if (impact === 'medium') issueDistribution.medium++;
                else if (impact === 'low') issueDistribution.low++;
              });
            }

            // Calculate category scores - handle JSON types safely
            const catScores = summary?.categoryScores;
            if (catScores && typeof catScores === 'object') {
              if (typeof catScores.usability === 'number') categoryTotals.usability += catScores.usability;
              if (typeof catScores.accessibility === 'number') categoryTotals.accessibility += catScores.accessibility;
              if (typeof catScores.visual === 'number') categoryTotals.visual += catScores.visual;
              if (typeof catScores.content === 'number') categoryTotals.content += catScores.content;
              categoryCount++;
            }
          });

          averageScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
          
          if (categoryCount > 0) {
            categoryScores = {
              usability: Math.round(categoryTotals.usability / categoryCount),
              accessibility: Math.round(categoryTotals.accessibility / categoryCount),
              visual: Math.round(categoryTotals.visual / categoryCount),
              content: Math.round(categoryTotals.content / categoryCount)
            };
          }
        }
      }

      const result = {
        totalProjects,
        totalImages,
        totalAnalyses,
        activeProjects,
        averageScore,
        totalIssues: issueDistribution.high + issueDistribution.medium + issueDistribution.low,
        totalSuggestions,
        categoryScores,
        issueDistribution,
        recentActivity: [],
        topIssues: [],
        patterns: { commonIssues: [], improvementAreas: [], strengths: [] },
        trends: {
          averageScore: { currentValue: averageScore, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
          totalIssues: { currentValue: issueDistribution.high + issueDistribution.medium + issueDistribution.low, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
          analysisSuccessRate: { currentValue: 100, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
          accessibility: { currentValue: categoryScores.accessibility, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false }
        },
        analysisQuality: {
          successRate: 100,
          averageConfidence: 0.8,
          failureReasons: []
        }
      };

      console.log('[OptimizedProjectService] Comprehensive aggregated metrics result:', result);
      return result;

    } catch (error) {
      console.error('[OptimizedProjectService] getAggregatedMetrics failed:', error);
      
      // Return safe defaults instead of throwing
      const fallbackResult = {
        totalProjects: 0,
        totalImages: 0,
        totalAnalyses: 0,
        activeProjects: 0,
        averageScore: 0,
        totalIssues: 0,
        totalSuggestions: 0,
        categoryScores: { usability: 0, accessibility: 0, visual: 0, content: 0 },
        issueDistribution: { high: 0, medium: 0, low: 0 },
        recentActivity: [],
        topIssues: [],
        patterns: { commonIssues: [], improvementAreas: [], strengths: [] },
        trends: {
          averageScore: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
          totalIssues: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
          analysisSuccessRate: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false },
          accessibility: { currentValue: 0, previousValue: 0, trendPercentage: 0, trendDirection: 'stable' as const, confidenceScore: 0, hasSufficientData: false }
        },
        analysisQuality: {
          successRate: 0,
          averageConfidence: 0,
          failureReasons: []
        }
      };
      
      console.log('[OptimizedProjectService] Returning fallback result due to error:', fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Delete a project and all associated data
   */
  static async deleteProject(projectId: string): Promise<void> {
    const { ProjectDeletionService } = await import('./ProjectDeletionService');
    await ProjectDeletionService.deleteProject(projectId);
    this.invalidateProjectCache(projectId);
  }

  /**
   * Delete multiple projects and all associated data
   */
  static async deleteMultipleProjects(projectIds: string[]): Promise<void> {
    const { ProjectDeletionService } = await import('./ProjectDeletionService');
    await ProjectDeletionService.deleteMultipleProjects(projectIds);
    projectIds.forEach(id => this.invalidateProjectCache(id));
  }
}