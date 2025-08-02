/**
 * Enhanced Progressive Data Loader - Phase 3, Step 3.1
 * Implements dependency tracking and conflict prevention
 */

import { supabase } from '@/integrations/supabase/client';
import { getCentralizedStorage } from '@/services/CentralizedStorageService';
import { createDependencyGraph, resolveDependencyOrder } from '@/utils/dependencyMapping';
import type { UploadedImage, UXAnalysis, ImageGroup, GroupAnalysisWithPrompt } from '@/types/ux-analysis';

interface LoadingProgress {
  stage: string;
  progress: number;
  totalStages: number;
  currentStage: number;
  estimatedTimeRemaining?: number;
  throughput?: number;
}

interface LoadingDependency {
  id: string;
  type: 'project' | 'images' | 'analyses' | 'groups' | 'groupAnalyses';
  dependsOn: string[];
  priority: number;
  status: 'pending' | 'loading' | 'completed' | 'error';
  data?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

interface LoadingContext {
  projectId: string;
  requestId: string;
  dependencies: Map<string, LoadingDependency>;
  activeLoads: Set<string>;
  completedLoads: Set<string>;
  failedLoads: Set<string>;
  onProgress?: (progress: LoadingProgress) => void;
  abortController: AbortController;
  metrics: LoadingMetrics;
}

interface LoadingMetrics {
  startTime: number;
  totalItems: number;
  loadedItems: number;
  failedItems: number;
  averageLoadTime: number;
  throughputPerSecond: number;
  estimatedCompletion: number;
}

interface LoadingResult {
  success: boolean;
  data?: {
    images: UploadedImage[];
    analyses: UXAnalysis[];
    groups: ImageGroup[];
    groupAnalyses: GroupAnalysisWithPrompt[];
  };
  metrics: LoadingMetrics;
  error?: string;
  partialResults?: boolean;
}

export class ProgressiveDataLoader {
  private static activeContexts = new Map<string, LoadingContext>();
  private static storage = getCentralizedStorage();

  /**
   * Legacy method for backward compatibility
   */
  static async loadCanvasDataProgressively(
    projectId: string,
    onProgress?: (stage: string, progress: number) => void,
    validateProject: boolean = true
  ): Promise<{
    images: UploadedImage[];
    analyses: UXAnalysis[];
    groups: ImageGroup[];
    groupAnalyses: GroupAnalysisWithPrompt[];
  }> {
    const result = await this.loadProjectDataWithDependencies(projectId, {
      onProgress: onProgress ? (progress) => onProgress(progress.stage, progress.progress) : undefined,
      validateProject
    });

    if (!result.success) {
      throw new Error(result.error || 'Loading failed');
    }

    return result.data!;
  }

  /**
   * Main entry point for progressive data loading with dependency resolution
   */
  static async loadProjectDataWithDependencies(
    projectId: string,
    options: {
      onProgress?: (progress: LoadingProgress) => void;
      validateProject?: boolean;
      enableCaching?: boolean;
      batchSize?: number;
      maxRetries?: number;
      timeout?: number;
    } = {}
  ): Promise<LoadingResult> {
    const {
      onProgress,
      validateProject = true,
      enableCaching = true,
      batchSize = 20,
      maxRetries = 3,
      timeout = 30000
    } = options;

    const requestId = this.generateRequestId(projectId);
    
    // Check for existing active load
    if (this.activeContexts.has(requestId)) {
      console.log(`[ProgressiveLoader] Reusing existing load for project: ${projectId}`);
      return this.waitForCompletion(requestId);
    }

    const context = this.createLoadingContext(projectId, requestId, onProgress);
    this.activeContexts.set(requestId, context);

    try {
      // Setup timeout
      const timeoutPromise = new Promise<LoadingResult>((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout exceeded')), timeout);
      });

      // Start loading process
      const loadingPromise = this.executeProgressiveLoad(context, {
        validateProject,
        enableCaching,
        batchSize,
        maxRetries
      });

      const result = await Promise.race([loadingPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error(`[ProgressiveLoader] Loading failed for project ${projectId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: context.metrics
      };
    } finally {
      this.activeContexts.delete(requestId);
    }
  }

  /**
   * Execute the progressive loading with dependency resolution
   */
  private static async executeProgressiveLoad(
    context: LoadingContext,
    options: {
      validateProject: boolean;
      enableCaching: boolean;
      batchSize: number;
      maxRetries: number;
    }
  ): Promise<LoadingResult> {
    const { projectId, dependencies, onProgress } = context;
    const { validateProject, enableCaching, batchSize, maxRetries } = options;

    try {
      // Stage 1: Project validation (if enabled)
      if (validateProject) {
        this.updateProgress(context, 'Validating project', 5);
        await this.validateProjectAccess(projectId);
      }

      // Stage 2: Build dependency graph
      this.updateProgress(context, 'Analyzing dependencies', 10);
      this.buildDependencyGraph(context);

      // Stage 3: Resolve optimal loading order
      this.updateProgress(context, 'Planning load sequence', 15);
      const loadOrder = resolveDependencyOrder(dependencies);

      // Stage 4: Execute loads in dependency order
      this.updateProgress(context, 'Loading data', 20);
      await this.executeLoadSequence(context, loadOrder, { batchSize, maxRetries, enableCaching });

      // Stage 5: Finalize and return results
      this.updateProgress(context, 'Finalizing', 95);
      const result = this.assembleResults(context);

      this.updateProgress(context, 'Complete', 100);
      return result;
    } catch (error) {
      context.metrics.failedItems++;
      throw error;
    }
  }

  /**
   * Build dependency graph for the project data
   */
  private static buildDependencyGraph(context: LoadingContext): void {
    const { projectId, dependencies } = context;

    // Define load dependencies
    const dependencyDefs = [
      {
        id: 'project-validation',
        type: 'project' as const,
        dependsOn: [],
        priority: 1
      },
      {
        id: 'images-load',
        type: 'images' as const,
        dependsOn: ['project-validation'],
        priority: 2
      },
      {
        id: 'groups-load',
        type: 'groups' as const,
        dependsOn: ['project-validation'],
        priority: 2
      },
      {
        id: 'analyses-load',
        type: 'analyses' as const,
        dependsOn: ['images-load'],
        priority: 3
      },
      {
        id: 'group-analyses-load',
        type: 'groupAnalyses' as const,
        dependsOn: ['groups-load'],
        priority: 3
      }
    ];

    // Create dependency objects
    dependencyDefs.forEach(def => {
      dependencies.set(def.id, {
        ...def,
        status: 'pending',
        startTime: undefined,
        endTime: undefined
      });
    });

    context.metrics.totalItems = dependencies.size;
  }

  /**
   * Execute loads in optimal dependency order
   */
  private static async executeLoadSequence(
    context: LoadingContext,
    loadOrder: string[],
    options: { batchSize: number; maxRetries: number; enableCaching: boolean }
  ): Promise<void> {
    const { dependencies, activeLoads } = context;
    const { batchSize, maxRetries, enableCaching } = options;

    for (const depId of loadOrder) {
      const dependency = dependencies.get(depId);
      if (!dependency || dependency.status !== 'pending') {
        continue;
      }

      // Check if dependencies are satisfied
      const canLoad = dependency.dependsOn.every(reqId => {
        const reqDep = dependencies.get(reqId);
        return reqDep?.status === 'completed';
      });

      if (!canLoad) {
        console.warn(`[ProgressiveLoader] Skipping ${depId} - dependencies not satisfied`);
        continue;
      }

      // Start loading
      dependency.status = 'loading';
      dependency.startTime = Date.now();
      activeLoads.add(depId);

      try {
        await this.executeSingleLoad(context, dependency, { maxRetries, enableCaching, batchSize });
        
        dependency.status = 'completed';
        dependency.endTime = Date.now();
        context.completedLoads.add(depId);
        context.metrics.loadedItems++;
      } catch (error) {
        dependency.status = 'error';
        dependency.error = error instanceof Error ? error.message : 'Unknown error';
        dependency.endTime = Date.now();
        context.failedLoads.add(depId);
        context.metrics.failedItems++;
        
        console.error(`[ProgressiveLoader] Load failed for ${depId}:`, error);
      } finally {
        activeLoads.delete(depId);
        this.updateMetrics(context);
      }
    }
  }

  /**
   * Execute a single load operation
   */
  private static async executeSingleLoad(
    context: LoadingContext,
    dependency: LoadingDependency,
    options: { maxRetries: number; enableCaching: boolean; batchSize: number }
  ): Promise<void> {
    const { projectId } = context;
    const { maxRetries, enableCaching, batchSize } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        switch (dependency.type) {
          case 'project':
            dependency.data = await this.validateProjectAccess(projectId);
            break;
          
          case 'images':
            dependency.data = await this.loadImagesWithBatching(projectId, batchSize, enableCaching);
            break;
          
          case 'groups':
            dependency.data = await this.loadGroupsFromDatabase(projectId, enableCaching);
            break;
          
          case 'analyses':
            const imagesDep = context.dependencies.get('images-load');
            const imageIds = imagesDep?.data?.map((img: UploadedImage) => img.id) || [];
            dependency.data = await this.loadAnalysesForImages(imageIds, enableCaching);
            break;
          
          case 'groupAnalyses':
            const groupsDep = context.dependencies.get('groups-load');
            const groups = groupsDep?.data || [];
            dependency.data = await this.loadGroupAnalysesLazy(groups, enableCaching);
            break;
          
          default:
            throw new Error(`Unknown dependency type: ${dependency.type}`);
        }

        // Success - break retry loop
        return;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[ProgressiveLoader] Attempt ${attempt}/${maxRetries} failed for ${dependency.id}:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${maxRetries} attempts`);
  }

  /**
   * Load images with batching and caching
   */
  private static async loadImagesWithBatching(
    projectId: string,
    batchSize: number,
    enableCaching: boolean
  ): Promise<UploadedImage[]> {
    const cacheKey = `project:${projectId}:images`;
    
    if (enableCaching) {
      const cached = await this.storage.get<UploadedImage[]>(cacheKey);
      if (cached.success && cached.data) {
        console.log(`[ProgressiveLoader] Using cached images for project ${projectId}`);
        return cached.data;
      }
    }

    const images: UploadedImage[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + batchSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        images.push(...data.map(img => ({
          id: img.id,
          name: img.original_name,
          url: supabase.storage.from('images').getPublicUrl(img.storage_path).data.publicUrl,
          file: null,
          size: img.file_size || 0,
          type: img.file_type || 'image/jpeg',
          dimensions: img.dimensions as { width: number; height: number } || { width: 0, height: 0 },
          status: 'completed' as const,
          createdAt: new Date(img.uploaded_at),
          userId: '',
          projectId: img.project_id,
          analysis: null
        })));

        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    if (enableCaching && images.length > 0) {
      await this.storage.set(cacheKey, images);
    }

    return images;
  }

  /**
   * Load groups from database with caching
   */
  private static async loadGroupsFromDatabase(
    projectId: string,
    enableCaching: boolean
  ): Promise<ImageGroup[]> {
    const cacheKey = `project:${projectId}:groups`;
    
    if (enableCaching) {
      const cached = await this.storage.get<ImageGroup[]>(cacheKey);
      if (cached.success && cached.data) {
        return cached.data;
      }
    }

    const { data: groups, error: groupsError } = await supabase
      .from('image_groups')
      .select(`
        *,
        group_images!inner(image_id)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (groupsError) throw groupsError;

    const groupsData: ImageGroup[] = groups?.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description || '',
      color: group.color,
      imageIds: group.group_images?.map((gi: any) => gi.image_id) || [],
      position: group.position as { x: number; y: number } || { x: 0, y: 0 },
      createdAt: new Date(group.created_at),
      projectId: group.project_id
    })) || [];

    if (enableCaching && groupsData.length > 0) {
      await this.storage.set(cacheKey, groupsData);
    }

    return groupsData;
  }

  /**
   * Load analyses for specific images
   */
  private static async loadAnalysesForImages(
    imageIds: string[],
    enableCaching: boolean
  ): Promise<UXAnalysis[]> {
    if (imageIds.length === 0) return [];

    const analyses: UXAnalysis[] = [];
    const batchSize = 50;

    for (let i = 0; i < imageIds.length; i += batchSize) {
      const batch = imageIds.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('ux_analyses')
        .select('*')
        .in('image_id', batch);

      if (error) throw error;

      if (data) {
        analyses.push(...data.map(analysis => ({
          id: analysis.id,
          imageId: analysis.image_id,
          imageName: '',
          imageUrl: '',
          visualAnnotations: analysis.visual_annotations as any || [],
          suggestions: analysis.suggestions as any || [],
          summary: analysis.summary as any || {},
          metadata: analysis.metadata as any || {},
          userContext: analysis.user_context || '',
          analysisType: analysis.analysis_type as 'full_analysis' | 'quick_scan' || 'full_analysis',
          status: analysis.status as 'completed' | 'processing' | 'error' || 'completed',
          createdAt: new Date(analysis.created_at)
        })));
      }
    }

    return analyses;
  }

  /**
   * Load group analyses lazily
   */
  private static async loadGroupAnalysesLazy(
    groups: ImageGroup[],
    enableCaching: boolean
  ): Promise<GroupAnalysisWithPrompt[]> {
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
      patterns: {
        commonElements: (analysis.patterns as any)?.commonElements || [],
        designInconsistencies: (analysis.patterns as any)?.designInconsistencies || [],
        userJourneyGaps: (analysis.patterns as any)?.userJourneyGaps || []
      },
      createdAt: new Date(analysis.created_at)
    })) || [];
  }

  /**
   * Validate project access
   */
  private static async validateProjectAccess(projectId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      throw new Error('Project not found or access denied');
    }

    return true;
  }

  /**
   * Assemble final results from completed loads
   */
  private static assembleResults(context: LoadingContext): LoadingResult {
    const { dependencies, completedLoads, failedLoads } = context;

    const hasFailures = failedLoads.size > 0;
    const partialResults = hasFailures && completedLoads.size > 0;

    const result: LoadingResult = {
      success: failedLoads.size === 0,
      partialResults,
      metrics: context.metrics,
      data: {
        images: dependencies.get('images-load')?.data || [],
        analyses: dependencies.get('analyses-load')?.data || [],
        groups: dependencies.get('groups-load')?.data || [],
        groupAnalyses: dependencies.get('group-analyses-load')?.data || []
      }
    };

    if (hasFailures) {
      const errorMessages = Array.from(failedLoads)
        .map(id => dependencies.get(id)?.error)
        .filter(Boolean);
      result.error = `Some loads failed: ${errorMessages.join(', ')}`;
    }

    return result;
  }

  /**
   * Utility methods
   */
  private static createLoadingContext(
    projectId: string,
    requestId: string,
    onProgress?: (progress: LoadingProgress) => void
  ): LoadingContext {
    return {
      projectId,
      requestId,
      dependencies: new Map(),
      activeLoads: new Set(),
      completedLoads: new Set(),
      failedLoads: new Set(),
      onProgress,
      abortController: new AbortController(),
      metrics: {
        startTime: Date.now(),
        totalItems: 0,
        loadedItems: 0,
        failedItems: 0,
        averageLoadTime: 0,
        throughputPerSecond: 0,
        estimatedCompletion: 0
      }
    };
  }

  private static updateProgress(context: LoadingContext, stage: string, progress: number): void {
    if (context.onProgress) {
      const estimatedTimeRemaining = this.calculateEstimatedTime(context, progress);
      
      context.onProgress({
        stage,
        progress,
        totalStages: 5,
        currentStage: Math.floor(progress / 20) + 1,
        estimatedTimeRemaining,
        throughput: context.metrics.throughputPerSecond
      });
    }
  }

  private static updateMetrics(context: LoadingContext): void {
    const { metrics, completedLoads, failedLoads } = context;
    const totalCompleted = completedLoads.size + failedLoads.size;
    const elapsedTime = Date.now() - metrics.startTime;
    
    metrics.averageLoadTime = totalCompleted > 0 ? elapsedTime / totalCompleted : 0;
    metrics.throughputPerSecond = totalCompleted / (elapsedTime / 1000);
    
    if (metrics.throughputPerSecond > 0) {
      const remainingItems = metrics.totalItems - totalCompleted;
      metrics.estimatedCompletion = Date.now() + (remainingItems / metrics.throughputPerSecond * 1000);
    }
  }

  private static calculateEstimatedTime(context: LoadingContext, currentProgress: number): number {
    const { metrics } = context;
    const elapsedTime = Date.now() - metrics.startTime;
    
    if (currentProgress <= 0) return 0;
    
    const totalEstimatedTime = (elapsedTime / currentProgress) * 100;
    return Math.max(0, totalEstimatedTime - elapsedTime);
  }

  private static generateRequestId(projectId: string): string {
    return `${projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async waitForCompletion(requestId: string): Promise<LoadingResult> {
    const context = this.activeContexts.get(requestId);
    if (!context) {
      throw new Error('Context not found');
    }

    // Simple polling for completion
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const totalLoads = context.dependencies.size;
        const completedLoads = context.completedLoads.size + context.failedLoads.size;
        
        if (completedLoads >= totalLoads) {
          clearInterval(checkInterval);
          resolve(this.assembleResults(context));
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Wait timeout exceeded'));
      }, 30000);
    });
  }

  /**
   * Legacy methods for backward compatibility
   */
  static isProjectLoading(projectId: string): boolean {
    return Array.from(this.activeContexts.values())
      .some(context => context.projectId === projectId);
  }

  static cancelLoading(projectId: string): void {
    const contextsToCancel = Array.from(this.activeContexts.entries())
      .filter(([_, context]) => context.projectId === projectId);
    
    contextsToCancel.forEach(([requestId, context]) => {
      context.abortController.abort();
      this.activeContexts.delete(requestId);
    });
  }

  static getActiveLoadings(): string[] {
    return Array.from(this.activeContexts.keys());
  }
}