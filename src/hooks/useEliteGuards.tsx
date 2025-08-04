// ============================================
// 🐜 ELITE GUARDS HOOK
// Phase 4: Strategic Analysis Integration
// ============================================

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EliteGuardsService } from '@/services/EliteGuardsService';
import { useToast } from '@/hooks/use-toast';

interface StrategicInsightsState {
  isProcessing: boolean;
  personas: any[];
  marketInsights: any[];
  gapAnalysis: any[];
  error?: string;
}

export function useEliteGuards() {
  const [state, setState] = useState<StrategicInsightsState>({
    isProcessing: false,
    personas: [],
    marketInsights: [],
    gapAnalysis: []
  });
  const { toast } = useToast();
  const eliteGuards = EliteGuardsService.getInstance();

  // Check if Elite Guards are enabled
  const isEnabled = useCallback(() => {
    return eliteGuards.isEnabled();
  }, []);

  // Deploy Elite Guards after synthesis
  const deployEliteGuards = useCallback(async (
    jobId: string,
    synthesisResult: any,
    contextData: any
  ) => {
    setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

    try {
      console.log('🐜 [ELITE-GUARDS-HOOK] Deploying strategic analysis...');
      
      const result = await eliteGuards.deployEliteGuards(
        jobId,
        synthesisResult,
        contextData
      );

      if (result.success) {
        setState({
          isProcessing: false,
          personas: result.personas || [],
          marketInsights: result.marketInsights || [],
          gapAnalysis: result.gapAnalysis || [],
          error: undefined
        });

        toast({
          title: "Strategic Analysis Complete",
          description: `Identified ${result.personas?.length || 0} personas, ${result.marketInsights?.length || 0} market trends, and ${result.gapAnalysis?.length || 0} goal gaps`,
        });
      } else {
        throw new Error(result.error || 'Elite Guards deployment failed');
      }

    } catch (error) {
      console.error('🐜 [ELITE-GUARDS-HOOK] Deployment failed:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to deploy Elite Guards'
      }));
      
      toast({
        title: "Elite Guards Deployment Failed",
        description: "Strategic analysis could not be completed",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Fetch existing strategic insights
  const fetchStrategicInsights = useCallback(async (analysisId: string) => {
    try {
      const { data, error } = await supabase
        .from('strategic_insights')
        .select('*')
        .eq('analysis_id', analysisId);

      if (error) throw error;

      const newState: Partial<StrategicInsightsState> = {};
      
      data?.forEach(insight => {
        switch (insight.type) {
          case 'persona':
            newState.personas = insight.data;
            break;
          case 'market_research':
            newState.marketInsights = insight.data;
            break;
          case 'goal_gap_analysis':
            newState.gapAnalysis = insight.data;
            break;
        }
      });

      setState(prev => ({ ...prev, ...newState }));
    } catch (error) {
      console.error('🐜 [ELITE-GUARDS-HOOK] Failed to fetch insights:', error);
    }
  }, []);

  return {
    ...state,
    isEnabled,
    deployEliteGuards,
    fetchStrategicInsights
  };
}
