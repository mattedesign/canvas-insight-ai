/**
 * Type-Safe Analysis Service - UPDATED
 * Enhanced with proper error handling and type safety
 */

import { supabase } from '@/integrations/supabase/client';
import { AnalysisValidator } from '@/utils/analysisValidator';
import type { LegacyUXAnalysis as UXAnalysis, UploadedImage } from '@/context/AppStateTypes';

export interface AnalysisRequest {
  imageUrl: string;
  userContext?: string;
  priority?: 'low' | 'medium' | 'high';
  retryCount?: number;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: UXAnalysis;
  error?: string;
  processingTime?: number;
}

export interface GroupAnalysisRequest {
  imageUrls: string[];
  groupId: string;
  prompt: string;
  isCustom?: boolean;
}

export interface ConceptGenerationRequest {
  imageUrl: string;
  prompt: string;
  analysisData?: Record<string, unknown>;
}

class TypeSafeAnalysisService {
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 30000;
  private readonly analysisCache = new Map<string, AnalysisResponse>();
  
  async analyzeImage(request: AnalysisRequest): Promise<AnalysisResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey)!;
      if (cached.success) {
        return cached;
      }
    }
    
    const startTime = performance.now();
    
    try {
      // Validate input
      if (!request.imageUrl || !request.imageUrl.startsWith('http')) {
        throw new Error('Invalid image URL provided');
      }
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_IMAGE',
          payload: {
            imageUrl: request.imageUrl,
            userContext: request.userContext || '',
            priority: request.priority || 'medium',
          },
        },
      });
      
      if (error) {
        throw new Error(`Analysis failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No analysis data received');
      }

      // Handle both old and new response formats
      let analysisData = data;
      if (data.success === true && data.data) {
        // New format: { success: true, data: actualAnalysis }
        analysisData = data.data;
        console.log('🔧 TypeSafeAnalysisService: Using new response format');
      } else if (data.success === false) {
        // Error format: { success: false, error: ... }
        throw new Error(data.error || 'Analysis failed');
      }
      // Otherwise assume it's the old direct format

      // Apply robust validation and normalization
      console.log('🔍 TypeSafeAnalysisService: Validating analysis data...', {
        hasVisualAnnotations: Array.isArray(analysisData?.visualAnnotations),
        hasSuggestions: Array.isArray(analysisData?.suggestions),
        annotationsLength: analysisData?.visualAnnotations?.length || 0,
        suggestionsLength: analysisData?.suggestions?.length || 0
      });
      const validationResult = AnalysisValidator.validateAndNormalize(analysisData);
      
      if (validationResult.warnings.length > 0) {
        console.warn('TypeSafeAnalysisService validation warnings:', validationResult.warnings);
      }

      const response: AnalysisResponse = {
        success: true,
        analysis: validationResult.data,
        processingTime: performance.now() - startTime,
      };
      
      // Cache successful response
      this.analysisCache.set(cacheKey, response);
      
      return response;
    } catch (error) {
      const errorResponse: AnalysisResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: performance.now() - startTime,
      };
      
      // Don't cache errors, but log them
      console.error('[AnalysisService] Error:', errorResponse);
      
      // Retry logic
      if ((request.retryCount || 0) < this.MAX_RETRIES) {
        console.log(`[AnalysisService] Retrying analysis (${(request.retryCount || 0) + 1}/${this.MAX_RETRIES})`);
        await this.delay(1000 * Math.pow(2, request.retryCount || 0)); // Exponential backoff
        
        return this.analyzeImage({
          ...request,
          retryCount: (request.retryCount || 0) + 1,
        });
      }
      
      return errorResponse;
    }
  }
  
  async analyzeGroup(request: GroupAnalysisRequest): Promise<AnalysisResponse> {
    const startTime = performance.now();
    
    try {
      // Validate input
      if (!request.imageUrls || request.imageUrls.length === 0) {
        throw new Error('No image URLs provided for group analysis');
      }
      
      if (!request.groupId || !request.prompt) {
        throw new Error('Group ID and prompt are required');
      }
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_GROUP',
          payload: {
            imageUrls: request.imageUrls,
            groupId: request.groupId,
            prompt: request.prompt,
            isCustom: request.isCustom || false,
          },
        },
      });
      
      if (error) {
        throw new Error(`Group analysis failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No group analysis data received');
      }

      // Handle both old and new response formats
      let analysisData = data;
      if (data.success === true && data.data) {
        analysisData = data.data;
      } else if (data.success === false) {
        throw new Error(data.error || 'Group analysis failed');
      }

      // Apply validation for group analysis results
      const validationResult = AnalysisValidator.validateAndNormalize(analysisData);
      
      if (validationResult.warnings.length > 0) {
        console.warn('TypeSafeAnalysisService group analysis warnings:', validationResult.warnings);
      }

      return {
        success: true,
        analysis: validationResult.data,
        processingTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: performance.now() - startTime,
      };
    }
  }
  
  async generateConcept(request: ConceptGenerationRequest): Promise<AnalysisResponse> {
    const startTime = performance.now();
    
    try {
      // Validate input
      if (!request.imageUrl || !request.prompt) {
        throw new Error('Image URL and prompt are required for concept generation');
      }
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'GENERATE_CONCEPT',
          payload: {
            imageUrl: request.imageUrl,
            prompt: request.prompt,
            analysisData: request.analysisData || {},
          },
        },
      });
      
      if (error) {
        throw new Error(`Concept generation failed: ${error.message}`);
      }
      
      // Handle response format
      let analysisData = data;
      if (data.success === true && data.data) {
        analysisData = data.data;
      } else if (data.success === false) {
        throw new Error(data.error || 'Concept generation failed');
      }
      
      return {
        success: true,
        analysis: analysisData,
        processingTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: performance.now() - startTime,
      };
    }
  }
  
  // Type guard to validate analysis response
  private isValidAnalysis(data: unknown): data is UXAnalysis {
    if (!data || typeof data !== 'object') return false;
    
    const analysis = data as Record<string, unknown>;
    
    return (
      typeof analysis.id === 'string' &&
      typeof analysis.imageId === 'string' &&
      Array.isArray(analysis.visualAnnotations) &&
      Array.isArray(analysis.suggestions) &&
      typeof analysis.summary === 'object' &&
      analysis.summary !== null
    );
  }
  
  private getCacheKey(request: AnalysisRequest): string {
    return `${request.imageUrl}-${request.userContext || ''}-${request.priority || 'medium'}`;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Cache management
  clearCache(): void {
    this.analysisCache.clear();
  }
  
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.analysisCache.size,
      keys: Array.from(this.analysisCache.keys()),
    };
  }
  
  // Health check
  async healthCheck(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('ux-analysis', {
        body: { type: 'HEALTH_CHECK' },
      });
      
      return { success: !error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }
}

export const analysisService = new TypeSafeAnalysisService();