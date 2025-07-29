/**
 * Enhanced Offline Cache Manager
 * Provides intelligent caching with compression and selective sync
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFilteredToast } from './use-filtered-toast';
import type { UploadedImage, UXAnalysis, ImageGroup } from '@/types/ux-analysis';

interface CacheEntry {
  data: string; // Always stored as compressed string
  timestamp: number;
  version: number;
  size: number;
  priority: 'low' | 'medium' | 'high';
  lastAccessed: number;
  syncStatus: 'synced' | 'pending' | 'failed';
}

interface CacheConfig {
  maxSize: number; // Max cache size in bytes
  maxAge: number; // Max age in milliseconds
  compressionThreshold: number; // Compress items larger than this
  syncBatchSize: number; // Number of items to sync at once
}

interface CacheStats {
  totalSize: number;
  totalItems: number;
  hitRate: number;
  compressionRatio: number;
  pendingSyncItems: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  compressionThreshold: 10 * 1024, // 10KB
  syncBatchSize: 10
};

export const useOfflineCache = (config: Partial<CacheConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { toast } = useFilteredToast();
  
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [stats, setStats] = useState<CacheStats>({
    totalSize: 0,
    totalItems: 0,
    hitRate: 0,
    compressionRatio: 0,
    pendingSyncItems: 0
  });
  
  const hitCount = useRef(0);
  const missCount = useRef(0);
  const syncQueue = useRef<Set<string>>(new Set());

  // Compress large data using simple string compression
  const compress = useCallback((data: any): string => {
    const jsonString = JSON.stringify(data);
    if (jsonString.length < finalConfig.compressionThreshold) {
      return jsonString;
    }
    
    // Simple run-length encoding for JSON strings
    let compressed = '';
    let current = jsonString[0];
    let count = 1;
    
    for (let i = 1; i < jsonString.length; i++) {
      if (jsonString[i] === current && count < 255) {
        count++;
      } else {
        compressed += count > 1 ? `${count}${current}` : current;
        current = jsonString[i];
        count = 1;
      }
    }
    compressed += count > 1 ? `${count}${current}` : current;
    
    return compressed;
  }, [finalConfig.compressionThreshold]);

  // Decompress data
  const decompress = useCallback((compressed: string): any => {
    if (!compressed.includes(/\d/.source)) {
      // Not compressed, parse directly
      return JSON.parse(compressed);
    }
    
    // Simple run-length decoding
    let decompressed = '';
    let i = 0;
    
    while (i < compressed.length) {
      if (/\d/.test(compressed[i])) {
        let count = '';
        while (i < compressed.length && /\d/.test(compressed[i])) {
          count += compressed[i];
          i++;
        }
        const char = compressed[i];
        decompressed += char.repeat(parseInt(count));
        i++;
      } else {
        decompressed += compressed[i];
        i++;
      }
    }
    
    return JSON.parse(decompressed);
  }, []);

  // Calculate size of data
  const calculateSize = useCallback((data: any): number => {
    return new Blob([JSON.stringify(data)]).size;
  }, []);

  // Evict old or low-priority items
  const evictItems = useCallback(() => {
    const sortedEntries = Array.from(cache.entries())
      .sort((a, b) => {
        // Sort by priority (low first), then by last accessed time
        const priorityWeight = { low: 1, medium: 2, high: 3 };
        const aPriority = priorityWeight[a[1].priority];
        const bPriority = priorityWeight[b[1].priority];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return a[1].lastAccessed - b[1].lastAccessed;
      });

    let evictedSize = 0;
    const toEvict: string[] = [];
    
    // Evict items until we're under the size limit
    for (const [key, entry] of sortedEntries) {
      if (stats.totalSize - evictedSize <= finalConfig.maxSize * 0.8) {
        break; // Keep some headroom
      }
      
      evictedSize += entry.size;
      toEvict.push(key);
    }
    
    if (toEvict.length > 0) {
      setCache(prev => {
        const newCache = new Map(prev);
        toEvict.forEach(key => newCache.delete(key));
        return newCache;
      });
      
      console.log(`[OfflineCache] Evicted ${toEvict.length} items, freed ${evictedSize} bytes`);
    }
  }, [cache, stats.totalSize, finalConfig.maxSize]);

  // Set cache entry
  const set = useCallback((
    key: string, 
    data: any, 
    priority: 'low' | 'medium' | 'high' = 'medium',
    syncStatus: 'synced' | 'pending' | 'failed' = 'synced'
  ) => {
    const compressedData = compress(data);
    const size = calculateSize(compressedData);
    
    const entry: CacheEntry = {
      data: compressedData,
      timestamp: Date.now(),
      version: 1,
      size,
      priority,
      lastAccessed: Date.now(),
      syncStatus
    };

    setCache(prev => {
      const newCache = new Map(prev);
      
      // Remove old entry if exists
      const oldEntry = newCache.get(key);
      if (oldEntry) {
        stats.totalSize -= oldEntry.size;
      }
      
      newCache.set(key, entry);
      return newCache;
    });

    // Add to sync queue if needed
    if (syncStatus === 'pending') {
      syncQueue.current.add(key);
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      totalSize: prev.totalSize + size - (cache.get(key)?.size || 0),
      totalItems: prev.totalItems + (cache.has(key) ? 0 : 1),
      pendingSyncItems: syncQueue.current.size
    }));

    // Check if eviction is needed
    if (stats.totalSize > finalConfig.maxSize) {
      setTimeout(evictItems, 0); // Async eviction
    }
  }, [compress, calculateSize, cache, stats.totalSize, stats.totalItems, finalConfig.maxSize, evictItems]);

  // Get cache entry
  const get = useCallback((key: string): any | null => {
    const entry = cache.get(key);
    
    if (!entry) {
      missCount.current++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > finalConfig.maxAge) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
      missCount.current++;
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    hitCount.current++;

    try {
      return decompress(entry.data);
    } catch (error) {
      console.error('[OfflineCache] Failed to decompress data:', error);
      missCount.current++;
      return null;
    }
  }, [cache, finalConfig.maxAge, decompress]);

  // Cache images with automatic compression
  const cacheImage = useCallback((image: UploadedImage, priority: 'low' | 'medium' | 'high' = 'high') => {
    set(`image:${image.id}`, image, priority, 'synced');
  }, [set]);

  // Cache analysis with metadata
  const cacheAnalysis = useCallback((analysis: UXAnalysis, priority: 'low' | 'medium' | 'high' = 'high') => {
    set(`analysis:${analysis.id}`, analysis, priority, 'synced');
  }, [set]);

  // Cache group data
  const cacheGroup = useCallback((group: ImageGroup, priority: 'low' | 'medium' | 'high' = 'medium') => {
    set(`group:${group.id}`, group, priority, 'synced');
  }, [set]);

  // Get cached image
  const getCachedImage = useCallback((imageId: string): UploadedImage | null => {
    return get(`image:${imageId}`) as UploadedImage | null;
  }, [get]);

  // Get cached analysis
  const getCachedAnalysis = useCallback((analysisId: string): UXAnalysis | null => {
    return get(`analysis:${analysisId}`) as UXAnalysis | null;
  }, [get]);

  // Get cached group
  const getCachedGroup = useCallback((groupId: string): ImageGroup | null => {
    return get(`group:${groupId}`) as ImageGroup | null;
  }, [get]);

  // Mark item for sync
  const markForSync = useCallback((key: string) => {
    const entry = cache.get(key);
    if (entry) {
      entry.syncStatus = 'pending';
      syncQueue.current.add(key);
      setStats(prev => ({ ...prev, pendingSyncItems: syncQueue.current.size }));
    }
  }, [cache]);

  // Process sync queue
  const processSyncQueue = useCallback(async (syncFunction: (key: string, data: any) => Promise<boolean>) => {
    const itemsToSync = Array.from(syncQueue.current).slice(0, finalConfig.syncBatchSize);
    
    if (itemsToSync.length === 0) return;

    console.log(`[OfflineCache] Syncing ${itemsToSync.length} items`);

    const results = await Promise.allSettled(
      itemsToSync.map(async (key) => {
        const entry = cache.get(key);
        if (!entry) return false;

        try {
          const data = decompress(entry.data);
          const success = await syncFunction(key, data);
          
          if (success) {
            entry.syncStatus = 'synced';
            syncQueue.current.delete(key);
            return true;
          } else {
            entry.syncStatus = 'failed';
            return false;
          }
        } catch (error) {
          console.error(`[OfflineCache] Sync failed for ${key}:`, error);
          entry.syncStatus = 'failed';
          return false;
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failCount = results.length - successCount;

    setStats(prev => ({ ...prev, pendingSyncItems: syncQueue.current.size }));

    if (successCount > 0) {
      toast({
        title: "Sync progress",
        description: `Synced ${successCount} items${failCount > 0 ? `, ${failCount} failed` : ''}.`,
        category: failCount > 0 ? "error" : "success"
      });
    }
  }, [finalConfig.syncBatchSize, cache, decompress, toast]);

  // Clear cache
  const clear = useCallback(() => {
    setCache(new Map());
    syncQueue.current.clear();
    hitCount.current = 0;
    missCount.current = 0;
    setStats({
      totalSize: 0,
      totalItems: 0,
      hitRate: 0,
      compressionRatio: 0,
      pendingSyncItems: 0
    });
  }, []);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      const totalHits = hitCount.current + missCount.current;
      const hitRate = totalHits > 0 ? (hitCount.current / totalHits) * 100 : 0;
      
      let totalSize = 0;
      let totalUncompressedSize = 0;
      
      cache.forEach(entry => {
        totalSize += entry.size;
        try {
          const decompressed = decompress(entry.data);
          totalUncompressedSize += calculateSize(decompressed);
        } catch (error) {
          // Ignore compression ratio calculation for failed entries
        }
      });
      
      const compressionRatio = totalUncompressedSize > 0 ? 
        ((totalUncompressedSize - totalSize) / totalUncompressedSize) * 100 : 0;

      setStats(prev => ({
        ...prev,
        totalSize,
        totalItems: cache.size,
        hitRate,
        compressionRatio,
        pendingSyncItems: syncQueue.current.size
      }));
    };

    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, [cache, decompress, calculateSize]);

  return {
    // Cache operations
    set,
    get,
    clear,
    
    // Specialized cache operations
    cacheImage,
    cacheAnalysis,
    cacheGroup,
    getCachedImage,
    getCachedAnalysis,
    getCachedGroup,
    
    // Sync operations
    markForSync,
    processSyncQueue,
    
    // Stats and monitoring
    stats,
    isHealthy: stats.totalSize < finalConfig.maxSize && stats.hitRate > 50,
    
    // Utilities
    evictItems,
    config: finalConfig
  };
};