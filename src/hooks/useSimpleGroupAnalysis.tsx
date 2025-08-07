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
    groupName?: string
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
      setProgress({
        stage: 'initializing',
        progress: 10,
        message: `Preparing to analyze ${validUrls.length} images`,
        isLoading: true
      });

      setProgress({
        stage: 'processing',
        progress: 30,
        message: 'Analyzing individual images...',
        isLoading: true
      });

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

      setProgress({
        stage: 'completed',
        progress: 100,
        message: 'Group analysis completed successfully',
        isLoading: false
      });

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