import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SimpleGroupAnalysisProgress {
  stage: string;
  progress: number;
  message?: string;
  isLoading: boolean;
  error?: string;
}

export interface SimpleGroupAnalysisResult {
  success: boolean;
  groupAnalysis?: any;
  individualAnalyses?: Array<{
    url: string;
    hasAnalysis: boolean;
    error?: string;
  }>;
  metadata?: {
    totalImages: number;
    successfulAnalyses: number;
    processingTime: number;
  };
  error?: string;
}

export const useSimpleGroupAnalysis = () => {
  const [progress, setProgress] = useState<SimpleGroupAnalysisProgress>({
    stage: 'idle',
    progress: 0,
    isLoading: false
  });

  const analyzeGroup = useCallback(async (
    imageUrls: string[],
    prompt: string,
    userContext?: string,
    groupId?: string,
    groupName?: string,
    onProgress?: (stage: string, progress: number, message?: string) => void
  ): Promise<SimpleGroupAnalysisResult> => {
    console.log('useSimpleGroupAnalysis - Starting group analysis:', {
      imageUrlsCount: imageUrls.length,
      prompt: prompt.substring(0, 100) + '...',
      groupId,
      groupName
    });

    // Validate inputs
    if (!imageUrls || imageUrls.length === 0) {
      const error = 'No image URLs provided for group analysis';
      setProgress({ stage: 'error', progress: 0, isLoading: false, error });
      throw new Error(error);
    }

    if (!prompt) {
      const error = 'Analysis prompt is required';
      setProgress({ stage: 'error', progress: 0, isLoading: false, error });
      throw new Error(error);
    }

    // Filter out invalid URLs
    const validUrls = imageUrls.filter(url => 
      url && typeof url === 'string' && url.trim() !== ''
    );

    if (validUrls.length === 0) {
      const error = 'No valid image URLs found';
      setProgress({ stage: 'error', progress: 0, isLoading: false, error });
      throw new Error(error);
    }

    console.log('Valid URLs for analysis:', validUrls.length);

    try {
      // helper to emit progress both to local state and external listener
      const emit = (stage: string, pct: number, msg?: string, isLoading = true) => {
        setProgress({ stage, progress: pct, message: msg, isLoading });
        try { onProgress?.(stage, pct, msg); } catch (e) { console.warn('onProgress callback error', e); }
      };

      emit('starting', 5, `Preparing to analyze ${validUrls.length} images`);
      emit('individual-analysis', 30, 'Analyzing individual images...');

      // Call the new simplified edge function
      const { data, error } = await supabase.functions.invoke('group-ux-analysis', {
        body: {
          imageUrls: validUrls,
          prompt,
          userContext,
          groupId,
          groupName
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Analysis failed: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.success) {
        console.error('Analysis failed:', data);
        throw new Error(`Analysis failed: ${data?.error || 'Unknown error'}`);
      }

      // Advance progress through synthesis/finalization phases
      emit('synthesizing', 80, 'Synthesizing group insights...', true);
      emit('finalizing', 95, 'Finalizing results...', true);

      setProgress({
        stage: 'completed',
        progress: 100,
        message: 'Group analysis completed successfully',
        isLoading: false
      });
      try { onProgress?.('complete', 100, 'Group analysis completed successfully'); } catch {}


      console.log('Group analysis completed:', {
        totalImages: data.metadata?.totalImages,
        successfulAnalyses: data.metadata?.successfulAnalyses
      });

      // Show success toast
      toast.success(
        `Group analysis completed! Analyzed ${data.metadata?.successfulAnalyses || 0} of ${data.metadata?.totalImages || 0} images.`
      );

      return data as SimpleGroupAnalysisResult;

    } catch (error) {
      console.error('Group analysis error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setProgress({
        stage: 'error',
        progress: 0,
        isLoading: false,
        error: errorMessage
      });

      try { onProgress?.('error', 0, errorMessage); } catch {}

      // Show error toast
      toast.error(`Group analysis failed: ${errorMessage}`);

      throw error;
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      stage: 'idle',
      progress: 0,
      isLoading: false
    });
  }, []);

  return {
    analyzeGroup,
    progress,
    resetProgress,
    isLoading: progress.isLoading
  };
};