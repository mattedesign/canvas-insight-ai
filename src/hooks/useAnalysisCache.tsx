import { useState, useCallback, useMemo } from 'react';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  model: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalEntries: number;
  hitRate: number;
}

export const useAnalysisCache = (maxAge = 5 * 60 * 1000) => { // 5 minutes default
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [stats, setStats] = useState<CacheStats>({ hits: 0, misses: 0, totalEntries: 0, hitRate: 0 });

  const generateCacheKey = useCallback((
    imageId: string, 
    model: string, 
    userContext?: string
  ) => {
    const contextHash = userContext ? btoa(userContext).slice(0, 8) : 'none';
    return `${imageId}-${model}-${contextHash}`;
  }, []);

  const get = useCallback((imageId: string, model: string, userContext?: string) => {
    const key = generateCacheKey(imageId, model, userContext);
    const entry = cache.get(key);
    
    if (!entry) {
      setStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
        hitRate: prev.hits / (prev.hits + prev.misses + 1)
      }));
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > maxAge;
    if (isExpired) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
      
      setStats(prev => ({
        ...prev,
        misses: prev.misses + 1,
        totalEntries: prev.totalEntries - 1,
        hitRate: prev.hits / (prev.hits + prev.misses + 1)
      }));
      return null;
    }

    setStats(prev => ({
      ...prev,
      hits: prev.hits + 1,
      hitRate: (prev.hits + 1) / (prev.hits + prev.misses + 1)
    }));
    return entry.data;
  }, [cache, generateCacheKey, maxAge]);

  const set = useCallback((
    imageId: string, 
    model: string, 
    data: any, 
    userContext?: string
  ) => {
    const key = generateCacheKey(imageId, model, userContext);
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      model
    };

    setCache(prev => {
      const newCache = new Map(prev);
      const isNewEntry = !newCache.has(key);
      newCache.set(key, entry);
      
      if (isNewEntry) {
        setStats(prevStats => ({
          ...prevStats,
          totalEntries: prevStats.totalEntries + 1
        }));
      }
      
      return newCache;
    });
  }, [generateCacheKey]);

  const clear = useCallback(() => {
    setCache(new Map());
    setStats({ hits: 0, misses: 0, totalEntries: 0, hitRate: 0 });
  }, []);

  const cleanup = useCallback(() => {
    const now = Date.now();
    let removedCount = 0;
    
    setCache(prev => {
      const newCache = new Map();
      prev.forEach((entry, key) => {
        if (now - entry.timestamp <= maxAge) {
          newCache.set(key, entry);
        } else {
          removedCount++;
        }
      });
      return newCache;
    });

    if (removedCount > 0) {
      setStats(prev => ({
        ...prev,
        totalEntries: prev.totalEntries - removedCount
      }));
    }

    return removedCount;
  }, [maxAge]);

  const cacheInfo = useMemo(() => ({
    size: cache.size,
    keys: Array.from(cache.keys()),
    stats,
    memoryUsage: JSON.stringify(Array.from(cache.values())).length
  }), [cache, stats]);

  return {
    get,
    set,
    clear,
    cleanup,
    cacheInfo,
    stats
  };
};