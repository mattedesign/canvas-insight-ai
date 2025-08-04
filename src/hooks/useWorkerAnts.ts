import { useState, useCallback } from 'react';
import { triggerContextDetection, checkColonyStatus } from '../services/workerAntService';
import { useToast } from './use-toast';

interface UseWorkerAntsOptions {
  onSuccess?: (eventId: string) => void;
  onError?: (error: any) => void;
}

export const useWorkerAnts = (options: UseWorkerAntsOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const { toast } = useToast();

  const deployColony = useCallback(async (
    imageUrl: string,
    imageId: string,
    userId: string
  ) => {
    setIsProcessing(true);
    
    try {
      const result = await triggerContextDetection(imageUrl, imageId, userId);
      
      if (result.success && result.eventId) {
        setEventId(result.eventId);
        toast({
          title: "🐜 Worker Ants Deployed!",
          description: "Your image is being analyzed by the colony.",
        });
        options.onSuccess?.(result.eventId);
      } else {
        throw new Error(result.error || 'Failed to deploy worker ants');
      }
    } catch (error) {
      console.error('Worker ant deployment failed:', error);
      toast({
        title: "Worker Ant Error",
        description: "Failed to analyze image. Using fallback method.",
        variant: "destructive",
      });
      options.onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [toast, options]);

  const checkStatus = useCallback(async () => {
    if (!eventId) return null;
    return await checkColonyStatus(eventId);
  }, [eventId]);

  return {
    deployColony,
    checkStatus,
    isProcessing,
    eventId
  };
};
