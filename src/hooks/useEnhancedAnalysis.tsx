/**
 * Enhanced Analysis Hook - Unified analysis interface with real-time status
 * Combines API status checking, image processing, and analysis execution
 */

import { useState, useCallback, useEffect } from 'react';
import { analysisService, type AnalysisRequest, type AnalysisResponse } from '@/services/TypeSafeAnalysisService';
import { apiStatusService, type APIStatusResult } from '@/services/APIStatusService';
import { simplifiedImageService, type ProcessedImage } from '@/services/SimplifiedImageService';
import type { UploadedImage } from '@/context/AppStateTypes';

export interface AnalysisProgress {
  stage: string;
  progress: number;
  isLoading: boolean;
  error?: string;
  currentStep?: string;
}

export interface EnhancedAnalysisState {
  // Analysis state
  progress: AnalysisProgress;
  currentAnalysis: AnalysisResponse | null;
  
  // API status
  apiStatus: APIStatusResult | null;
  isCheckingStatus: boolean;
  
  // Image processing
  processedImages: Map<string, ProcessedImage>;
  
  // General state
  isAnalyzing: boolean;
  lastError: string | null;
}

export function useEnhancedAnalysis() {
  const [state, setState] = useState<EnhancedAnalysisState>({
    progress: {
      stage: 'idle',
      progress: 0,
      isLoading: false
    },
    currentAnalysis: null,
    apiStatus: null,
    isCheckingStatus: false,
    processedImages: new Map(),
    isAnalyzing: false,
    lastError: null
  });

  // Update progress helper
  const updateProgress = useCallback((updates: Partial<AnalysisProgress>) => {
    setState(prev => ({
      ...prev,
      progress: { ...prev.progress, ...updates }
    }));
  }, []);

  // Update state helper
  const updateState = useCallback((updates: Partial<EnhancedAnalysisState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Check API status
  const checkAPIStatus = useCallback(async (force = false) => {
    if (state.isCheckingStatus && !force) return;
    
    updateState({ isCheckingStatus: true, lastError: null });
    
    try {
      const status = await apiStatusService.checkAPIStatus(force);
      updateState({ apiStatus: status, isCheckingStatus: false });
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API status check failed';
      updateState({ 
        isCheckingStatus: false, 
        lastError: errorMessage 
      });
      throw error;
    }
  }, [state.isCheckingStatus, updateState]);

  // Process image for analysis
  const processImage = useCallback(async (image: UploadedImage): Promise<ProcessedImage> => {
    updateProgress({ 
      stage: 'processing', 
      progress: 10, 
      isLoading: true,
      currentStep: 'Processing image...'
    });

    try {
      const processed = await simplifiedImageService.processImageForAnalysis(image);
      
      // Update cache
      setState(prev => ({
        ...prev,
        processedImages: new Map(prev.processedImages).set(image.id, processed)
      }));

      updateProgress({ 
        progress: 20,
        currentStep: 'Image ready for analysis'
      });

      return processed;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Image processing failed';
      updateProgress({ 
        error: errorMessage,
        isLoading: false,
        currentStep: 'Image processing failed'
      });
      throw error;
    }
  }, [updateProgress]);

  // Main analysis function
  const analyzeImage = useCallback(async (
    image: UploadedImage | string,
    userContext?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AnalysisResponse> => {
    updateState({ 
      isAnalyzing: true, 
      lastError: null,
      currentAnalysis: null
    });

    updateProgress({
      stage: 'starting',
      progress: 0,
      isLoading: true,
      error: undefined,
      currentStep: 'Initializing analysis...'
    });

    try {
      // Step 1: Check API status
      updateProgress({ 
        progress: 5,
        currentStep: 'Checking API availability...'
      });
      
      const apiStatus = await checkAPIStatus();
      if (!apiStatus.isReady) {
        throw new Error('No AI services are available. Please configure API keys.');
      }

      // Step 2: Process image if needed
      let imageUrl: string;
      if (typeof image === 'string') {
        imageUrl = image;
        updateProgress({ 
          progress: 20,
          currentStep: 'Using provided image URL'
        });
      } else {
        const processed = await processImage(image);
        if (!processed.isReady) {
          throw new Error(processed.error || 'Image processing failed');
        }
        imageUrl = processed.url;
      }

      // Step 3: Run analysis
      updateProgress({
        stage: 'analyzing',
        progress: 30,
        currentStep: 'Running AI analysis...'
      });

      const request: AnalysisRequest = {
        imageUrl,
        userContext,
        priority
      };

      const result = await analysisService.analyzeImage(request);

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Step 4: Complete
      updateProgress({
        stage: 'complete',
        progress: 100,
        isLoading: false,
        currentStep: 'Analysis complete!'
      });

      updateState({ 
        currentAnalysis: result,
        isAnalyzing: false
      });

      console.log('✅ Enhanced analysis completed successfully');
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      updateProgress({
        stage: 'error',
        progress: 0,
        isLoading: false,
        error: errorMessage,
        currentStep: 'Analysis failed'
      });

      updateState({ 
        isAnalyzing: false,
        lastError: errorMessage
      });

      console.error('❌ Enhanced analysis failed:', error);
      throw error;
    }
  }, [checkAPIStatus, processImage, updateProgress, updateState]);

  // Batch analyze multiple images
  const analyzeMultipleImages = useCallback(async (
    images: UploadedImage[],
    userContext?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AnalysisResponse[]> => {
    updateState({ isAnalyzing: true, lastError: null });
    
    try {
      const results: AnalysisResponse[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        updateProgress({
          stage: 'batch',
          progress: (i / images.length) * 100,
          isLoading: true,
          currentStep: `Analyzing image ${i + 1} of ${images.length}`
        });

        const result = await analyzeImage(image, userContext, priority);
        results.push(result);
      }

      updateProgress({
        stage: 'complete',
        progress: 100,
        isLoading: false,
        currentStep: `Completed ${images.length} analyses`
      });

      return results;
    } catch (error) {
      updateState({ isAnalyzing: false });
      throw error;
    } finally {
      updateState({ isAnalyzing: false });
    }
  }, [analyzeImage, updateProgress, updateState]);

  // Cancel analysis
  const cancelAnalysis = useCallback(() => {
    updateState({ 
      isAnalyzing: false,
      lastError: 'Analysis cancelled by user'
    });
    
    updateProgress({
      stage: 'cancelled',
      progress: 0,
      isLoading: false,
      error: 'Cancelled',
      currentStep: 'Analysis cancelled'
    });
  }, [updateProgress, updateState]);

  // Clear all data
  const clearAll = useCallback(() => {
    setState({
      progress: {
        stage: 'idle',
        progress: 0,
        isLoading: false
      },
      currentAnalysis: null,
      apiStatus: null,
      isCheckingStatus: false,
      processedImages: new Map(),
      isAnalyzing: false,
      lastError: null
    });
    
    // Clear service caches
    analysisService.clearCache();
    simplifiedImageService.clearCache();
    apiStatusService.clearCache();
  }, []);

  // Initialize API status on mount
  useEffect(() => {
    checkAPIStatus();
  }, [checkAPIStatus]);

  return {
    // State
    ...state,
    
    // Analysis functions
    analyzeImage,
    analyzeMultipleImages,
    cancelAnalysis,
    
    // Utility functions
    checkAPIStatus,
    processImage,
    clearAll,
    
    // Computed values
    hasAnyAPI: state.apiStatus?.isReady || false,
    availableAPIs: state.apiStatus?.availableAPIs || [],
    needsConfiguration: !state.apiStatus?.isReady,
    
    // Cache stats
    getCacheStats: () => ({
      analysis: analysisService.getCacheStats(),
      images: simplifiedImageService.getCacheStats(),
      processedImages: state.processedImages.size
    })
  };
}