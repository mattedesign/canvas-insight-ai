/**
 * EMERGENCY FIX: useAnalysisRealtime with stable references
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAnalysisRealtimeOptions {
  onAnalysisUpdate?: (analysis: any) => void;
  onAnalysisStatusChange?: (imageId: string, status: 'processing' | 'completed' | 'failed') => void;
}

export const useAnalysisRealtime = (options: UseAnalysisRealtimeOptions = {}) => {
  const [state, setState] = useState({
    pendingAnalyses: new Set<string>(),
    failedAnalyses: new Map<string, string>()
  });
  
  // Use refs for stable callbacks
  const onAnalysisUpdateRef = useRef(options.onAnalysisUpdate);
  const onAnalysisStatusChangeRef = useRef(options.onAnalysisStatusChange);
  
  // Update refs without causing re-renders
  useEffect(() => {
    onAnalysisUpdateRef.current = options.onAnalysisUpdate;
    onAnalysisStatusChangeRef.current = options.onAnalysisStatusChange;
  });
  
  // Stable functions that don't cause re-renders
  const trackAnalysis = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      pendingAnalyses: new Set(prev.pendingAnalyses).add(imageId)
    }));
    onAnalysisStatusChangeRef.current?.(imageId, 'processing');
  }, []);
  
  const completeAnalysis = useCallback((imageId: string) => {
    setState(prev => {
      const newPending = new Set(prev.pendingAnalyses);
      newPending.delete(imageId);
      const newFailed = new Map(prev.failedAnalyses);
      newFailed.delete(imageId);
      return {
        pendingAnalyses: newPending,
        failedAnalyses: newFailed
      };
    });
  }, []);
  
  const failAnalysis = useCallback((imageId: string, error: string) => {
    setState(prev => {
      const newPending = new Set(prev.pendingAnalyses);
      newPending.delete(imageId);
      const newFailed = new Map(prev.failedAnalyses);
      newFailed.set(imageId, error);
      return {
        pendingAnalyses: newPending,
        failedAnalyses: newFailed
      };
    });
    onAnalysisStatusChangeRef.current?.(imageId, 'failed');
  }, []);
  
  // Set up realtime subscription with stable effect
  useEffect(() => {
    let channel: any = null;
    let mounted = true;
    
    const setupSubscription = async () => {
      try {
        channel = supabase
          .channel('ux-analyses-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ux_analyses'
            },
            (payload) => {
              if (!mounted) return;
              
              console.log('New analysis received:', payload.new);
              const analysis = payload.new;
              
              // Update state
              completeAnalysis(analysis.image_id);
              onAnalysisStatusChangeRef.current?.(analysis.image_id, 'completed');
              onAnalysisUpdateRef.current?.(analysis);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'ux_analyses'
            },
            (payload) => {
              if (!mounted) return;
              
              console.log('Analysis updated:', payload.new);
              onAnalysisUpdateRef.current?.(payload.new);
            }
          );
        
        await channel.subscribe();
        console.log('Subscribed to analysis updates');
      } catch (error) {
        console.error('Failed to setup realtime subscription:', error);
      }
    };
    
    setupSubscription();
    
    // Cleanup
    return () => {
      mounted = false;
      if (channel) {
        console.log('Unsubscribing from analysis updates');
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty dependency array - setup once
  
  return {
    pendingAnalyses: state.pendingAnalyses,
    failedAnalyses: state.failedAnalyses,
    trackAnalysis,
    completeAnalysis,
    failAnalysis,
    isAnalyzing: (imageId: string) => state.pendingAnalyses.has(imageId),
    getError: (imageId: string) => state.failedAnalyses.get(imageId)
  };
};