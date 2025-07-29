import { supabase } from '@/integrations/supabase/client';
import type { UploadedImage, UXAnalysis, ImageGroup, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { ImageMigrationService, AnalysisMigrationService, GroupMigrationService, GroupAnalysisMigrationService } from './DataMigrationService';
import { SmartCacheService } from './SmartCacheService';

export class OptimizedImageMigrationService extends ImageMigrationService {
  static async loadImagesFromDatabaseOptimized(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      includeProcessing?: boolean;
      status?: 'completed' | 'processing' | 'error';
    } = {}
  ): Promise<UploadedImage[]> {
    const { limit = 50, offset = 0, includeProcessing = true, status } = options;
    
    // Generate cache key
    const cacheKey = SmartCacheService.generateImageKey(projectId, limit, offset);
    
    return SmartCacheService.getOrLoad(
      cacheKey,
      async () => {
        // Use existing indexes for performance
        let query = supabase
          .from('images')
          .select(`
            id,
            original_name,
            storage_path,
            dimensions,
            file_size,
            file_type,
            uploaded_at,
            project_id,
            metadata
          `)
          .eq('project_id', projectId)
          .order('uploaded_at', { ascending: false });
        
        // Filter by status if specified
        if (status) {
          query = query.eq('security_scan_status', status);
        } else if (!includeProcessing) {
          query = query.neq('security_scan_status', 'processing');
        }
        
        // Apply pagination
        if (limit > 0) {
          query = query.range(offset, offset + limit - 1);
        }
        
        const { data: images, error } = await query;
        
        if (error) throw error;
        if (!images) return [];
        
        // Process images with optimized URL generation
        return images.map(img => {
          const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(img.storage_path);
            
          return {
            id: img.id,
            name: img.original_name,
            url: urlData.publicUrl,
            file: null, // Not needed for loaded images
            size: img.file_size || 0,
            type: img.file_type || 'image/jpeg',
            dimensions: img.dimensions as { width: number; height: number } || { width: 0, height: 0 },
            status: 'completed' as const, // Map from security_scan_status
            createdAt: new Date(img.uploaded_at),
            userId: '', // Will be populated by context
            projectId: img.project_id,
            analysis: null // Will be populated separately
          };
        });
      },
      3 * 60 * 1000 // 3 minutes cache for images
    );
  }
  
  static async getImageCount(projectId: string): Promise<number> {
    const cacheKey = `image-count:${projectId}`;
    
    return SmartCacheService.getOrLoad(
      cacheKey,
      async () => {
        const { count, error } = await supabase
          .from('images')
          .select('id', { count: 'exact' })
          .eq('project_id', projectId);
          
        if (error) throw error;
        return count || 0;
      },
      10 * 60 * 1000 // 10 minutes cache for counts
    );
  }

  static async getImagesByIds(imageIds: string[]): Promise<UploadedImage[]> {
    if (imageIds.length === 0) return [];

    const { data: images, error } = await supabase
      .from('images')
      .select(`
        id,
        original_name,
        storage_path,
        dimensions,
        file_size,
        file_type,
        uploaded_at,
        project_id,
        metadata
      `)
      .in('id', imageIds);

    if (error) throw error;
    if (!images) return [];

    return images.map(img => {
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(img.storage_path);
        
      return {
        id: img.id,
        name: img.original_name,
        url: urlData.publicUrl,
        file: null,
        size: img.file_size || 0,
        type: img.file_type || 'image/jpeg',
        dimensions: img.dimensions as { width: number; height: number } || { width: 0, height: 0 },
        status: 'completed' as const,
        createdAt: new Date(img.uploaded_at),
        userId: '',
        projectId: img.project_id,
        analysis: null
      };
    });
  }
}

export class OptimizedAnalysisMigrationService extends AnalysisMigrationService {
  static async loadAnalysesForImagesOptimized(
    imageIds: string[],
    options: {
      limit?: number;
      status?: 'completed' | 'processing' | 'error';
    } = {}
  ): Promise<UXAnalysis[]> {
    if (imageIds.length === 0) return [];
    
    const { limit, status } = options;
    
    let query = supabase
      .from('ux_analyses')
      .select(`
        id,
        image_id,
        visual_annotations,
        suggestions,
        summary,
        metadata,
        user_context,
        analysis_type,
        status,
        created_at
      `)
      .in('image_id', imageIds)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: analyses, error } = await query;
    
    if (error) throw error;
    if (!analyses) return [];

    return analyses.map(analysis => ({
      id: analysis.id,
      imageId: analysis.image_id,
      imageName: '', // Will be populated when needed
      imageUrl: '', // Will be populated when needed
      visualAnnotations: analysis.visual_annotations as any || [],
      suggestions: analysis.suggestions as any || [],
      summary: analysis.summary as any || {},
      metadata: analysis.metadata as any || {},
      userContext: analysis.user_context || '',
      analysisType: analysis.analysis_type as 'full_analysis' | 'quick_scan' || 'full_analysis',
      status: analysis.status as 'completed' | 'processing' | 'error' || 'completed',
      createdAt: new Date(analysis.created_at)
    }));
  }

  static async getAnalysisCount(projectId: string): Promise<number> {
    // First get all image IDs for the project
    const { data: images } = await supabase
      .from('images')
      .select('id')
      .eq('project_id', projectId);

    if (!images || images.length === 0) return 0;

    const imageIds = images.map(img => img.id);
    
    const { count, error } = await supabase
      .from('ux_analyses')
      .select('id', { count: 'exact' })
      .in('image_id', imageIds);

    if (error) throw error;
    return count || 0;
  }
}

export class OptimizedGroupMigrationService extends GroupMigrationService {
  static async loadGroupsFromDatabaseOptimized(
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      includeImages?: boolean;
    } = {}
  ): Promise<ImageGroup[]> {
    const { limit = 50, offset = 0, includeImages = true } = options;

    // Load groups first
    let query = supabase
      .from('image_groups')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: groups, error } = await query;

    if (error) throw error;
    if (!groups) return [];

    // Load group images separately if needed
    let groupImages: any[] = [];
    if (includeImages && groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      const { data: images } = await supabase
        .from('group_images')
        .select('group_id, image_id')
        .in('group_id', groupIds);
      
      groupImages = images || [];
    }

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description || '',
      color: group.color,
      imageIds: includeImages ? groupImages
        .filter(gi => gi.group_id === group.id)
        .map(gi => gi.image_id) : [],
      position: group.position as { x: number; y: number } || { x: 0, y: 0 },
      createdAt: new Date(group.created_at),
      projectId: group.project_id
    }));
  }

  static async getGroupCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from('image_groups')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    if (error) throw error;
    return count || 0;
  }
}

export class OptimizedGroupAnalysisMigrationService extends GroupAnalysisMigrationService {
  static async loadGroupAnalysesOptimized(
    groupIds: string[],
    options: {
      limit?: number;
      includePatterns?: boolean;
    } = {}
  ): Promise<GroupAnalysisWithPrompt[]> {
    if (groupIds.length === 0) return [];
    
    const { limit, includePatterns = true } = options;

    let query = supabase
      .from('group_analyses')
      .select('*')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: analyses, error } = await query;
    
    if (error) throw error;
    if (!analyses) return [];

    return analyses.map(analysis => ({
      id: analysis.id,
      sessionId: `session-${analysis.id}`,
      groupId: analysis.group_id,
      prompt: analysis.prompt,
      isCustom: analysis.is_custom || false,
      summary: {
        overallScore: (analysis.summary as any)?.overallScore || 0,
        consistency: (analysis.summary as any)?.consistency || 0,
        thematicCoherence: (analysis.summary as any)?.thematicCoherence || 0,
        userFlowContinuity: (analysis.summary as any)?.userFlowContinuity || 0
      },
      insights: analysis.insights as any || [],
      recommendations: analysis.recommendations as any || [],
      patterns: includePatterns ? {
        commonElements: (analysis.patterns as any)?.commonElements || [],
        designInconsistencies: (analysis.patterns as any)?.designInconsistencies || [],
        userJourneyGaps: (analysis.patterns as any)?.userJourneyGaps || []
      } : {
        commonElements: [],
        designInconsistencies: [],
        userJourneyGaps: []
      },
      createdAt: new Date(analysis.created_at)
    }));
  }

  static async getGroupAnalysisCount(projectId: string): Promise<number> {
    // First get all group IDs for the project
    const { data: groups } = await supabase
      .from('image_groups')
      .select('id')
      .eq('project_id', projectId);

    if (!groups || groups.length === 0) return 0;

    const groupIds = groups.map(group => group.id);
    
    const { count, error } = await supabase
      .from('group_analyses')
      .select('id', { count: 'exact' })
      .in('group_id', groupIds);

    if (error) throw error;
    return count || 0;
  }
}

// Combined optimized service for batch operations
export class OptimizedDataService {
  static async getProjectStats(projectId: string): Promise<{
    imageCount: number;
    analysisCount: number;
    groupCount: number;
    groupAnalysisCount: number;
  }> {
    const cacheKey = SmartCacheService.generateProjectKey(projectId);
    
    return SmartCacheService.getOrLoad(
      cacheKey,
      async () => {
        const [imageCount, analysisCount, groupCount, groupAnalysisCount] = await Promise.all([
          OptimizedImageMigrationService.getImageCount(projectId),
          OptimizedAnalysisMigrationService.getAnalysisCount(projectId),
          OptimizedGroupMigrationService.getGroupCount(projectId),
          OptimizedGroupAnalysisMigrationService.getGroupAnalysisCount(projectId)
        ]);

        return {
          imageCount,
          analysisCount,
          groupCount,
          groupAnalysisCount
        };
      },
      10 * 60 * 1000 // 10 minutes cache for stats
    );
  }

  static async loadProjectDataBatch(
    projectId: string,
    options: {
      imageLimit?: number;
      groupLimit?: number;
      analysisLimit?: number;
    } = {}
  ): Promise<{
    images: UploadedImage[];
    analyses: UXAnalysis[];
    groups: ImageGroup[];
    groupAnalyses: GroupAnalysisWithPrompt[];
  }> {
    const { imageLimit = 20, groupLimit = 10, analysisLimit = 50 } = options;

    // Load images first (cached)
    const images = await OptimizedImageMigrationService.loadImagesFromDatabaseOptimized(
      projectId,
      { limit: imageLimit }
    );

    // Load groups (with caching)
    const groupCacheKey = SmartCacheService.generateGroupKey(projectId);
    const groups = await SmartCacheService.getOrLoad(
      groupCacheKey,
      () => OptimizedGroupMigrationService.loadGroupsFromDatabaseOptimized(
        projectId,
        { limit: groupLimit }
      ),
      5 * 60 * 1000 // 5 minutes cache for groups
    );

    // Load analyses for the loaded images (with caching)
    const imageIds = images.map(img => img.id);
    const analysisCacheKey = SmartCacheService.generateAnalysisKey(imageIds);
    const analyses = await SmartCacheService.getOrLoad(
      analysisCacheKey,
      () => OptimizedAnalysisMigrationService.loadAnalysesForImagesOptimized(
        imageIds,
        { limit: analysisLimit }
      ),
      3 * 60 * 1000 // 3 minutes cache for analyses
    );

    // Load group analyses for the loaded groups (with caching)
    const groupIds = groups.map(group => group.id);
    const groupAnalysisCacheKey = SmartCacheService.generateGroupAnalysisKey(groupIds);
    const groupAnalyses = await SmartCacheService.getOrLoad(
      groupAnalysisCacheKey,
      () => OptimizedGroupAnalysisMigrationService.loadGroupAnalysesOptimized(groupIds),
      5 * 60 * 1000 // 5 minutes cache for group analyses
    );

    return {
      images,
      analyses,
      groups,
      groupAnalyses
    };
  }

  // Cache invalidation methods for data updates
  static invalidateProjectCache(projectId: string): void {
    console.log(`[Cache] Invalidating all cache for project: ${projectId}`);
    SmartCacheService.clear(projectId);
  }

  static invalidateImageCache(projectId: string): void {
    console.log(`[Cache] Invalidating image cache for project: ${projectId}`);
    SmartCacheService.clear(`images:${projectId}`);
    SmartCacheService.invalidate(`image-count:${projectId}`);
  }

  static invalidateGroupCache(projectId: string): void {
    console.log(`[Cache] Invalidating group cache for project: ${projectId}`);
    SmartCacheService.clear(`groups:${projectId}`);
    SmartCacheService.clear(`group-analyses:`);
  }

  static invalidateAnalysisCache(imageIds: string[]): void {
    console.log(`[Cache] Invalidating analysis cache for images: ${imageIds.length}`);
    const cacheKey = SmartCacheService.generateAnalysisKey(imageIds);
    SmartCacheService.invalidate(cacheKey);
  }

  // Warm cache for better initial performance
  static async warmProjectCache(projectId: string): Promise<void> {
    try {
      console.log(`[Cache] Warming project cache: ${projectId}`);
      
      // Pre-load project stats
      await this.getProjectStats(projectId);
      
      // Pre-load initial batch of data
      await this.loadProjectDataBatch(projectId, {
        imageLimit: 10,
        groupLimit: 5,
        analysisLimit: 20
      });
      
      console.log(`[Cache] Project cache warmed: ${projectId}`);
    } catch (error) {
      console.error(`[Cache] Failed to warm project cache: ${projectId}`, error);
    }
  }
}