import { supabase } from '@/integrations/supabase/client';
import type { UploadedImage, UXAnalysis, ImageGroup, GroupAnalysisWithPrompt } from '@/types/ux-analysis';
import { OptimizedDataService } from './OptimizedMigrationService';

export class ProgressiveDataLoader {
  private static loadingState = new Map<string, boolean>();
  
  static async loadCanvasDataProgressively(
    projectId: string,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{
    images: UploadedImage[];
    analyses: UXAnalysis[];
    groups: ImageGroup[];
    groupAnalyses: GroupAnalysisWithPrompt[];
  }> {
    const cacheKey = `project-${projectId}`;
    
    // Prevent duplicate loading
    if (this.loadingState.get(cacheKey)) {
      throw new Error('Already loading this project');
    }
    
    this.loadingState.set(cacheKey, true);
    
    try {
      // Use optimized batch loading for better performance
      onProgress?.('Loading project data...', 50);
      const data = await OptimizedDataService.loadProjectDataBatch(projectId, {
        imageLimit: 20,
        groupLimit: 10,
        analysisLimit: 50
      });
      
      onProgress?.('Finalizing...', 100);
      
      // Background load remaining data
      this.backgroundLoadRemainingData(projectId, data.images.length);
      
      return data;
      
    } finally {
      this.loadingState.delete(cacheKey);
    }
  }
  
  private static async loadImagesWithPagination(
    projectId: string, 
    offset: number, 
    limit: number
  ): Promise<UploadedImage[]> {
    const { data: images, error } = await supabase
      .from('images')
      .select('*')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    
    return images?.map(img => ({
      id: img.id,
      name: img.original_name,
      url: supabase.storage.from('images').getPublicUrl(img.storage_path).data.publicUrl,
      file: null, // Not needed for loaded images
      size: img.file_size || 0,
      type: img.file_type || 'image/jpeg',
      dimensions: img.dimensions as { width: number; height: number } || { width: 0, height: 0 },
      status: 'completed' as const,
      createdAt: new Date(img.uploaded_at),
      userId: '', // Will be filled by auth context
      projectId: img.project_id,
      analysis: null // Will be populated separately
    })) || [];
  }
  
  private static async loadAnalysesForImages(imageIds: string[]): Promise<UXAnalysis[]> {
    if (imageIds.length === 0) return [];
    
    const { data: analyses, error } = await supabase
      .from('ux_analyses')  
      .select('*')
      .in('image_id', imageIds);
      
    if (error) throw error;
    
    return analyses?.map(analysis => ({
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
    })) || [];
  }
  
  private static async loadGroupsFromDatabase(projectId: string): Promise<ImageGroup[]> {
    const { data: groups, error: groupsError } = await supabase
      .from('image_groups')
      .select(`
        *,
        group_images!inner(image_id)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (groupsError) throw groupsError;

    return groups?.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description || '',
      color: group.color,
      imageIds: group.group_images?.map((gi: any) => gi.image_id) || [],
      position: group.position as { x: number; y: number } || { x: 0, y: 0 },
      createdAt: new Date(group.created_at),
      projectId: group.project_id
    })) || [];
  }
  
  private static async loadGroupAnalysesLazy(groups: ImageGroup[]): Promise<GroupAnalysisWithPrompt[]> {
    if (groups.length === 0) return [];
    
    const groupIds = groups.map(g => g.id);
    
    const { data: analyses, error } = await supabase
      .from('group_analyses')
      .select('*')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return analyses?.map(analysis => ({
      id: analysis.id,
      sessionId: `session-${analysis.id}`, // Generate session ID for compatibility
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
      patterns: {
        commonElements: (analysis.patterns as any)?.commonElements || [],
        designInconsistencies: (analysis.patterns as any)?.designInconsistencies || [],
        userJourneyGaps: (analysis.patterns as any)?.userJourneyGaps || []
      },
      createdAt: new Date(analysis.created_at)
    })) || [];
  }
  
  private static async backgroundLoadRemainingData(projectId: string, loadedCount: number): Promise<void> {
    // Load remaining images in background
    setTimeout(async () => {
      try {
        const remainingImages = await this.loadImagesWithPagination(projectId, loadedCount, 100);
        const remainingImageIds = remainingImages.map(img => img.id);
        const remainingAnalyses = await this.loadAnalysesForImages(remainingImageIds);
        
        // Update state through event system to avoid re-render issues
        window.dispatchEvent(new CustomEvent('backgroundDataLoaded', {
          detail: { images: remainingImages, analyses: remainingAnalyses }
        }));
      } catch (error) {
        console.error('Background loading failed:', error);
      }
    }, 1000);
  }
  
  // Utility method to check if project is currently loading
  static isProjectLoading(projectId: string): boolean {
    return this.loadingState.get(`project-${projectId}`) || false;
  }
  
  // Method to cancel loading if needed
  static cancelLoading(projectId: string): void {
    this.loadingState.delete(`project-${projectId}`);
  }
}