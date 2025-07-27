import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ProgressiveAnalysisItem {
  id: string;
  imageId: string;
  imageUrl: string;
  imageName: string;
  userContext?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  startTime?: number;
  duration?: number;
}

interface ProgressiveLoadingOptions {
  batchSize?: number;
  concurrentLimit?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export const useProgressiveAnalysis = (options: ProgressiveLoadingOptions = {}) => {
  const {
    batchSize = 3,
    concurrentLimit = 2,
    retryAttempts = 2,
    retryDelay = 1000
  } = options;

  const [queue, setQueue] = useState<ProgressiveAnalysisItem[]>([]);
  const [activeAnalyses, setActiveAnalyses] = useState<ProgressiveAnalysisItem[]>([]);
  const [completedAnalyses, setCompletedAnalyses] = useState<ProgressiveAnalysisItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  
  const { toast } = useToast();
  const abortController = useRef<AbortController | null>(null);
  const retryCounters = useRef<Map<string, number>>(new Map());

  const addToQueue = useCallback((items: Omit<ProgressiveAnalysisItem, 'status'>[]) => {
    const queueItems: ProgressiveAnalysisItem[] = items.map(item => ({
      ...item,
      status: 'pending'
    }));
    
    setQueue(prev => [...prev, ...queueItems]);
    
    toast({
      title: "Analysis Queue Updated",
      description: `Added ${items.length} images to analysis queue`,
    });
  }, [toast]);

  const processAnalysis = useCallback(async (item: ProgressiveAnalysisItem) => {
    const startTime = performance.now();
    
    try {
      // Update status to processing
      setActiveAnalyses(prev => 
        prev.map(a => a.id === item.id ? { ...a, status: 'processing', startTime } : a)
      );

      // Simulate AI analysis call - replace with actual AI service
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: item.imageId,
          imageUrl: item.imageUrl,
          imageName: item.imageName,
          userContext: item.userContext
        }),
        signal: abortController.current?.signal
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      const duration = performance.now() - startTime;

      // Move to completed
      const completedItem: ProgressiveAnalysisItem = {
        ...item,
        status: 'completed',
        result,
        duration: Math.round(duration)
      };

      setActiveAnalyses(prev => prev.filter(a => a.id !== item.id));
      setCompletedAnalyses(prev => [...prev, completedItem]);

      return completedItem;

    } catch (error) {
      const duration = performance.now() - startTime;
      const currentRetries = retryCounters.current.get(item.id) || 0;
      
      if (currentRetries < retryAttempts && !abortController.current?.signal.aborted) {
        // Retry logic
        retryCounters.current.set(item.id, currentRetries + 1);
        
        toast({
          title: "Retrying Analysis",
          description: `Attempt ${currentRetries + 2}/${retryAttempts + 1} for ${item.imageName}`,
          variant: "default"
        });

        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (currentRetries + 1)));
        
        // Add back to queue for retry
        setQueue(prev => [...prev, { ...item, status: 'pending' }]);
        setActiveAnalyses(prev => prev.filter(a => a.id !== item.id));
        
      } else {
        // Max retries reached or aborted
        const errorItem: ProgressiveAnalysisItem = {
          ...item,
          status: 'error',
          error: error instanceof Error ? error.message : 'Analysis failed',
          duration: Math.round(duration)
        };

        setActiveAnalyses(prev => prev.filter(a => a.id !== item.id));
        setCompletedAnalyses(prev => [...prev, errorItem]);
        
        retryCounters.current.delete(item.id);
      }
    }
  }, [retryAttempts, retryDelay, toast]);

  const processBatch = useCallback(async () => {
    if (queue.length === 0 || activeAnalyses.length >= concurrentLimit) {
      return;
    }

    const batch = queue.slice(0, Math.min(batchSize, concurrentLimit - activeAnalyses.length));
    
    setQueue(prev => prev.slice(batch.length));
    setActiveAnalyses(prev => [...prev, ...batch]);
    setCurrentBatch(prev => prev + 1);

    toast({
      title: `Processing Batch ${currentBatch + 1}`,
      description: `Analyzing ${batch.length} images concurrently...`,
    });

    // Process batch items concurrently
    const promises = batch.map(item => processAnalysis(item));
    await Promise.allSettled(promises);

  }, [queue, activeAnalyses, batchSize, concurrentLimit, currentBatch, processAnalysis, toast]);

  const startProcessing = useCallback(() => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    abortController.current = new AbortController();
    
    toast({
      title: "Progressive Analysis Started",
      description: `Processing ${queue.length + activeAnalyses.length} images in batches of ${batchSize}`,
    });
  }, [isProcessing, queue.length, activeAnalyses.length, batchSize, toast]);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    abortController.current?.abort();
    
    // Move active analyses back to queue
    setQueue(prev => [...prev, ...activeAnalyses.map(a => ({ ...a, status: 'pending' as const }))]);
    setActiveAnalyses([]);
    
    toast({
      title: "Analysis Stopped",
      description: "Progressive analysis has been stopped. Items moved back to queue.",
      variant: "destructive"
    });
  }, [activeAnalyses, toast]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setActiveAnalyses([]);
    setCompletedAnalyses([]);
    setCurrentBatch(0);
    retryCounters.current.clear();
    setIsProcessing(false);
    abortController.current?.abort();
  }, []);

  const getProgress = useCallback(() => {
    const total = queue.length + activeAnalyses.length + completedAnalyses.length;
    const completed = completedAnalyses.length;
    const processing = activeAnalyses.length;
    const pending = queue.length;
    const errors = completedAnalyses.filter(a => a.status === 'error').length;
    const successful = completedAnalyses.filter(a => a.status === 'completed').length;
    
    return {
      total,
      completed,
      processing,
      pending,
      errors,
      successful,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDuration: successful > 0 
        ? Math.round(completedAnalyses
            .filter(a => a.status === 'completed' && a.duration)
            .reduce((sum, a) => sum + (a.duration || 0), 0) / successful)
        : 0
    };
  }, [queue.length, activeAnalyses.length, completedAnalyses]);

  // Auto-process batches when queue is updated and processing is active
  useEffect(() => {
    if (isProcessing && queue.length > 0 && activeAnalyses.length < concurrentLimit) {
      const timeoutId = setTimeout(processBatch, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isProcessing, queue.length, activeAnalyses.length, concurrentLimit, processBatch]);

  // Auto-stop when everything is complete
  useEffect(() => {
    if (isProcessing && queue.length === 0 && activeAnalyses.length === 0) {
      setIsProcessing(false);
      
      const progress = getProgress();
      toast({
        title: "Analysis Complete",
        description: `Processed ${progress.successful} images successfully, ${progress.errors} errors`,
        variant: progress.errors > 0 ? "destructive" : "default"
      });
    }
  }, [isProcessing, queue.length, activeAnalyses.length, getProgress, toast]);

  return {
    // State
    queue,
    activeAnalyses,
    completedAnalyses,
    isProcessing,
    
    // Actions
    addToQueue,
    startProcessing,
    stopProcessing,
    clearQueue,
    
    // Utilities
    getProgress,
    currentBatch,
    
    // Configuration
    batchSize,
    concurrentLimit,
    retryAttempts
  };
};