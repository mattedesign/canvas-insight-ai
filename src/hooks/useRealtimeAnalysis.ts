import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeUpdate {
  stage: string;
  progress: number;
  message?: string;
  data?: any;
}

export function useRealtimeAnalysis(analysisId: string) {
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!analysisId) return;

    const channel = supabase
      .channel(`analysis:${analysisId}`)
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        setProgress(payload.progress);
        setCurrentStage(payload.stage);
        setUpdates(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'stage_complete' }, ({ payload }) => {
        setUpdates(prev => [...prev, {
          stage: payload.stage,
          progress: 100,
          message: `${payload.stage} completed`,
          data: payload.data
        }]);
      })
      .on('broadcast', { event: 'error' }, ({ payload }) => {
        console.error('Analysis error:', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [analysisId]);

  return {
    updates,
    currentStage,
    progress,
    isConnected: true // You can add connection state management
  };
}