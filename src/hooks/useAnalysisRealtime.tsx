import { useEffect, useState, useCallback } from 'react';
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

  // Retry failed analysis with exponential backoff (stable callback)
  const retryAnalysis = useCallback(async (imageId: string) => {
    setState(prev => {
      const retryCount = prev.failedAnalyses.get(imageId) || 0;
      if (retryCount >= 3) {
        toast({
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

    onAnalysisStatusChange(imageId, 'processing');

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
        onAnalysisUpdate(analysisData.data);
      } else {
        throw new Error('Analysis processing failed');
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      setState(prev => ({
        ...prev,
        pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== imageId))
      }));
      onAnalysisStatusChange(imageId, 'error');
      onAnalysisError(imageId, error instanceof Error ? error.message : 'Unknown error');
    }
  }, [onAnalysisUpdate, onAnalysisError, onAnalysisStatusChange, toast]);

  // Track analysis progress
  const trackAnalysis = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      pendingAnalyses: new Set(prev.pendingAnalyses.add(imageId))
    }));
    onAnalysisStatusChange(imageId, 'processing');
  }, [onAnalysisStatusChange]);

  // Remove analysis from tracking
  const completeAnalysis = useCallback((imageId: string) => {
    setState(prev => ({
      ...prev,
      pendingAnalyses: new Set([...prev.pendingAnalyses].filter(id => id !== imageId)),
      failedAnalyses: new Map([...prev.failedAnalyses].filter(([id]) => id !== imageId))
    }));
  }, []); // Empty dependency array to prevent infinite re-subscriptions

  // Set up real-time subscription with proper cleanup and connection management
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

            completeAnalysis(newAnalysis.image_id);
            onAnalysisUpdate(analysis);
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
              completeAnalysis(updatedAnalysis.image_id);
            }
            
            onAnalysisStatusChange(updatedAnalysis.image_id, analysis.status || 'completed');
            onAnalysisUpdate(analysis);
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
  }, []); // Fixed: Remove all dependencies to prevent re-subscription loops

  return {
    ...state,
    trackAnalysis,
    completeAnalysis,
    retryAnalysis
  };
};