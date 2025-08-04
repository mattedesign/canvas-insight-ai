/**
 * Type-Safe Analysis Service - UPDATED
 * Enhanced with proper error handling and type safety
 */

import { supabase } from '@/integrations/supabase/client';
import { AnalysisValidator } from '@/utils/analysisValidator';
import { AnalysisDataMapper } from './AnalysisDataMapper';
import { AnalysisFieldMappingDebug } from '@/utils/analysisFieldMappingDebug';
import { simplifiedImageService } from './SimplifiedImageService';
import { apiStatusService } from './APIStatusService';
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
        console.log('📁 Using cached analysis result');
        return cached;
      }
    }
    
    const startTime = performance.now();
    
    try {
      // Enhanced input validation
      if (!request.imageUrl) {
        throw new Error('Image URL is required');
      }

      // Check API availability before proceeding
      console.log('🔍 Checking API availability...');
      const apiCheck = await apiStatusService.getQuickAPICheck();
      if (!apiCheck.hasAnyAPI) {
        throw new Error('No API keys configured. Please configure at least one AI service API key in the edge function settings.');
      }

      console.log('✅ API check passed, available services:', apiCheck.apis);

      // Validate and process image URL
      let processedImageUrl = request.imageUrl;
      if (!request.imageUrl.startsWith('http')) {
        console.warn('⚠️ Non-HTTP URL detected, attempting to process:', request.imageUrl);
        // For blob URLs or other formats, we'll let the edge function handle it
        processedImageUrl = request.imageUrl;
      }
      
      console.log('🚀 Starting analysis with enhanced context pipeline...');
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          action: 'ENHANCED_CONTEXT_ANALYSIS',
          payload: {
            imageUrl: processedImageUrl,
            userContext: request.userContext || '',
            priority: request.priority || 'medium',
            // Additional metadata for better analysis
            analysisTimestamp: new Date().toISOString(),
            requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

      // Apply field mapping to handle backend/frontend differences
      const mappedData = AnalysisDataMapper.mapBackendToFrontend(analysisData);
      
      // Debug field mapping in development
      AnalysisFieldMappingDebug.logFieldMapping(analysisData, mappedData, 'TypeSafeAnalysisService');
      const mappingValidation = AnalysisFieldMappingDebug.validateFieldMapping(analysisData, mappedData);
      if (!mappingValidation.valid) {
        console.warn('🔧 Field mapping issues detected:', mappingValidation.issues);
      }

      // Apply robust validation and normalization
      console.log('🔍 TypeSafeAnalysisService: Validating analysis data...', {
        hasVisualAnnotations: Array.isArray(mappedData?.visualAnnotations),
        hasSuggestions: Array.isArray(mappedData?.suggestions),
        annotationsLength: mappedData?.visualAnnotations?.length || 0,
        suggestionsLength: mappedData?.suggestions?.length || 0
      });
      const validationResult = AnalysisValidator.validateAndNormalize(mappedData);
      
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

      // Apply field mapping for group analysis
      const mappedData = AnalysisDataMapper.mapBackendToFrontend(analysisData);
      
      // Apply validation for group analysis results
      const validationResult = AnalysisValidator.validateAndNormalize(mappedData);
      
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