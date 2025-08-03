import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { edgeFunctionLogger } from '@/services/EdgeFunctionLogger';
import { EnhancedAnalysisPipeline, AnalysisProgress, EnhancedAnalysisResult } from '@/services/EnhancedAnalysisPipeline';
import { AnalysisContext } from '@/types/contextTypes';

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

  // Helper function to convert blob URL to base64
  const blobUrlToBase64 = useCallback(async (blobUrl: string): Promise<string> => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix to get just the base64 data
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert blob URL to base64:', error);
      throw error;
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
    
    // Store current analysis parameters for potential clarification
    setCurrentAnalysisParams({ imageId, imageUrl, imageName, userContext });
    
    const modelName = selectedAIModel === 'auto' ? 'Smart Selection' : 
                     selectedAIModel === 'claude-opus-4-20250514' ? 'Claude Opus 4' :
                     selectedAIModel === 'stability-ai' ? 'Stability AI' : 'GPT 4o';

    toast({
      title: "Enhanced AI Analysis Started",
      description: `${modelName} is analyzing your interface with context awareness...`,
    });

    try {
      console.log('Starting enhanced AI analysis for:', { imageId, imageName });
      
      // Create enhanced analysis pipeline with progress tracking
      const pipeline = new EnhancedAnalysisPipeline((progress: AnalysisProgress) => {
        setAnalysisProgress(progress);
        console.log('Analysis progress:', progress);
      });

      const result: EnhancedAnalysisResult = await pipeline.executeContextAwareAnalysis(
        imageId,
        imageUrl,
        imageName,
        userContext
      );

      if (result.requiresClarification) {
        // Handle clarification needed
        setRequiresClarification(true);
        setClarificationQuestions(result.clarificationQuestions || []);
        setAnalysisContext(result.analysisContext || null);
        
        toast({
          title: "Additional Context Needed",
          description: "Please provide some details to optimize the analysis for your needs.",
        });
        
        return result; // Return partial result for clarification
      }

      if (!result.success) {
        throw new Error(result.error || 'Enhanced analysis failed');
      }

      console.log('Enhanced AI analysis completed successfully');
      
      const interfaceType = result.analysisContext?.image.primaryType || 'interface';
      const confidence = result.analysisContext?.confidence || 0;
      
      toast({
        title: "Enhanced Analysis Complete",
        description: `${interfaceType} analysis completed with ${Math.round(confidence * 100)}% confidence`,
      });

      // Clear progress and clarification state on success
      setAnalysisProgress(null);
      setRequiresClarification(false);
      setCurrentAnalysisParams(null);

      return result.data;

    } catch (error) {
      console.error('Enhanced AI analysis failed:', error);
      
      toast({
        title: "Enhanced Analysis Failed",
        description: `Context-aware analysis failed. Please try again.`,
        variant: "destructive",
      });
      
      setAnalysisProgress(null);
      setRequiresClarification(false);
      setCurrentAnalysisParams(null);
      
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAIModel, toast]);

  const provideClarificationAndContinue = useCallback(async (responses: Record<string, string>) => {
    if (!currentAnalysisParams || !analysisContext) {
      throw new Error('No analysis in progress');
    }

    setIsAnalyzing(true);
    setRequiresClarification(false);
    
    toast({
      title: "Continuing Analysis",
      description: "Processing your feedback to provide optimized insights...",
    });

    try {
      const pipeline = new EnhancedAnalysisPipeline((progress: AnalysisProgress) => {
        setAnalysisProgress(progress);
      });

      const result = await pipeline.processClarificationAndContinue(
        currentAnalysisParams.imageId,
        currentAnalysisParams.imageUrl,
        currentAnalysisParams.imageName,
        analysisContext,
        responses,
        currentAnalysisParams.userContext
      );

      if (!result.success) {
        throw new Error(result.error || 'Enhanced analysis with clarification failed');
      }

      const interfaceType = result.analysisContext?.image.primaryType || 'interface';
      const confidence = (result.analysisContext as any)?.enhancedConfidence || result.analysisContext?.confidence || 0;
      
      toast({
        title: "Enhanced Analysis Complete",
        description: `${interfaceType} analysis completed with ${Math.round(confidence * 100)}% confidence`,
      });

      // Clear all state
      setAnalysisProgress(null);
      setRequiresClarification(false);
      setClarificationQuestions([]);
      setAnalysisContext(null);
      setCurrentAnalysisParams(null);

      return result.data;

    } catch (error) {
      console.error('Enhanced analysis with clarification failed:', error);
      
      toast({
        title: "Enhanced Analysis Failed",
        description: "Failed to complete analysis with provided context.",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentAnalysisParams, analysisContext, toast]);

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