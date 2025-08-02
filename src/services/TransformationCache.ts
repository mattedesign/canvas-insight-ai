/**
 * ✅ PHASE 3.2: TRANSFORMATION CACHE
 * Intelligent caching system for expensive data transformations
 */

interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  expiresAt: number;
  size: number;
  dependencies: string[];
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

interface CacheConfig {
  maxSize: number;
  maxEntries: number;
  defaultTtl: number;
  cleanupInterval: number;
  enableMetrics: boolean;
}

export class TransformationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private dependencyMap = new Map<string, Set<string>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0
  };
  
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    defaultTtl: 300000, // 5 minutes
    cleanupInterval: 60000, // 1 minute
    enableMetrics: true
  };

  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.startCleanupTimer();
    console.log('[TransformationCache] Initialized with config:', this.config);
  }

  /**
   * ✅ PHASE 3.2: Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeDependencies(key);
      this.recordMiss();
      return null;
    }

    // Update access tracking
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.recordHit();
    console.log(`[TransformationCache] Cache hit for key: ${key}`);
    
    return entry.value as T;
  }

  /**
   * ✅ PHASE 3.2: Set cached value with dependencies
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.config.defaultTtl,
    dependencies: string[] = []
  ): Promise<void> {
    const now = Date.now();
    const size = this.estimateSize(value);
    
    // Check if we need to make space
    await this.ensureSpace(size);

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      expiresAt: now + ttl,
      size,
      dependencies
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      await this.delete(key);
    }

    this.cache.set(key, entry);
    this.updateDependencies(key, dependencies);
    this.updateMetrics();
    
    console.log(`[TransformationCache] Cached entry: ${key}, size: ${size}, ttl: ${ttl}`);
  }

  /**
   * ✅ PHASE 3.2: Delete cached entry
   */
  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.removeDependencies(key);
    this.updateMetrics();
    
    console.log(`[TransformationCache] Deleted cache entry: ${key}`);
    return true;
  }

  /**
   * ✅ PHASE 3.2: Invalidate cache entries by dependency
   */
  async invalidateByDependency(dependency: string): Promise<number> {
    const dependentKeys = this.dependencyMap.get(dependency);
    if (!dependentKeys) {
      return 0;
    }

    let invalidatedCount = 0;
    for (const key of dependentKeys) {
      if (await this.delete(key)) {
        invalidatedCount++;
      }
    }

    this.dependencyMap.delete(dependency);
    console.log(`[TransformationCache] Invalidated ${invalidatedCount} entries for dependency: ${dependency}`);
    
    return invalidatedCount;
  }

  /**
   * ✅ PHASE 3.2: Clear all cache entries
   */
  async clear(): Promise<void> {
    const entryCount = this.cache.size;
    this.cache.clear();
    this.dependencyMap.clear();
    this.updateMetrics();
    
    console.log(`[TransformationCache] Cleared ${entryCount} cache entries`);
  }

  /**
   * ✅ PHASE 3.2: Get cache entry if exists, otherwise load and cache
   */
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttl: number = this.config.defaultTtl,
    dependencies: string[] = []
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Load data and cache it
    console.log(`[TransformationCache] Loading data for key: ${key}`);
    const value = await loader();
    await this.set(key, value, ttl, dependencies);
    
    return value;
  }

  /**
   * ✅ PHASE 3.2: Get cache statistics
   */
  getStats(): CacheMetrics & {
    avgAccessCount: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    topKeys: Array<{ key: string; accessCount: number }>;
  } {
    const entries = Array.from(this.cache.values());
    
    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const entry of entries) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestEntry = entry.key;
      }
      if (entry.createdAt > newestTime) {
        newestTime = entry.createdAt;
        newestEntry = entry.key;
      }
    }

    const topKeys = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({ key: entry.key, accessCount: entry.accessCount }));

    const avgAccessCount = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + entry.accessCount, 0) / entries.length
      : 0;

    return {
      ...this.metrics,
      avgAccessCount,
      oldestEntry,
      newestEntry,
      topKeys
    };
  }

  /**
   * ✅ PHASE 3.2: Get entries that are about to expire
   */
  getExpiringEntries(withinMs: number = 60000): Array<{ key: string; expiresIn: number }> {
    const now = Date.now();
    const cutoff = now + withinMs;
    
    return Array.from(this.cache.values())
      .filter(entry => entry.expiresAt <= cutoff && entry.expiresAt > now)
      .map(entry => ({
        key: entry.key,
        expiresIn: entry.expiresAt - now
      }))
      .sort((a, b) => a.expiresIn - b.expiresIn);
  }

  /**
   * ✅ PHASE 3.2: Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    try {
      const jsonString = JSON.stringify(obj);
      return new TextEncoder().encode(jsonString).length;
    } catch (error) {
      console.warn('[TransformationCache] Failed to estimate size, using default:', error);
      return 1024; // Default 1KB
    }
  }

  /**
   * ✅ PHASE 3.2: Ensure there's enough space for new entry
   */
  private async ensureSpace(neededSize: number): Promise<void> {
    // Check if we're over size limit
    while (this.metrics.totalSize + neededSize > this.config.maxSize && this.cache.size > 0) {
      await this.evictLeastRecentlyUsed();
    }

    // Check if we're over entry count limit
    while (this.cache.size >= this.config.maxEntries && this.cache.size > 0) {
      await this.evictLeastRecentlyUsed();
    }
  }

  /**
   * ✅ PHASE 3.2: Evict least recently used entry
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      await this.delete(lruKey);
      this.metrics.evictions++;
      console.log(`[TransformationCache] Evicted LRU entry: ${lruKey}`);
    }
  }

  /**
   * ✅ PHASE 3.2: Update dependency tracking
   */
  private updateDependencies(key: string, dependencies: string[]): void {
    // Remove old dependencies for this key
    this.removeDependencies(key);

    // Add new dependencies
    for (const dep of dependencies) {
      if (!this.dependencyMap.has(dep)) {
        this.dependencyMap.set(dep, new Set());
      }
      this.dependencyMap.get(dep)!.add(key);
    }
  }

  /**
   * ✅ PHASE 3.2: Remove dependencies for a key
   */
  private removeDependencies(key: string): void {
    for (const [dep, keys] of this.dependencyMap) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencyMap.delete(dep);
      }
    }
  }

  /**
   * ✅ PHASE 3.2: Update cache metrics
   */
  private updateMetrics(): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.entryCount = this.cache.size;
    this.metrics.totalSize = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
  }

  /**
   * ✅ PHASE 3.2: Record cache hit
   */
  private recordHit(): void {
    if (this.config.enableMetrics) {
      this.metrics.hits++;
      this.updateMetrics();
    }
  }

  /**
   * ✅ PHASE 3.2: Record cache miss
   */
  private recordMiss(): void {
    if (this.config.enableMetrics) {
      this.metrics.misses++;
      this.updateMetrics();
    }
  }

  /**
   * ✅ PHASE 3.2: Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * ✅ PHASE 3.2: Clean up expired entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
    }

    if (expiredKeys.length > 0) {
      console.log(`[TransformationCache] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * ✅ PHASE 3.2: Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    this.cache.clear();
    this.dependencyMap.clear();
    console.log('[TransformationCache] Destroyed and cleaned up resources');
  }
}