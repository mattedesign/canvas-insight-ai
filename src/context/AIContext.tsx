import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AnalysisProgress } from '@/services/EnhancedAnalysisPipeline';
import { AnalysisContext } from '@/types/contextTypes';
import { startUxAnalysis } from '@/services/StartUxAnalysis';
import { fetchLatestAnalysis } from '@/services/fetchLatestAnalysis';

interface AIContextType {
  selectedAIModel: 'auto' | 'claude-opus-4-20250514' | 'stability-ai' | 'gpt-4o';
  setSelectedAIModel: (model: 'auto' | 'claude-opus-4-20250514' | 'stability-ai' | 'gpt-4o') => void;
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
  requiresClarification: boolean;
  clarificationQuestions: string[];
  analysisContext: AnalysisContext | null;
  analyzeImageWithAI: (imageId: string, imageUrl: string, imageName: string, userContext?: string) => Promise<any>;
  provideClarificationAndContinue: (responses: Record<string, string>) => Promise<any>;
  cancelAnalysis: () => void;
  availableModels: {
    'claude-opus-4-20250514': boolean;
    'stability-ai': boolean;
    'gpt-4o': boolean;
  };
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAIModel, setSelectedAIModel] = useState<'auto' | 'claude-opus-4-20250514' | 'stability-ai' | 'gpt-4o'>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [requiresClarification, setRequiresClarification] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([]);
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext | null>(null);
  const [currentAnalysisParams, setCurrentAnalysisParams] = useState<{
    imageId: string;
    imageUrl: string;
    imageName: string;
    userContext?: string;
  } | null>(null);
  const [availableModels, setAvailableModels] = useState({
    'claude-opus-4-20250514': true, // Assume available, will be checked by backend
    'stability-ai': true,
    'gpt-4o': true
  });
  
  const { toast } = useToast();

  // PHASE 2: Enhanced image URL handling with storage resolution
  const getValidImageData = useCallback(async (image: any): Promise<{ url: string; base64?: string }> => {
    try {
      const { BlobUrlReplacementService } = await import('@/services/BlobUrlReplacementService');
      return await BlobUrlReplacementService.getValidImageUrl(image);
    } catch (error) {
      console.error('Failed to get valid image data:', error);
      return { url: image.url || '' };
    }
  }, []);

  const analyzeImageWithAI = useCallback(async (
    imageId: string, 
    imageUrl: string, 
    imageName: string, 
    userContext?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisProgress(null);
    setRequiresClarification(false);
    setClarificationQuestions([]);
    setAnalysisContext(null);
    setCurrentAnalysisParams({ imageId, imageUrl, imageName, userContext });

    toast({
      title: "AI Analysis Started",
      description: `Analyzing ${imageName}...`,
    });

    try {
      const { jobId } = await startUxAnalysis({
        imageId,
        imageUrl,
        userContext: userContext || null,
      });

      const result = await new Promise<any>((resolve, reject) => {
        const channel = supabase
          .channel(`analysis-job-${jobId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'analysis_jobs',
            filter: `id=eq.${jobId}`,
          }, async (payload: any) => {
            const j = payload.new as { status: string; progress: number | null; current_stage: string | null; error?: string | null };
            setAnalysisProgress({ stage: j.current_stage || 'processing', progress: j.progress || 0 } as AnalysisProgress);

            if (j.status === 'completed') {
              try {
                const latest = await fetchLatestAnalysis(imageId);
                supabase.removeChannel(channel);
                resolve(latest);
              } catch (e: any) {
                supabase.removeChannel(channel);
                reject(new Error(e?.message || 'Failed to fetch analysis results'));
              } finally {
                setIsAnalyzing(false);
                setCurrentAnalysisParams(null);
              }
            }

            if (j.status === 'failed') {
              supabase.removeChannel(channel);
              setIsAnalyzing(false);
              setCurrentAnalysisParams(null);
              reject(new Error(j.error || 'Analysis failed'));
            }
          })
          .subscribe();
      });

      toast({ title: 'Analysis Complete', description: `${imageName} analyzed successfully` });
      setAnalysisProgress(null);
      return result;
    } catch (error) {
      console.error('Job-based analysis failed:', error);
      toast({ title: 'Analysis Failed', description: 'Failed to analyze image.', variant: 'destructive' });
      setAnalysisProgress(null);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const provideClarificationAndContinue = useCallback(async (_responses: Record<string, string>) => {
    toast({
      title: 'Clarification Not Supported',
      description: 'The job-based pipeline currently does not support interactive clarification.',
      variant: 'destructive',
    });
    throw new Error('Clarification flow not supported in job-based pipeline');
  }, [toast]);

  const cancelAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setAnalysisProgress(null);
    setRequiresClarification(false);
    setClarificationQuestions([]);
    setAnalysisContext(null);
    setCurrentAnalysisParams(null);
    
    toast({
      title: "Analysis Cancelled",
      description: "The analysis has been cancelled.",
    });
  }, [toast]);

  const value: AIContextType = {
    selectedAIModel,
    setSelectedAIModel,
    isAnalyzing,
    analysisProgress,
    requiresClarification,
    clarificationQuestions,
    analysisContext,
    analyzeImageWithAI,
    provideClarificationAndContinue,
    cancelAnalysis,
    availableModels
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};