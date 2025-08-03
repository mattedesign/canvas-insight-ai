/**
 * Hook for loading existing analyses from database
 * Fixes the issue where analyses are not loaded on project switch
 */

import { useCallback } from 'react';
import { useFinalAppContext } from '@/context/FinalAppContext';
import { OptimizedAnalysisMigrationService } from '@/services/OptimizedMigrationService';
import { useToast } from '@/hooks/use-toast';

export const useAnalysisLoader = () => {
  const { dispatch } = useFinalAppContext();
  const { toast } = useToast();

  const loadAnalysesForProject = useCallback(async (projectId: string, imageIds: string[]) => {
    if (imageIds.length === 0) {
      console.log('No images to load analyses for');
      dispatch({ type: 'SET_ANALYSES', payload: [] });
      return;
    }

    try {
      console.log('🔍 Loading analyses for project:', projectId, 'images:', imageIds.length);
      
      // Load analyses from database
      const analyses = await OptimizedAnalysisMigrationService.loadAnalysesForImagesOptimized(
        imageIds,
        { limit: 100 }
      );

      console.log('✅ Loaded', analyses.length, 'analyses from database');
      
      // Update state with loaded analyses
      dispatch({ type: 'SET_ANALYSES', payload: analyses });
      
      if (analyses.length > 0) {
        toast({
          title: "Analyses Loaded",
          description: `Loaded ${analyses.length} existing analyses`,
        });
      }

    } catch (error) {
      console.error('Failed to load analyses:', error);
      toast({
        title: "Failed to Load Analyses",
        description: "There was an error loading existing analyses",
        variant: "destructive",
      });
      
      // Set empty analyses on error to prevent stale data
      dispatch({ type: 'SET_ANALYSES', payload: [] });
    }
  }, [dispatch, toast]);

  const refreshAnalyses = useCallback(async (imageIds: string[]) => {
    if (imageIds.length === 0) return;

    try {
      console.log('🔄 Refreshing analyses for images:', imageIds.length);
      
      const analyses = await OptimizedAnalysisMigrationService.loadAnalysesForImagesOptimized(
        imageIds,
        { limit: 100, status: 'completed' }
      );

      dispatch({ type: 'SET_ANALYSES', payload: analyses });
      console.log('✅ Refreshed', analyses.length, 'analyses');

    } catch (error) {
      console.error('Failed to refresh analyses:', error);
    }
  }, [dispatch]);

  return {
    loadAnalysesForProject,
    refreshAnalyses
  };
};