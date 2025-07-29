export class SmartCacheService {
  private static cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();
  
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100; // Prevent memory bloat
  
  static set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Auto-cleanup old entries periodically
    if (Math.random() < 0.1) { // 10% chance on each set
      this.cleanup();
    }
  }
  
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  static async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      console.log(`[Cache] Hit for key: ${key}`);
      return cached;
    }
    
    console.log(`[Cache] Miss for key: ${key}, loading...`);
    const data = await loader();
    this.set(key, data, ttl);
    return data;
  }
  
  private static cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[Cache] Cleaned up ${deletedCount} expired entries`);
    }
  }
  
  private static evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[Cache] Evicted oldest entry: ${oldestKey}`);
    }
  }
  
  static clear(pattern?: string): void {
    if (pattern) {
      let deletedCount = 0;
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          deletedCount++;
        }
      }
      console.log(`[Cache] Cleared ${deletedCount} entries matching pattern: ${pattern}`);
    } else {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[Cache] Cleared all ${size} entries`);
    }
  }
  
  static invalidate(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    if (existed) {
      console.log(`[Cache] Invalidated key: ${key}`);
    }
    return existed;
  }
  
  static getStats(): {
    size: number;
    keys: string[];
    memory: number;
  } {
    const keys = Array.from(this.cache.keys());
    const memory = JSON.stringify(Array.from(this.cache.values())).length;
    
    return {
      size: this.cache.size,
      keys,
      memory
    };
  }
  
  // Predefined cache key generators for common patterns
  static generateProjectKey(projectId: string): string {
    return `project:${projectId}`;
  }
  
  static generateImageKey(projectId: string, limit: number, offset: number): string {
    return `images:${projectId}:${limit}:${offset}`;
  }
  
  static generateAnalysisKey(imageIds: string[]): string {
    return `analyses:${imageIds.sort().join(',')}`;
  }
  
  static generateGroupKey(projectId: string): string {
    return `groups:${projectId}`;
  }
  
  static generateGroupAnalysisKey(groupIds: string[]): string {
    return `group-analyses:${groupIds.sort().join(',')}`;
  }
  
  // Cache warming - preload commonly accessed data
  static async warmCache(projectId: string): Promise<void> {
    try {
      console.log(`[Cache] Warming cache for project: ${projectId}`);
      
      // Import services dynamically to avoid circular dependencies
      const { OptimizedDataService } = await import('./OptimizedMigrationService');
      
      // Warm with basic project data
      const projectKey = this.generateProjectKey(projectId);
      await this.getOrLoad(
        projectKey,
        () => OptimizedDataService.getProjectStats(projectId),
        10 * 60 * 1000 // 10 minutes for stats
      );
      
      console.log(`[Cache] Cache warmed for project: ${projectId}`);
    } catch (error) {
      console.error(`[Cache] Failed to warm cache for project ${projectId}:`, error);
    }
  }
}