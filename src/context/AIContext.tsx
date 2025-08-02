import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { edgeFunctionLogger } from '@/services/EdgeFunctionLogger';

interface AIContextType {
  selectedAIModel: 'auto' | 'claude-opus-4-20250514' | 'google-vision' | 'stability-ai' | 'gpt-4o';
  setSelectedAIModel: (model: 'auto' | 'claude-opus-4-20250514' | 'google-vision' | 'stability-ai' | 'gpt-4o') => void;
  isAnalyzing: boolean;
  analyzeImageWithAI: (imageId: string, imageUrl: string, imageName: string, userContext?: string) => Promise<any>;
  availableModels: {
    'claude-opus-4-20250514': boolean;
    'google-vision': boolean;
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
  const [selectedAIModel, setSelectedAIModel] = useState<'auto' | 'claude-opus-4-20250514' | 'google-vision' | 'stability-ai' | 'gpt-4o'>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [availableModels, setAvailableModels] = useState({
    'claude-opus-4-20250514': true, // Assume available, will be checked by backend
    'google-vision': true,
    'stability-ai': true,
    'gpt-4o': true
  });
  
  const { toast } = useToast();

  const analyzeImageWithAI = useCallback(async (
    imageId: string, 
    imageUrl: string, 
    imageName: string, 
    userContext?: string
  ) => {
    setIsAnalyzing(true);
    
    const modelName = selectedAIModel === 'auto' ? 'Smart Selection' : 
                     selectedAIModel === 'claude-opus-4-20250514' ? 'Claude Opus 4' :
                     selectedAIModel === 'google-vision' ? 'Google Vision' : 
                     selectedAIModel === 'stability-ai' ? 'Stability AI' : 'GPT 4o';

    toast({
      title: "AI Analysis Started",
      description: `${modelName} is analyzing your image...`,
    });

    try {
      console.log('Starting AI analysis with model:', selectedAIModel);
      console.log('Analysis payload:', { imageId, imageUrl, imageName, userContext });
      
      // Log edge function start
      const requestId = await edgeFunctionLogger.logFunctionStart('ux-analysis', {
        type: 'ANALYZE_IMAGE',
        imageId,
        imageName,
        aiModel: selectedAIModel
      });
      
      const { data, error } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_IMAGE',
          payload: {
            imageId,
            imageUrl,
            imageName,
            userContext
          },
          aiModel: selectedAIModel === 'auto' ? 'auto' : selectedAIModel
        }
      });
      
      // Log edge function completion
      if (error) {
        await edgeFunctionLogger.logFunctionEnd(requestId, null, new Error(error.message || 'Edge function error'));
      } else {
        await edgeFunctionLogger.logFunctionEnd(requestId, data);
      }
      
      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('AI analysis error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      console.log('AI analysis completed successfully');
      console.log('Analysis result metadata:', data.data?.metadata);
      
      const isRealAI = data.data?.metadata?.aiGenerated === true;
      const analysisType = isRealAI ? 'Real AI Analysis' : 'Mock Analysis';
      
      toast({
        title: "Analysis Complete",
        description: `${modelName} analysis complete (${analysisType})`,
      });

      return data.data;

    } catch (error) {
      console.error('AI analysis failed:', error);
      
      toast({
        title: "Analysis Failed",
        description: `${modelName} analysis failed. Please try again.`,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAIModel, toast]);

  const value: AIContextType = {
    selectedAIModel,
    setSelectedAIModel,
    isAnalyzing,
    analyzeImageWithAI,
    availableModels
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};