import { useState, useCallback } from 'react';
import { useAI } from '@/context/AIContext';
import { useToast } from '@/hooks/use-toast';

interface ComparisonResult {
  model: string;
  result: any;
  duration: number;
  error?: string;
}

export const useAIModelComparison = () => {
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const { analyzeImageWithAI } = useAI();
  const { toast } = useToast();

  const compareModels = useCallback(async (
    imageId: string,
    imageUrl: string, 
    imageName: string,
    userContext?: string,
    modelsToCompare: string[] = ['claude-opus-4-20250514', 'gpt-4o', 'stability-ai']
  ) => {
    setIsComparing(true);
    setComparisonResults([]);

    toast({
      title: "Multi-Model Comparison Started",
      description: `Analyzing with ${modelsToCompare.length} AI models for comprehensive insights...`,
    });

    const results: ComparisonResult[] = [];

    // Run analyses in parallel for faster comparison
    const analysisPromises = modelsToCompare.map(async (model) => {
      const startTime = performance.now();
      try {
        // Temporarily override model selection for comparison
        const originalModel = model;
        const result = await analyzeImageWithAI(imageId, imageUrl, imageName, userContext);
        const duration = performance.now() - startTime;

        return {
          model: originalModel,
          result,
          duration: Math.round(duration),
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        return {
          model,
          result: null,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : 'Analysis failed'
        };
      }
    });

    try {
      const analysisResults = await Promise.allSettled(analysisPromises);
      
      analysisResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            model: modelsToCompare[index],
            result: null,
            duration: 0,
            error: 'Promise failed'
          });
        }
      });

      setComparisonResults(results);

      const successfulAnalyses = results.filter(r => !r.error).length;
      
      toast({
        title: "Comparison Complete",
        description: `Successfully analyzed with ${successfulAnalyses}/${modelsToCompare.length} models`,
        variant: successfulAnalyses > 0 ? "default" : "destructive"
      });

    } catch (error) {
      toast({
        title: "Comparison Failed",
        description: "Failed to complete multi-model comparison",
        variant: "destructive"
      });
    } finally {
      setIsComparing(false);
    }
  }, [analyzeImageWithAI, toast]);

  const getBestPerformingModel = useCallback(() => {
    if (comparisonResults.length === 0) return null;

    // Score models based on analysis quality and speed
    const scoredResults = comparisonResults
      .filter(r => !r.error && r.result)
      .map(result => {
        const analysis = result.result;
        const speedScore = Math.max(0, 100 - (result.duration / 1000) * 10); // Penalize slow responses
        const qualityScore = (analysis.summary?.overallScore || 70);
        const suggestionCount = (analysis.suggestions?.length || 0) * 5;
        
        return {
          ...result,
          totalScore: speedScore * 0.3 + qualityScore * 0.5 + suggestionCount * 0.2
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    return scoredResults[0] || null;
  }, [comparisonResults]);

  const clearComparison = useCallback(() => {
    setComparisonResults([]);
  }, []);

  return {
    isComparing,
    comparisonResults,
    compareModels,
    getBestPerformingModel,
    clearComparison
  };
};