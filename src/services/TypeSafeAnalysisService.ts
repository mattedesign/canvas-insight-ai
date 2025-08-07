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
import { enhancedAnalysisStorage } from './EnhancedAnalysisStorage';
import { AnalysisIntegrationService, type IntegrationResponse } from './AnalysisIntegrationService';
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

      // Enhanced validation debugging for summary structure
      console.log('🔍 TypeSafeAnalysisService: Pre-validation analysis data...', {
        hasRawSummary: !!analysisData?.summary,
        hasMappedSummary: !!mappedData?.summary,
        rawSummaryType: typeof analysisData?.summary,
        mappedSummaryType: typeof mappedData?.summary,
        rawSummaryKeys: analysisData?.summary ? Object.keys(analysisData.summary) : [],
        mappedSummaryKeys: mappedData?.summary ? Object.keys(mappedData.summary) : [],
        hasVisualAnnotations: Array.isArray(mappedData?.visualAnnotations),
        hasSuggestions: Array.isArray(mappedData?.suggestions),
        annotationsLength: mappedData?.visualAnnotations?.length || 0,
        suggestionsLength: mappedData?.suggestions?.length || 0
      });

      // Use the new integration service for standardized processing
      const integrationResult = this.processWithIntegration(mappedData, false);
      
      if (!integrationResult.success) {
        throw new Error(integrationResult.error || 'Integration processing failed');
      }

      const response: AnalysisResponse = {
        success: true,
        analysis: integrationResult.analysis!,
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
      
      const { data, error } = await supabase.functions.invoke('group-ux-analysis', {
        body: {
          imageUrls: request.imageUrls,
          prompt: request.prompt,
          groupId: request.groupId,
          isCustom: request.isCustom || false,
        },
      });
      
      if (error) {
        throw new Error(`Group analysis failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No group analysis data received');
      }

      // Normalize to expected shape for UI consumers
      let analysisData: any;
      if (data.success === false) {
        throw new Error(data.error || 'Group analysis failed');
      }
      // Prefer groupAnalysis key when present
      analysisData = data.groupAnalysis ?? data.data ?? data;

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
  
  /**
   * Process analysis data using the integration service
   */
  private processWithIntegration(analysisData: any, bypassValidation: boolean = false): IntegrationResponse {
    return AnalysisIntegrationService.processEdgeFunctionResponse(analysisData, bypassValidation);
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
  
  // Enhanced Analysis Management with Version Support
  async checkExistingAnalysis(imageId: string, analysisType: string = 'full_analysis'): Promise<{
    hasRecent: boolean;
    latestVersion?: number;
    latestId?: string;
    createdAt?: string;
  }> {
    try {
      const existingInfo = await enhancedAnalysisStorage.checkExistingAnalysis(imageId, analysisType);
      console.log('🔍 Existing analysis check:', existingInfo);
      return existingInfo;
    } catch (error) {
      console.error('Error checking existing analysis:', error);
      return { hasRecent: false };
    }
  }

  async getAnalysisHistory(imageId: string, analysisType?: string): Promise<any[]> {
    try {
      const history = await enhancedAnalysisStorage.getAnalysisHistory(imageId, analysisType);
      console.log('📋 Analysis history retrieved:', history.length, 'versions');
      return history;
    } catch (error) {
      console.error('Error getting analysis history:', error);
      return [];
    }
  }

  async deleteAnalysisVersion(analysisId: string): Promise<boolean> {
    try {
      const success = await enhancedAnalysisStorage.deleteAnalysisVersion(analysisId);
      console.log('🗑️ Analysis version deletion:', success ? 'success' : 'failed');
      return success;
    } catch (error) {
      console.error('Error deleting analysis version:', error);
      return false;
    }
  }

  async forceNewAnalysis(request: AnalysisRequest & { imageId: string }): Promise<AnalysisResponse> {
    // Same as analyzeImage but with forceNew flag
    console.log('🔄 Forcing new analysis for image:', request.imageId);
    
    // Clear cache for this request to ensure fresh analysis
    const cacheKey = this.getCacheKey(request);
    this.analysisCache.delete(cacheKey);
    
    // Call the edge function with explicit forceNew flag
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          action: 'ENHANCED_CONTEXT_ANALYSIS',
          payload: {
            imageId: request.imageId,
            imageUrl: request.imageUrl,
            userContext: request.userContext || '',
            priority: request.priority || 'medium',
            forceNew: true, // Key difference - force new analysis
            analysisTimestamp: new Date().toISOString(),
            requestId: `force_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
        },
      });
      
      if (error) {
        throw new Error(`Forced analysis failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No analysis data received');
      }

      // Handle response format
      let analysisData = data;
      if (data.success === true && data.data) {
        analysisData = data.data;
      } else if (data.success === false) {
        throw new Error(data.error || 'Forced analysis failed');
      }

      // Apply field mapping and validation
      const mappedData = AnalysisDataMapper.mapBackendToFrontend(analysisData);
      const validationResult = AnalysisValidator.validateAndNormalize(mappedData);
      
      if (validationResult.warnings.length > 0) {
        console.warn('Forced analysis validation warnings:', validationResult.warnings);
      }

      const response: AnalysisResponse = {
        success: true,
        analysis: validationResult.data,
        processingTime: performance.now() - startTime,
      };
      
      // Update cache with new analysis
      this.analysisCache.set(cacheKey, response);
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: performance.now() - startTime,
      };
    }
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