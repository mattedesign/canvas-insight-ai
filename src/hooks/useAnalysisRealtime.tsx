import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UXAnalysis } from '@/types/ux-analysis';
import { useFilteredToast } from '@/hooks/use-filtered-toast';

interface AnalysisRealtimeState {
  isConnected: boolean;
  pendingAnalyses: Set<string>;
  failedAnalyses: Map<string, number>; // imageId -> retry count
}

interface UseAnalysisRealtimeProps {
  onAnalysisUpdate: (analysis: UXAnalysis) => void;
  onAnalysisError: (imageId: string, error: string) => void;
  onAnalysisStatusChange: (imageId: string, status: UXAnalysis['status']) => void;
}

export const useAnalysisRealtime = ({
  onAnalysisUpdate,
  onAnalysisError,
  onAnalysisStatusChange
}: UseAnalysisRealtimeProps) => {
  const [state, setState] = useState<AnalysisRealtimeState>({
    isConnected: false,
    pendingAnalyses: new Set(),
    failedAnalyses: new Map()
  });

  const { toast } = useFilteredToast();

  // PHASE 1.3 FIX: Use refs for stable function references
  const onAnalysisUpdateRef = useRef(onAnalysisUpdate);
  const onAnalysisErrorRef = useRef(onAnalysisError);
  const onAnalysisStatusChangeRef = useRef(onAnalysisStatusChange);
  const toastRef = useRef(toast);

  // Update refs when callbacks change but don't trigger re-subscription
  onAnalysisUpdateRef.current = onAnalysisUpdate;
  onAnalysisErrorRef.current = onAnalysisError;
  onAnalysisStatusChangeRef.current = onAnalysisStatusChange;
  toastRef.current = toast;

  // Retry failed analysis with exponential backoff (FIXED: stable callback)
  const retryAnalysis = useCallback(async (imageId: string) => {
    setState(prev => {
      const retryCount = prev.failedAnalyses.get(imageId) || 0;
      if (retryCount >= 3) {
        toastRef.current({
          title: "Analysis failed",
          description: "Maximum retry attempts reached. Please try again later.",
          category: "error",
          variant: "destructive"
        });
        return prev;
      }

      return {
        ...prev,
        failedAnalyses: new Map(prev.failedAnalyses.set(imageId, retryCount + 1)),
        pendingAnalyses: new Set(prev.pendingAnalyses.add(imageId))
      };
    });

    onAnalysisStatusChangeRef.current(imageId, 'processing');

    try {
      // Get image data for retry
      const { data: imageData, error } = await supabase
        .from('images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (error) throw error;

      const publicUrl = supabase.storage
        .from('images')
        .getPublicUrl(imageData.storage_path).data.publicUrl;

      // Retry analysis via edge function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ux-analysis', {
        body: {
          type: 'ANALYZE_IMAGE',
          payload: {
            imageId,
            imageUrl: publicUrl,
            imageName: imageData.original_name,
            userContext: ''
          }
        }
      });

      if (analysisError) throw analysisError;

      if (analysisData.success) {
        setState(prev => ({
          ...prev,
          pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== imageId)),
          failedAnalyses: new Map([...prev.failedAnalyses].filter(([id]) => id !== imageId))
        }));
        onAnalysisUpdateRef.current(analysisData.data);
      } else {
        throw new Error('Analysis processing failed');
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      setState(prev => ({
        ...prev,
        pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== imageId))
      }));
      onAnalysisStatusChangeRef.current(imageId, 'error');
      onAnalysisErrorRef.current(imageId, error instanceof Error ? error.message : 'Unknown error');
    }
  }, []); // FIXED: Empty dependency array

  // Track analysis progress (FIXED: stable callback)
  const trackAnalysis = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      pendingAnalyses: new Set(prev.pendingAnalyses.add(imageId))
    }));
    onAnalysisStatusChangeRef.current(imageId, 'processing');
  }, []); // FIXED: Empty dependency array

  // Remove analysis from tracking (FIXED: stable callback)
  const completeAnalysis = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== imageId)),
      failedAnalyses: new Map([...prev.failedAnalyses].filter(([id]) => id !== imageId))
    }));
  }, []); // FIXED: Empty dependency array

  // PHASE 1.3 FIX: Set up real-time subscription with NO function dependencies
  useEffect(() => {
    let channel: any = null;
    let isSubscribed = true;

    const setupRealtimeSubscription = () => {
      // Prevent multiple subscriptions
      if (channel) {
        supabase.removeChannel(channel);
      }

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
            if (!isSubscribed) return; // Prevent processing after cleanup
            
            console.log('New analysis created:', payload.new);
            const newAnalysis = payload.new as any;
            
            // Convert database format to frontend format
            const analysis: UXAnalysis = {
              id: newAnalysis.id,
              imageId: newAnalysis.image_id,
              imageName: '', // Will be populated from image data
              imageUrl: '', // Will be populated from image data
              userContext: newAnalysis.user_context || '',
              visualAnnotations: newAnalysis.visual_annotations || [],
              suggestions: newAnalysis.suggestions || [],
              summary: newAnalysis.summary || {},
              metadata: newAnalysis.metadata || {},
              createdAt: new Date(newAnalysis.created_at),
              status: newAnalysis.status || 'completed'
            };

            // Use ref to avoid dependency cycles
            setState(prev => ({
              ...prev,
              pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== newAnalysis.image_id)),
              failedAnalyses: new Map([...prev.failedAnalyses].filter(([id]) => id !== newAnalysis.image_id))
            }));
            onAnalysisUpdateRef.current(analysis);
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
            if (!isSubscribed) return; // Prevent processing after cleanup
            
            console.log('Analysis updated:', payload.new);
            const updatedAnalysis = payload.new as any;
            
            const analysis: UXAnalysis = {
              id: updatedAnalysis.id,
              imageId: updatedAnalysis.image_id,
              imageName: '',
              imageUrl: '',
              userContext: updatedAnalysis.user_context || '',
              visualAnnotations: updatedAnalysis.visual_annotations || [],
              suggestions: updatedAnalysis.suggestions || [],
              summary: updatedAnalysis.summary || {},
              metadata: updatedAnalysis.metadata || {},
              createdAt: new Date(updatedAnalysis.created_at),
              status: updatedAnalysis.status || 'completed'
            };

            if (analysis.status === 'completed') {
              setState(prev => ({
                ...prev,
                pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== updatedAnalysis.image_id)),
                failedAnalyses: new Map([...prev.failedAnalyses].filter(([id]) => id !== updatedAnalysis.image_id))
              }));
            }
            
            // Use refs to avoid dependency cycles
            onAnalysisStatusChangeRef.current(updatedAnalysis.image_id, analysis.status || 'completed');
            onAnalysisUpdateRef.current(analysis);
          }
        )
        .subscribe((status) => {
          if (!isSubscribed) return; // Prevent logging after cleanup
          
          // Only log status changes, not continuous CLOSED statuses
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
            console.log('Realtime subscription status:', status);
          }
          
          setState(prev => ({
            ...prev,
            isConnected: status === 'SUBSCRIBED'
          }));
        });
    };

    setupRealtimeSubscription();

    return () => {
      isSubscribed = false; // Mark as unsubscribed first
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []); // PHASE 1.3 CRITICAL FIX: EMPTY dependencies array prevents re-subscription loops

  return {
    ...state,
    trackAnalysis,
    completeAnalysis,
    retryAnalysis
  };
};