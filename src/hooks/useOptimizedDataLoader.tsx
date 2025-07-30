import { useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

/**
 * ✅ PHASE 1 & 3: Optimized data loader with debouncing and deduplication
 */
export const useOptimizedDataLoader = () => {
  const { debounce } = useDebounce();
  const activeLoadsRef = useRef<Map<string, Promise<any>>>(new Map());

  const loadWithDeduplication = useCallback(async (
    key: string,
    loadFunction: () => Promise<any>,
    debounceMs: number = 300
  ) => {
    // Check if this exact load is already in progress
    if (activeLoadsRef.current.has(key)) {
      console.log(`[OptimizedDataLoader] Deduplicating load for key: ${key}`);
      return activeLoadsRef.current.get(key);
    }

    const loadPromise = new Promise(async (resolve, reject) => {
      const debouncedLoad = debounce(async () => {
        try {
          console.log(`[OptimizedDataLoader] Starting load for key: ${key}`);
          const result = await loadFunction();
          console.log(`[OptimizedDataLoader] Completed load for key: ${key}`);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          activeLoadsRef.current.delete(key);
        }
      }, debounceMs);

      debouncedLoad();
    });

    activeLoadsRef.current.set(key, loadPromise);
    return loadPromise;
  }, [debounce]);

  const clearActiveLoads = useCallback(() => {
    activeLoadsRef.current.clear();
  }, []);

  return {
    loadWithDeduplication,
    clearActiveLoads,
    hasActiveLoad: (key: string) => activeLoadsRef.current.has(key)
  };
};