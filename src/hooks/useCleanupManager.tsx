/**
 * ✅ PHASE 5.2: CLEANUP MANAGER HOOK
 * Comprehensive cleanup management with automatic resource disposal
 */

import { useEffect, useRef, useCallback } from 'react';
import { MemoryManagementService } from '@/services/MemoryManagementService';

interface CleanupManagerOptions {
  componentName: string;
  enabled?: boolean;
  autoCleanupIntervals?: boolean;
  autoCleanupTimeouts?: boolean;
  autoCleanupEventListeners?: boolean;
  onCleanupComplete?: () => void;
}

interface CleanupManagerResult {
  registerCleanup: (cleanup: () => void | Promise<void>) => void;
  registerEventListener: (
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => () => void;
  registerInterval: (callback: () => void, delay: number) => () => void;
  registerTimeout: (callback: () => void, delay: number) => () => void;
  registerSubscription: (unsubscribe: () => void | Promise<void>) => void;
  registerAsyncResource: (resource: AbortController | { close: () => void } | { disconnect: () => void }) => void;
  forceCleanup: () => Promise<void>;
  cleanupCount: number;
  isCleanedUp: boolean;
}

export function useCleanupManager({
  componentName,
  enabled = true,
  autoCleanupIntervals = true,
  autoCleanupTimeouts = true,
  autoCleanupEventListeners = true,
  onCleanupComplete
}: CleanupManagerOptions): CleanupManagerResult {
  const memoryService = MemoryManagementService.getInstance();
  const cleanupCallbacks = useRef<Array<() => void | Promise<void>>>([]);
  const eventListeners = useRef<Array<{
    element: EventTarget;
    event: string;
    handler: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>>([]);
  const intervals = useRef<Set<NodeJS.Timeout>>(new Set());
  const timeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  const subscriptions = useRef<Array<() => void | Promise<void>>>([]);
  const asyncResources = useRef<Array<AbortController | { close: () => void } | { disconnect: () => void }>>([]);
  const isCleanedUpRef = useRef(false);

  /**
   * ✅ PHASE 5.2: Register cleanup callback
   */
  const registerCleanup = useCallback((cleanup: () => void | Promise<void>) => {
    if (!enabled || isCleanedUpRef.current) return;
    
    cleanupCallbacks.current.push(cleanup);
  }, [enabled]);

  /**
   * ✅ PHASE 5.2: Register event listener with automatic cleanup
   */
  const registerEventListener = useCallback((
    element: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (!enabled || isCleanedUpRef.current) {
      return () => {};
    }

    // Add the event listener
    element.addEventListener(event, handler, options);

    // Store for cleanup
    const listenerInfo = { element, event, handler, options };
    eventListeners.current.push(listenerInfo);

    // Return cleanup function
    const cleanup = () => {
      element.removeEventListener(event, handler, options);
      eventListeners.current = eventListeners.current.filter(l => l !== listenerInfo);
    };

    // Register cleanup
    registerCleanup(cleanup);

    return cleanup;
  }, [enabled, registerCleanup]);

  /**
   * ✅ PHASE 5.2: Register interval with automatic cleanup
   */
  const registerInterval = useCallback((callback: () => void, delay: number) => {
    if (!enabled || isCleanedUpRef.current) {
      return () => {};
    }

    const intervalId = setInterval(callback, delay);
    intervals.current.add(intervalId);

    // Create cleanup function
    const cleanup = () => {
      clearInterval(intervalId);
      intervals.current.delete(intervalId);
    };

    // Register cleanup
    registerCleanup(cleanup);

    return cleanup;
  }, [enabled, registerCleanup]);

  /**
   * ✅ PHASE 5.2: Register timeout with automatic cleanup
   */
  const registerTimeout = useCallback((callback: () => void, delay: number) => {
    if (!enabled || isCleanedUpRef.current) {
      return () => {};
    }

    const timeoutId = setTimeout(() => {
      callback();
      timeouts.current.delete(timeoutId);
    }, delay);
    
    timeouts.current.add(timeoutId);

    // Create cleanup function
    const cleanup = () => {
      clearTimeout(timeoutId);
      timeouts.current.delete(timeoutId);
    };

    // Register cleanup
    registerCleanup(cleanup);

    return cleanup;
  }, [enabled, registerCleanup]);

  /**
   * ✅ PHASE 5.2: Register subscription with automatic cleanup
   */
  const registerSubscription = useCallback((unsubscribe: () => void | Promise<void>) => {
    if (!enabled || isCleanedUpRef.current) return;

    subscriptions.current.push(unsubscribe);
    registerCleanup(unsubscribe);
  }, [enabled, registerCleanup]);

  /**
   * ✅ PHASE 5.2: Register async resources (AbortController, WebSocket, etc.)
   */
  const registerAsyncResource = useCallback((
    resource: AbortController | { close: () => void } | { disconnect: () => void }
  ) => {
    if (!enabled || isCleanedUpRef.current) return;

    asyncResources.current.push(resource);

    const cleanup = () => {
      try {
        if ('abort' in resource) {
          resource.abort();
        } else if ('close' in resource) {
          resource.close();
        } else if ('disconnect' in resource) {
          resource.disconnect();
        }
      } catch (error) {
        console.warn('[useCleanupManager] Error cleaning up async resource:', error);
      }
    };

    registerCleanup(cleanup);
  }, [enabled, registerCleanup]);

  /**
   * ✅ PHASE 5.2: Force cleanup execution
   */
  const forceCleanup = useCallback(async () => {
    if (isCleanedUpRef.current) return;

    console.log(`[useCleanupManager] Force cleanup for: ${componentName}`);
    isCleanedUpRef.current = true;

    // Execute all cleanup callbacks
    const cleanupPromises = cleanupCallbacks.current.map(async (cleanup) => {
      try {
        await cleanup();
      } catch (error) {
        console.error(`[useCleanupManager] Cleanup error in ${componentName}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);

    // Clear arrays
    cleanupCallbacks.current = [];
    eventListeners.current = [];
    intervals.current.clear();
    timeouts.current.clear();
    subscriptions.current = [];
    asyncResources.current = [];

    if (onCleanupComplete) {
      onCleanupComplete();
    }

    console.log(`[useCleanupManager] Cleanup completed for: ${componentName}`);
  }, [componentName, onCleanupComplete]);

  /**
   * ✅ PHASE 5.2: Automatic cleanup on unmount
   */
  useEffect(() => {
    if (!enabled) return;

    // Register with memory service
    const componentId = memoryService.registerComponent(componentName);

    // Return cleanup function
    return () => {
      forceCleanup();
      memoryService.unregisterComponent(componentId);
    };
  }, [enabled, componentName, memoryService, forceCleanup]);

  /**
   * ✅ PHASE 5.2: Window beforeunload cleanup (for critical resources)
   */
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      forceCleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, forceCleanup]);

  return {
    registerCleanup,
    registerEventListener,
    registerInterval,
    registerTimeout,
    registerSubscription,
    registerAsyncResource,
    forceCleanup,
    cleanupCount: cleanupCallbacks.current.length,
    isCleanedUp: isCleanedUpRef.current
  };
}

/**
 * ✅ PHASE 5.2: Simplified cleanup hook for quick integration
 */
export function useSimpleCleanup(componentName: string): {
  registerCleanup: (cleanup: () => void) => void;
  onInterval: (callback: () => void, delay: number) => () => void;
  onTimeout: (callback: () => void, delay: number) => () => void;
} {
  const manager = useCleanupManager({
    componentName,
    enabled: true
  });

  const registerCleanup = useCallback((cleanup: () => void) => {
    manager.registerCleanup(cleanup);
  }, [manager]);

  const onInterval = useCallback((callback: () => void, delay: number) => {
    return manager.registerInterval(callback, delay);
  }, [manager]);

  const onTimeout = useCallback((callback: () => void, delay: number) => {
    return manager.registerTimeout(callback, delay);
  }, [manager]);

  return {
    registerCleanup,
    onInterval,
    onTimeout
  };
}

/**
 * ✅ PHASE 5.2: Hook for React Query or similar libraries
 */
export function useCleanupWithQueries(componentName: string): {
  registerQuery: (queryClient: any, queryKey: string[]) => void;
  registerMutation: (mutation: { reset: () => void }) => void;
  registerSubscription: (unsubscribe: () => void) => void;
} {
  const manager = useCleanupManager({
    componentName,
    enabled: true
  });

  const registerQuery = useCallback((queryClient: any, queryKey: string[]) => {
    manager.registerCleanup(() => {
      if (queryClient && queryClient.cancelQueries) {
        queryClient.cancelQueries(queryKey);
      }
    });
  }, [manager]);

  const registerMutation = useCallback((mutation: { reset: () => void }) => {
    manager.registerCleanup(() => {
      if (mutation && mutation.reset) {
        mutation.reset();
      }
    });
  }, [manager]);

  const registerSubscription = useCallback((unsubscribe: () => void) => {
    manager.registerSubscription(unsubscribe);
  }, [manager]);

  return {
    registerQuery,
    registerMutation,
    registerSubscription
  };
}