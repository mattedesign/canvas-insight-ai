/**
 * Phase 6.2: Context Batching Service
 * Manages batching of context updates to improve performance
 */

export interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  enablePrioritization: boolean;
  enableDebugLogging: boolean;
}

export interface UpdateRequest {
  id: string;
  contextName: string;
  updateFn: () => void;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  dependencies?: string[];
}

export interface BatchStats {
  totalBatches: number;
  totalUpdates: number;
  averageBatchSize: number;
  averageBatchTime: number;
  conflictsResolved: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  batchTimeout: 16, // ~60fps
  enablePrioritization: true,
  enableDebugLogging: process.env.NODE_ENV === 'development',
};

/**
 * Service for batching context updates to prevent excessive re-renders
 */
export class ContextBatchingService {
  private config: BatchConfig;
  private pendingUpdates = new Map<string, UpdateRequest[]>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();
  private updateCounter = 0;
  private stats: BatchStats = {
    totalBatches: 0,
    totalUpdates: 0,
    averageBatchSize: 0,
    averageBatchTime: 0,
    conflictsResolved: 0,
  };

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add an update to the batch queue
   */
  scheduleUpdate(
    contextName: string,
    updateFn: () => void,
    priority: UpdateRequest['priority'] = 'normal',
    dependencies?: string[]
  ): string {
    const updateId = `${contextName}-${++this.updateCounter}-${Date.now()}`;
    
    const updateRequest: UpdateRequest = {
      id: updateId,
      contextName,
      updateFn,
      priority,
      timestamp: performance.now(),
      dependencies,
    };

    // Add to pending updates
    if (!this.pendingUpdates.has(contextName)) {
      this.pendingUpdates.set(contextName, []);
    }
    
    const pendingList = this.pendingUpdates.get(contextName)!;
    pendingList.push(updateRequest);

    if (this.config.enableDebugLogging) {
      console.log(`[ContextBatching] Scheduled update ${updateId} for ${contextName}`, {
        priority,
        queueSize: pendingList.length,
      });
    }

    // Handle critical priority immediately
    if (priority === 'critical') {
      this.flushContext(contextName);
      return updateId;
    }

    // Check if we should flush immediately
    if (pendingList.length >= this.config.maxBatchSize) {
      this.flushContext(contextName);
    } else {
      this.scheduleFlush(contextName);
    }

    return updateId;
  }

  /**
   * Schedule a delayed flush for a context
   */
  private scheduleFlush(contextName: string): void {
    // Clear existing timeout
    const existingTimeout = this.batchTimeouts.get(contextName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.flushContext(contextName);
    }, this.config.batchTimeout);

    this.batchTimeouts.set(contextName, timeout);
  }

  /**
   * Flush all pending updates for a context
   */
  flushContext(contextName: string): void {
    const updates = this.pendingUpdates.get(contextName);
    if (!updates || updates.length === 0) {
      return;
    }

    const startTime = performance.now();
    const batchSize = updates.length;

    if (this.config.enableDebugLogging) {
      console.log(`[ContextBatching] Flushing ${batchSize} updates for ${contextName}`);
    }

    // Sort by priority if enabled
    const sortedUpdates = this.config.enablePrioritization 
      ? this.sortUpdatesByPriority(updates)
      : updates;

    // Resolve conflicts
    const conflictFreeUpdates = this.resolveConflicts(sortedUpdates);
    const conflictsResolved = updates.length - conflictFreeUpdates.length;

    // Execute updates
    conflictFreeUpdates.forEach(update => {
      try {
        update.updateFn();
      } catch (error) {
        console.error(`[ContextBatching] Error executing update ${update.id}:`, error);
      }
    });

    // Update statistics
    const batchTime = performance.now() - startTime;
    this.updateStats(batchSize, batchTime, conflictsResolved);

    // Clear batch
    this.pendingUpdates.set(contextName, []);
    this.batchTimeouts.delete(contextName);

    if (this.config.enableDebugLogging) {
      console.log(`[ContextBatching] Batch completed for ${contextName}`, {
        executedUpdates: conflictFreeUpdates.length,
        conflictsResolved,
        batchTime: batchTime.toFixed(2) + 'ms',
      });
    }
  }

  /**
   * Sort updates by priority
   */
  private sortUpdatesByPriority(updates: UpdateRequest[]): UpdateRequest[] {
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    
    return [...updates].sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Resolve conflicts between updates
   */
  private resolveConflicts(updates: UpdateRequest[]): UpdateRequest[] {
    if (updates.length <= 1) return updates;

    const resolved: UpdateRequest[] = [];
    const seenDependencies = new Set<string>();

    for (const update of updates) {
      let hasConflict = false;

      // Check for dependency conflicts
      if (update.dependencies) {
        for (const dep of update.dependencies) {
          if (seenDependencies.has(dep)) {
            hasConflict = true;
            break;
          }
        }
      }

      if (!hasConflict) {
        resolved.push(update);
        
        // Add dependencies to seen set
        if (update.dependencies) {
          update.dependencies.forEach(dep => seenDependencies.add(dep));
        }
      } else if (this.config.enableDebugLogging) {
        console.log(`[ContextBatching] Conflict detected for update ${update.id}, skipping`);
      }
    }

    return resolved;
  }

  /**
   * Update internal statistics
   */
  private updateStats(batchSize: number, batchTime: number, conflictsResolved: number): void {
    this.stats.totalBatches++;
    this.stats.totalUpdates += batchSize;
    this.stats.conflictsResolved += conflictsResolved;

    // Update averages
    this.stats.averageBatchSize = this.stats.totalUpdates / this.stats.totalBatches;
    this.stats.averageBatchTime = 
      (this.stats.averageBatchTime * (this.stats.totalBatches - 1) + batchTime) / this.stats.totalBatches;
  }

  /**
   * Flush all pending updates immediately
   */
  flushAll(): void {
    const contextsToFlush = Array.from(this.pendingUpdates.keys());
    contextsToFlush.forEach(contextName => {
      this.flushContext(contextName);
    });

    if (this.config.enableDebugLogging) {
      console.log(`[ContextBatching] Flushed all contexts: ${contextsToFlush.join(', ')}`);
    }
  }

  /**
   * Cancel a scheduled update
   */
  cancelUpdate(updateId: string): boolean {
    for (const [contextName, updates] of this.pendingUpdates.entries()) {
      const index = updates.findIndex(update => update.id === updateId);
      if (index !== -1) {
        updates.splice(index, 1);
        
        if (this.config.enableDebugLogging) {
          console.log(`[ContextBatching] Cancelled update ${updateId}`);
        }
        
        return true;
      }
    }
    return false;
  }

  /**
   * Get pending update count for a context
   */
  getPendingCount(contextName: string): number {
    return this.pendingUpdates.get(contextName)?.length || 0;
  }

  /**
   * Get all pending contexts
   */
  getPendingContexts(): string[] {
    return Array.from(this.pendingUpdates.keys()).filter(
      contextName => this.getPendingCount(contextName) > 0
    );
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalBatches: 0,
      totalUpdates: 0,
      averageBatchSize: 0,
      averageBatchTime: 0,
      conflictsResolved: 0,
    };
  }

  /**
   * Check if a context has pending updates
   */
  hasPendingUpdates(contextName: string): boolean {
    return this.getPendingCount(contextName) > 0;
  }

  /**
   * Get detailed update information for a context
   */
  getContextUpdateInfo(contextName: string): {
    pendingCount: number;
    oldestUpdate?: number; // age in milliseconds
    priorityBreakdown: Record<UpdateRequest['priority'], number>;
  } {
    const updates = this.pendingUpdates.get(contextName) || [];
    const now = performance.now();
    
    const priorityBreakdown: Record<UpdateRequest['priority'], number> = {
      low: 0,
      normal: 0,
      high: 0,
      critical: 0,
    };

    let oldestTimestamp = now;
    
    updates.forEach(update => {
      priorityBreakdown[update.priority]++;
      if (update.timestamp < oldestTimestamp) {
        oldestTimestamp = update.timestamp;
      }
    });

    return {
      pendingCount: updates.length,
      oldestUpdate: updates.length > 0 ? now - oldestTimestamp : undefined,
      priorityBreakdown,
    };
  }

  /**
   * Cleanup service resources
   */
  destroy(): void {
    // Clear all timeouts
    this.batchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.batchTimeouts.clear();
    
    // Clear pending updates
    this.pendingUpdates.clear();
    
    if (this.config.enableDebugLogging) {
      console.log('[ContextBatching] Service destroyed');
    }
  }
}

// Global service instance
export const contextBatchingService = new ContextBatchingService();

/**
 * Hook for using context batching in components
 */
export const useContextBatching = (contextName: string) => {
  const scheduleUpdate = (
    updateFn: () => void,
    priority: UpdateRequest['priority'] = 'normal',
    dependencies?: string[]
  ) => {
    return contextBatchingService.scheduleUpdate(contextName, updateFn, priority, dependencies);
  };

  const flushNow = () => {
    contextBatchingService.flushContext(contextName);
  };

  const getPendingCount = () => {
    return contextBatchingService.getPendingCount(contextName);
  };

  const getUpdateInfo = () => {
    return contextBatchingService.getContextUpdateInfo(contextName);
  };

  return {
    scheduleUpdate,
    flushNow,
    getPendingCount,
    getUpdateInfo,
    hasPendingUpdates: () => contextBatchingService.hasPendingUpdates(contextName),
  };
};