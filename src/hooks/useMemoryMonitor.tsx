/**
 * ✅ PHASE 5.2: MEMORY MONITOR HOOK
 * Component-level memory tracking and leak detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MemoryManagementService } from '@/services/MemoryManagementService';

interface MemoryMonitorOptions {
  componentName: string;
  enabled?: boolean;
  trackResources?: boolean;
  alertThresholdMB?: number;
  onMemoryAlert?: (memoryUsage: number) => void;
  onLeakDetected?: (leak: any) => void;
}

interface MemoryMonitorResult {
  componentId: string;
  memoryUsage: number;
  memoryGrowth: number;
  isLeakSuspected: boolean;
  resourceCounts: {
    eventListeners: number;
    intervals: number;
    timeouts: number;
    subscriptions: number;
  };
  trackResource: (type: 'eventListeners' | 'intervals' | 'timeouts' | 'subscriptions', delta?: number) => void;
  registerCleanup: (cleanup: () => void | Promise<void>) => void;
  forceCleanup: () => Promise<void>;
}

export function useMemoryMonitor({
  componentName,
  enabled = true,
  trackResources = true,
  alertThresholdMB = 50,
  onMemoryAlert,
  onLeakDetected
}: MemoryMonitorOptions): MemoryMonitorResult {
  const memoryService = MemoryManagementService.getInstance();
  const componentIdRef = useRef<string | null>(null);
  const initialMemoryRef = useRef<number>(0);
  const cleanupCallbacksRef = useRef<Array<() => void | Promise<void>>>([]);
  
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [memoryGrowth, setMemoryGrowth] = useState(0);
  const [isLeakSuspected, setIsLeakSuspected] = useState(false);
  const [resourceCounts, setResourceCounts] = useState({
    eventListeners: 0,
    intervals: 0,
    timeouts: 0,
    subscriptions: 0
  });

  /**
   * ✅ PHASE 5.2: Track resource usage
   */
  const trackResource = useCallback((
    type: 'eventListeners' | 'intervals' | 'timeouts' | 'subscriptions',
    delta: number = 1
  ) => {
    if (!enabled || !componentIdRef.current || !trackResources) return;

    // Update local state
    setResourceCounts(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta)
    }));

    // Track in memory service
    memoryService.trackResource(componentIdRef.current, type, delta);
  }, [enabled, trackResources, memoryService]);

  /**
   * ✅ PHASE 5.2: Register cleanup callback
   */
  const registerCleanup = useCallback((cleanup: () => void | Promise<void>) => {
    if (!enabled || !componentIdRef.current) return;

    cleanupCallbacksRef.current.push(cleanup);
    memoryService.registerCleanup(componentIdRef.current, cleanup);
  }, [enabled, memoryService]);

  /**
   * ✅ PHASE 5.2: Force cleanup execution
   */
  const forceCleanup = useCallback(async () => {
    const cleanupPromises = cleanupCallbacksRef.current.map(async (cleanup) => {
      try {
        await cleanup();
      } catch (error) {
        console.error('[useMemoryMonitor] Cleanup error:', error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    cleanupCallbacksRef.current = [];
  }, []);

  /**
   * ✅ PHASE 5.2: Update memory usage periodically
   */
  useEffect(() => {
    if (!enabled) return;

    const updateMemoryUsage = () => {
      if (typeof (performance as any).memory !== 'undefined') {
        const currentMemory = (performance as any).memory.usedJSHeapSize;
        const growth = currentMemory - initialMemoryRef.current;
        const growthMB = growth / (1024 * 1024);

        setMemoryUsage(currentMemory);
        setMemoryGrowth(growth);

        // Check for memory alert threshold
        if (growthMB > alertThresholdMB && onMemoryAlert) {
          onMemoryAlert(currentMemory);
        }
      }
    };

    updateMemoryUsage(); // Initial update
    const interval = setInterval(updateMemoryUsage, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [enabled, alertThresholdMB, onMemoryAlert]);

  /**
   * ✅ PHASE 5.2: Listen for leak detection
   */
  useEffect(() => {
    if (!enabled || !onLeakDetected) return;

    const unsubscribe = memoryService.addLeakListener((leak) => {
      if (leak.componentName === componentName) {
        setIsLeakSuspected(true);
        onLeakDetected(leak);
      }
    });

    return unsubscribe;
  }, [enabled, componentName, onLeakDetected, memoryService]);

  /**
   * ✅ PHASE 5.2: Component registration and cleanup
   */
  useEffect(() => {
    if (!enabled) return;

    // Register component
    componentIdRef.current = memoryService.registerComponent(componentName);
    
    // Store initial memory
    if (typeof (performance as any).memory !== 'undefined') {
      initialMemoryRef.current = (performance as any).memory.usedJSHeapSize;
    }

    console.log(`[useMemoryMonitor] Monitoring started for: ${componentName}`);

    // Cleanup on unmount
    return () => {
      if (componentIdRef.current) {
        memoryService.unregisterComponent(componentIdRef.current);
        console.log(`[useMemoryMonitor] Monitoring stopped for: ${componentName}`);
      }
    };
  }, [enabled, componentName, memoryService]);

  return {
    componentId: componentIdRef.current || '',
    memoryUsage,
    memoryGrowth,
    isLeakSuspected,
    resourceCounts,
    trackResource,
    registerCleanup,
    forceCleanup
  };
}

/**
 * ✅ PHASE 5.2: Simplified memory monitor for quick integration
 */
export function useSimpleMemoryMonitor(componentName: string): {
  memoryUsage: number;
  memoryGrowthMB: number;
  registerCleanup: (cleanup: () => void) => void;
} {
  const monitor = useMemoryMonitor({
    componentName,
    enabled: process.env.NODE_ENV === 'development',
    trackResources: false
  });

  const registerCleanup = useCallback((cleanup: () => void) => {
    monitor.registerCleanup(cleanup);
  }, [monitor]);

  return {
    memoryUsage: monitor.memoryUsage,
    memoryGrowthMB: monitor.memoryGrowth / (1024 * 1024),
    registerCleanup
  };
}

/**
 * ✅ PHASE 5.2: Memory monitor with automatic resource tracking
 */
export function useMemoryMonitorWithAutoTracking(
  componentName: string,
  options?: Partial<MemoryMonitorOptions>
): MemoryMonitorResult & {
  trackEventListener: (add: boolean) => void;
  trackInterval: (intervalId?: NodeJS.Timeout) => () => void;
  trackTimeout: (timeoutId?: NodeJS.Timeout) => () => void;
  trackSubscription: (unsubscribe: () => void) => void;
} {
  const monitor = useMemoryMonitor({
    componentName,
    trackResources: true,
    ...options
  });

  const intervalIds = useRef<Set<NodeJS.Timeout>>(new Set());
  const timeoutIds = useRef<Set<NodeJS.Timeout>>(new Set());
  const subscriptions = useRef<Set<() => void>>(new Set());

  /**
   * ✅ PHASE 5.2: Track event listeners automatically
   */
  const trackEventListener = useCallback((add: boolean) => {
    monitor.trackResource('eventListeners', add ? 1 : -1);
  }, [monitor]);

  /**
   * ✅ PHASE 5.2: Track intervals with automatic cleanup
   */
  const trackInterval = useCallback((intervalId?: NodeJS.Timeout) => {
    monitor.trackResource('intervals', 1);
    
    if (intervalId) {
      intervalIds.current.add(intervalId);
    }

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalIds.current.delete(intervalId);
      }
      monitor.trackResource('intervals', -1);
    };
  }, [monitor]);

  /**
   * ✅ PHASE 5.2: Track timeouts with automatic cleanup
   */
  const trackTimeout = useCallback((timeoutId?: NodeJS.Timeout) => {
    monitor.trackResource('timeouts', 1);
    
    if (timeoutId) {
      timeoutIds.current.add(timeoutId);
    }

    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete(timeoutId);
      }
      monitor.trackResource('timeouts', -1);
    };
  }, [monitor]);

  /**
   * ✅ PHASE 5.2: Track subscriptions with automatic cleanup
   */
  const trackSubscription = useCallback((unsubscribe: () => void) => {
    monitor.trackResource('subscriptions', 1);
    subscriptions.current.add(unsubscribe);
    
    // Register cleanup
    monitor.registerCleanup(() => {
      unsubscribe();
      subscriptions.current.delete(unsubscribe);
      monitor.trackResource('subscriptions', -1);
    });
  }, [monitor]);

  /**
   * ✅ PHASE 5.2: Cleanup all tracked resources on unmount
   */
  useEffect(() => {
    return () => {
      // Clear all intervals
      intervalIds.current.forEach(id => clearInterval(id));
      intervalIds.current.clear();

      // Clear all timeouts
      timeoutIds.current.forEach(id => clearTimeout(id));
      timeoutIds.current.clear();

      // Call all subscriptions
      subscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[useMemoryMonitorWithAutoTracking] Subscription cleanup error:', error);
        }
      });
      subscriptions.current.clear();
    };
  }, []);

  return {
    ...monitor,
    trackEventListener,
    trackInterval,
    trackTimeout,
    trackSubscription
  };
}