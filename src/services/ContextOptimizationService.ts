/**
 * Phase 6.2: Context Optimization Service
 * Provides optimization techniques for React context providers
 */

import { useCallback, useRef, useEffect } from 'react';

export interface ContextUpdateMetrics {
  contextName: string;
  updateCount: number;
  lastUpdateTime: number;
  averageUpdateInterval: number;
  reRenderCount: number;
  consumersCount: number;
}

export interface OptimizationConfig {
  enableBatching: boolean;
  batchInterval: number; // milliseconds
  enableSelective: boolean;
  enableDebugLogging: boolean;
  maxUpdateFrequency: number; // updates per second
}

const DEFAULT_CONFIG: OptimizationConfig = {
  enableBatching: true,
  batchInterval: 16, // ~60fps
  enableSelective: true,
  enableDebugLogging: process.env.NODE_ENV === 'development',
  maxUpdateFrequency: 30, // 30 updates per second max
};

/**
 * Service for optimizing context provider performance
 */
export class ContextOptimizationService {
  private metrics = new Map<string, ContextUpdateMetrics>();
  private batchedUpdates = new Map<string, (() => void)[]>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();
  private config: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a context for optimization tracking
   */
  registerContext(contextName: string, consumersCount: number = 0): void {
    if (!this.metrics.has(contextName)) {
      this.metrics.set(contextName, {
        contextName,
        updateCount: 0,
        lastUpdateTime: 0,
        averageUpdateInterval: 0,
        reRenderCount: 0,
        consumersCount,
      });

      if (this.config.enableDebugLogging) {
        console.log(`[ContextOptimization] Registered context: ${contextName}`);
      }
    }
  }

  /**
   * Track a context update
   */
  trackUpdate(contextName: string): void {
    const metrics = this.metrics.get(contextName);
    if (!metrics) return;

    const now = performance.now();
    const timeSinceLastUpdate = now - metrics.lastUpdateTime;

    // Update metrics
    metrics.updateCount++;
    metrics.lastUpdateTime = now;
    
    // Calculate average interval
    if (metrics.updateCount > 1) {
      metrics.averageUpdateInterval = 
        (metrics.averageUpdateInterval + timeSinceLastUpdate) / 2;
    }

    // Check for excessive update frequency
    if (timeSinceLastUpdate < (1000 / this.config.maxUpdateFrequency)) {
      console.warn(
        `[ContextOptimization] High update frequency detected in ${contextName}: ` +
        `${timeSinceLastUpdate.toFixed(2)}ms interval`
      );
    }

    if (this.config.enableDebugLogging) {
      console.log(`[ContextOptimization] Update tracked for ${contextName}:`, {
        updateCount: metrics.updateCount,
        interval: timeSinceLastUpdate.toFixed(2) + 'ms'
      });
    }
  }

  /**
   * Track a re-render event
   */
  trackReRender(contextName: string): void {
    const metrics = this.metrics.get(contextName);
    if (metrics) {
      metrics.reRenderCount++;
    }
  }

  /**
   * Batch context updates to prevent excessive re-renders
   */
  batchUpdate(contextName: string, updateFn: () => void): void {
    if (!this.config.enableBatching) {
      updateFn();
      return;
    }

    // Add to batch
    if (!this.batchedUpdates.has(contextName)) {
      this.batchedUpdates.set(contextName, []);
    }
    this.batchedUpdates.get(contextName)!.push(updateFn);

    // Clear existing timeout
    const existingTimeout = this.batchTimeouts.get(contextName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.flushBatch(contextName);
    }, this.config.batchInterval);

    this.batchTimeouts.set(contextName, timeout);
  }

  /**
   * Flush batched updates for a context
   */
  private flushBatch(contextName: string): void {
    const updates = this.batchedUpdates.get(contextName);
    if (!updates || updates.length === 0) return;

    if (this.config.enableDebugLogging) {
      console.log(`[ContextOptimization] Flushing ${updates.length} batched updates for ${contextName}`);
    }

    // Execute all batched updates
    updates.forEach(updateFn => {
      try {
        updateFn();
      } catch (error) {
        console.error(`[ContextOptimization] Error in batched update for ${contextName}:`, error);
      }
    });

    // Clear batch
    this.batchedUpdates.set(contextName, []);
    this.batchTimeouts.delete(contextName);
  }

  /**
   * Get metrics for a specific context
   */
  getMetrics(contextName: string): ContextUpdateMetrics | null {
    return this.metrics.get(contextName) || null;
  }

  /**
   * Get all context metrics
   */
  getAllMetrics(): ContextUpdateMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Check if a context is performing well
   */
  isContextHealthy(contextName: string): boolean {
    const metrics = this.metrics.get(contextName);
    if (!metrics) return true;

    // Check for excessive update frequency
    const avgInterval = metrics.averageUpdateInterval;
    const minInterval = 1000 / this.config.maxUpdateFrequency;
    
    if (avgInterval > 0 && avgInterval < minInterval) {
      return false;
    }

    // Check re-render ratio
    const reRenderRatio = metrics.updateCount > 0 ? 
      metrics.reRenderCount / metrics.updateCount : 0;
    
    if (reRenderRatio > 2) { // More than 2 re-renders per update is concerning
      return false;
    }

    return true;
  }

  /**
   * Get optimization recommendations for a context
   */
  getOptimizationRecommendations(contextName: string): string[] {
    const metrics = this.metrics.get(contextName);
    if (!metrics) return [];

    const recommendations: string[] = [];

    // High update frequency
    if (metrics.averageUpdateInterval < 50) { // Less than 50ms between updates
      recommendations.push('Consider batching updates to reduce frequency');
    }

    // High re-render ratio
    const reRenderRatio = metrics.updateCount > 0 ? 
      metrics.reRenderCount / metrics.updateCount : 0;
    
    if (reRenderRatio > 1.5) {
      recommendations.push('Consider splitting context or using React.memo for consumers');
    }

    // Large number of consumers
    if (metrics.consumersCount > 10) {
      recommendations.push('Consider splitting context into smaller, focused contexts');
    }

    return recommendations;
  }

  /**
   * Reset metrics for a context
   */
  resetMetrics(contextName?: string): void {
    if (contextName) {
      this.metrics.delete(contextName);
      this.batchedUpdates.delete(contextName);
      const timeout = this.batchTimeouts.get(contextName);
      if (timeout) {
        clearTimeout(timeout);
        this.batchTimeouts.delete(contextName);
      }
    } else {
      this.metrics.clear();
      this.batchedUpdates.clear();
      this.batchTimeouts.forEach(timeout => clearTimeout(timeout));
      this.batchTimeouts.clear();
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    this.batchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.metrics.clear();
    this.batchedUpdates.clear();
    this.batchTimeouts.clear();
  }
}

// Global service instance
export const contextOptimizationService = new ContextOptimizationService();

/**
 * Hook for context optimization utilities
 */
export const useContextOptimization = (contextName: string) => {
  const metricsRef = useRef<ContextUpdateMetrics | null>(null);
  const service = contextOptimizationService;

  // Register context on mount
  useEffect(() => {
    service.registerContext(contextName);
    return () => {
      // Don't reset metrics on unmount to preserve historical data
    };
  }, [contextName, service]);

  const trackUpdate = useCallback(() => {
    service.trackUpdate(contextName);
    metricsRef.current = service.getMetrics(contextName);
  }, [contextName, service]);

  const trackReRender = useCallback(() => {
    service.trackReRender(contextName);
    metricsRef.current = service.getMetrics(contextName);
  }, [contextName, service]);

  const batchUpdate = useCallback((updateFn: () => void) => {
    service.batchUpdate(contextName, updateFn);
  }, [contextName, service]);

  const getMetrics = useCallback(() => {
    return service.getMetrics(contextName);
  }, [contextName, service]);

  const isHealthy = useCallback(() => {
    return service.isContextHealthy(contextName);
  }, [contextName, service]);

  const getRecommendations = useCallback(() => {
    return service.getOptimizationRecommendations(contextName);
  }, [contextName, service]);

  return {
    trackUpdate,
    trackReRender,
    batchUpdate,
    getMetrics,
    isHealthy,
    getRecommendations,
    currentMetrics: metricsRef.current,
  };
};