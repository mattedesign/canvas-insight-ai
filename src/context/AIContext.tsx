import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIContextType {
  selectedAIModel: 'auto' | 'claude-vision' | 'google-vision' | 'stability-ai' | 'openai';
  setSelectedAIModel: (model: 'auto' | 'claude-vision' | 'google-vision' | 'stability-ai' | 'openai') => void;
  isAnalyzing: boolean;
  analyzeImageWithAI: (imageId: string, imageUrl: string, imageName: string, userContext?: string) => Promise<any>;
  availableModels: {
    'claude-vision': boolean;
    'google-vision': boolean;
    'stability-ai': boolean;
    'openai': boolean;
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
  const [selectedAIModel, setSelectedAIModel] = useState<'auto' | 'claude-vision' | 'google-vision' | 'stability-ai' | 'openai'>('auto');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [availableModels, setAvailableModels] = useState({
    'claude-vision': true, // Assume available, will be checked by backend
    'google-vision': true,
    'stability-ai': true,
    'openai': true
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
                     selectedAIModel === 'claude-vision' ? 'Claude Vision' :
                     selectedAIModel === 'google-vision' ? 'Google Vision' : 
                     selectedAIModel === 'stability-ai' ? 'Stability AI' : 'OpenAI';

    toast({
      title: "AI Analysis Started",
      description: `${modelName} is analyzing your image...`,
    });

    try {
      console.log('Starting AI analysis with model:', selectedAIModel);
      console.log('Analysis payload:', { imageId, imageUrl, imageName, userContext });
      
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