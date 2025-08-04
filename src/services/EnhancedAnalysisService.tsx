import { useEnhancedErrorHandling } from '@/hooks/useEnhancedErrorHandling';
import { createAnalysisError } from '@/components/EnhancedErrorHandler';
import { enhancedAnalysisStorage } from '@/services/EnhancedAnalysisStorage';
import { AnalysisCacheService } from '@/services/AnalysisCacheService';
import { supabase } from '@/integrations/supabase/client';
import type { UXAnalysis } from '@/types/ux-analysis';

interface AnalysisServiceOptions {
  maxRetries?: number;
  timeout?: number;
  useCache?: boolean;
  onProgress?: (progress: number) => void;
}

export class EnhancedAnalysisService {
  private cacheService = new AnalysisCacheService();

  async analyzeImage(
    imageId: string,
    imageUrl: string,
    userContext?: string,
    options: AnalysisServiceOptions = {}
  ): Promise<UXAnalysis | null> {
    const {
      maxRetries = 3,
      timeout = 60000,
      useCache = true,
      onProgress
    } = options;

    // Use the enhanced error handling hook pattern but as a service
    let retryCount = 0;
    let lastError: any = null;

    const executeAnalysis = async (): Promise<UXAnalysis> => {
      try {
        if (onProgress) onProgress(10);

        // Check cache first if enabled
        if (useCache) {
          const cachedResult = await this.cacheService.getCachedAnalysis(imageUrl);
          if (cachedResult) {
            if (onProgress) onProgress(100);
            console.log('📦 Using cached analysis for image:', imageId);
            return cachedResult;
          }
        }

        if (onProgress) onProgress(25);

        // Check for existing recent analysis
        const existingInfo = await enhancedAnalysisStorage.checkExistingAnalysis(imageId);
        if (existingInfo.hasRecent && !lastError) {
          if (onProgress) onProgress(100);
          console.log('✅ Found recent analysis for image:', imageId);
          
          // Get the existing analysis data
          const { data: existingAnalysis, error } = await supabase
            .from('ux_analyses')
            .select('*')
            .eq('id', existingInfo.latestId)
            .single();

          if (!error && existingAnalysis) {
            return this.formatAnalysisResult(existingAnalysis);
          }
        }

        if (onProgress) onProgress(50);

        // Prepare analysis request
        const analysisPayload = {
          imageId,
          imageUrl,
          userContext: userContext || '',
          analysisType: 'full_analysis',
          timestamp: new Date().toISOString()
        };

        if (onProgress) onProgress(75);

        // Call Supabase function with timeout
        const { data, error } = await Promise.race([
          supabase.functions.invoke('ux-analysis', {
            body: analysisPayload
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Analysis timeout')), timeout)
          )
        ]) as any;

        if (error) {
          throw createAnalysisError(
            error.message.includes('timeout') ? 'timeout' : 'api',
            `Analysis failed: ${error.message}`,
            error.details || error.message
          );
        }

        if (!data || !data.analysis) {
          throw createAnalysisError(
            'validation',
            'Invalid analysis response received',
            'Missing analysis data in response'
          );
        }

        if (onProgress) onProgress(90);

        // Store the analysis result
        const storageResult = await enhancedAnalysisStorage.storeAnalysis({
          imageId,
          analysisData: data.analysis,
          userContext,
          analysisType: 'full_analysis'
        });

        if (!storageResult.success) {
          console.warn('Failed to store analysis:', storageResult.error);
        }

        // Cache the result if enabled
        if (useCache) {
          await this.cacheService.cacheAnalysis(imageUrl, data.analysis);
        }

        if (onProgress) onProgress(100);

        return data.analysis;

      } catch (error: any) {
        console.error('Analysis error:', error);
        
        // Clear problematic cache if this was a cache-related issue
        if (error.message?.includes('cache') || error.message?.includes('reference')) {
          await this.cacheService.clearProblematicCache(imageId);
        }

        throw error;
      }
    };

    // Retry logic with enhanced error handling
    while (retryCount <= maxRetries) {
      try {
        return await executeAnalysis();
      } catch (error: any) {
        lastError = error;
        retryCount++;

        if (retryCount > maxRetries) {
          throw createAnalysisError(
            error.type || 'unknown',
            `Analysis failed after ${maxRetries} retries: ${error.message}`,
            error.details,
            [
              'Check your internet connection',
              'Verify the image is accessible',
              'Try with a different image',
              'Contact support if the issue persists'
            ]
          );
        }

        // Add delay between retries (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        console.log(`Retrying analysis in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private formatAnalysisResult(rawAnalysis: any): UXAnalysis {
    return {
      id: rawAnalysis.id || '',
      imageId: rawAnalysis.image_id || '',
      imageName: rawAnalysis.image_name || '',
      imageUrl: rawAnalysis.image_url || '',
      userContext: rawAnalysis.user_context || '',
      createdAt: rawAnalysis.created_at || new Date().toISOString(),
      visualAnnotations: rawAnalysis.visual_annotations || [],
      suggestions: rawAnalysis.suggestions || [],
      summary: rawAnalysis.summary || {},
      metadata: {
        ...rawAnalysis.metadata,
        analysisId: rawAnalysis.id,
        version: rawAnalysis.version,
        createdAt: rawAnalysis.created_at
      }
    };
  }

  async clearCache(imageId?: string): Promise<void> {
    if (imageId) {
      await this.cacheService.clearProblematicCache(imageId);
    } else {
      await this.cacheService.clearExpiredCache();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: { healthCheck: true }
      });
      
      return !error && data?.status === 'healthy';
    } catch {
      return false;
    }
  }
}

export const enhancedAnalysisService = new EnhancedAnalysisService();