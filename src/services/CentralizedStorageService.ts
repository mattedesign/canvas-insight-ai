/**
 * CentralizedStorageService - Main storage coordination service
 * Phase 2, Step 2.2: Storage Architecture Overhaul
 */

import { StorageAdapter, StorageResult, StorageHealth } from './storage/StorageAdapter';
import { SupabaseStorageAdapter } from './storage/SupabaseStorageAdapter';
import { LocalStorageAdapter } from './storage/LocalStorageAdapter';
import { IndexedDBAdapter } from './storage/IndexedDBAdapter';
import { StorageValidator, ValidationResult } from '@/utils/storageValidation';

type StorageAdapterType = 'supabase' | 'localstorage' | 'indexeddb';

interface StorageConfiguration {
  primary: StorageAdapterType;
  fallbacks: StorageAdapterType[];
  enableValidation: boolean;
  enableSync: boolean;
  syncInterval: number;
  conflictResolution: 'latest' | 'primary' | 'manual';
}

interface SyncStatus {
  lastSync: number;
  isRunning: boolean;
  errors: string[];
  conflictsDetected: number;
  conflictsResolved: number;
}

interface StorageMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageLatency: number;
  adapterUsage: Record<string, number>;
  lastReset: number;
}

export class CentralizedStorageService {
  private adapters: Map<StorageAdapterType, StorageAdapter> = new Map();
  private config: StorageConfiguration;
  private validator: StorageValidator;
  private syncStatus: SyncStatus;
  private metrics: StorageMetrics;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<StorageConfiguration> = {}) {
    this.config = {
      primary: 'supabase',
      fallbacks: ['indexeddb', 'localstorage'],
      enableValidation: true,
      enableSync: true,
      syncInterval: 5 * 60 * 1000, // 5 minutes
      conflictResolution: 'latest',
      ...config
    };

    this.validator = new StorageValidator();
    this.syncStatus = {
      lastSync: 0,
      isRunning: false,
      errors: [],
      conflictsDetected: 0,
      conflictsResolved: 0
    };

    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageLatency: 0,
      adapterUsage: {},
      lastReset: Date.now()
    };

    this.initializeAdapters();
    this.startAutoSync();
  }

  private initializeAdapters(): void {
    // Initialize all available adapters
    this.adapters.set('supabase', new SupabaseStorageAdapter());
    this.adapters.set('localstorage', new LocalStorageAdapter());
    this.adapters.set('indexeddb', new IndexedDBAdapter());

    this.debugLog('Initialized storage adapters', {
      primary: this.config.primary,
      fallbacks: this.config.fallbacks
    });
  }

  // Core storage operations with conflict resolution
  async get<T>(key: string): Promise<StorageResult<T>> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      // Try primary adapter first
      const primaryAdapter = this.adapters.get(this.config.primary);
      if (primaryAdapter) {
        const result = await primaryAdapter.get<T>(key);
        if (result.success) {
          this.updateMetrics(startTime, this.config.primary, true);
          return result;
        }
      }

      // Try fallback adapters
      for (const fallbackType of this.config.fallbacks) {
        const adapter = this.adapters.get(fallbackType);
        if (adapter) {
          const result = await adapter.get<T>(key);
          if (result.success) {
            this.updateMetrics(startTime, fallbackType, true);
            
            // Sync back to primary if successful
            if (this.config.enableSync && primaryAdapter) {
              this.syncToPrimary(key, result.data, result.metadata);
            }
            
            return result;
          }
        }
      }

      this.updateMetrics(startTime, 'none', false);
      return { success: false, error: 'Key not found in any storage adapter' };
    } catch (error) {
      this.updateMetrics(startTime, 'none', false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async set<T>(key: string, value: T): Promise<StorageResult<void>> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      // Validate data if enabled
      if (this.config.enableValidation) {
        const validation = this.validator.validate(key, value);
        if (!validation.isValid) {
          this.updateMetrics(startTime, 'none', false);
          return {
            success: false,
            error: `Validation failed: ${validation.failures.join(', ')}`
          };
        }
      }

      // Try to set in all adapters (primary + fallbacks)
      const adaptersToUse = [this.config.primary, ...this.config.fallbacks];
      const results: Array<{ adapter: string; result: StorageResult<void> }> = [];

      for (const adapterType of adaptersToUse) {
        const adapter = this.adapters.get(adapterType);
        if (adapter) {
          try {
            const result = await adapter.set(key, value);
            results.push({ adapter: adapterType, result });
          } catch (error) {
            results.push({
              adapter: adapterType,
              result: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            });
          }
        }
      }

      // Check if primary adapter succeeded
      const primaryResult = results.find(r => r.adapter === this.config.primary);
      if (primaryResult?.result.success) {
        this.updateMetrics(startTime, this.config.primary, true);
        return primaryResult.result;
      }

      // Check if any fallback succeeded
      const successfulFallback = results.find(r => r.result.success);
      if (successfulFallback) {
        this.updateMetrics(startTime, successfulFallback.adapter, true);
        return successfulFallback.result;
      }

      this.updateMetrics(startTime, 'none', false);
      return {
        success: false,
        error: 'Failed to store in any adapter'
      };
    } catch (error) {
      this.updateMetrics(startTime, 'none', false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async delete(key: string): Promise<StorageResult<void>> {
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      // Delete from all adapters
      const adaptersToUse = [this.config.primary, ...this.config.fallbacks];
      const results: Array<{ adapter: string; result: StorageResult<void> }> = [];

      for (const adapterType of adaptersToUse) {
        const adapter = this.adapters.get(adapterType);
        if (adapter) {
          try {
            const result = await adapter.delete(key);
            results.push({ adapter: adapterType, result });
          } catch (error) {
            results.push({
              adapter: adapterType,
              result: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            });
          }
        }
      }

      // Consider successful if any adapter succeeded
      const anySuccess = results.some(r => r.result.success);
      const successfulAdapter = results.find(r => r.result.success)?.adapter || 'none';

      this.updateMetrics(startTime, successfulAdapter, anySuccess);

      return {
        success: anySuccess,
        error: anySuccess ? undefined : 'Failed to delete from any adapter'
      };
    } catch (error) {
      this.updateMetrics(startTime, 'none', false);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Batch operations with validation
  async setMultiple<T>(items: Record<string, T>): Promise<StorageResult<void>> {
    if (this.config.enableValidation) {
      const validation = this.validator.validateBatch(items);
      if (!validation.isValid) {
        const failures = Object.entries(validation.results)
          .filter(([_, result]) => !result.isValid)
          .map(([key, result]) => `${key}: ${result.failures.join(', ')}`);
        
        return {
          success: false,
          error: `Batch validation failed: ${failures.join('; ')}`
        };
      }
    }

    // Use primary adapter for batch operations
    const primaryAdapter = this.adapters.get(this.config.primary);
    if (primaryAdapter) {
      return await primaryAdapter.setMultiple(items);
    }

    // Fallback to individual sets
    for (const [key, value] of Object.entries(items)) {
      const result = await this.set(key, value);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  async getMultiple<T>(keys: string[]): Promise<StorageResult<Record<string, T>>> {
    const primaryAdapter = this.adapters.get(this.config.primary);
    if (primaryAdapter) {
      const result = await primaryAdapter.getMultiple<T>(keys);
      if (result.success) {
        return result;
      }
    }

    // Fallback to individual gets
    const result: Record<string, T> = {};
    for (const key of keys) {
      const getResult = await this.get<T>(key);
      if (getResult.success && getResult.data !== undefined) {
        result[key] = getResult.data;
      }
    }

    return { success: true, data: result };
  }

  // Sync operations
  async syncAll(): Promise<void> {
    if (this.syncStatus.isRunning) {
      return;
    }

    this.syncStatus.isRunning = true;
    this.syncStatus.errors = [];

    try {
      const primaryAdapter = this.adapters.get(this.config.primary);
      if (!primaryAdapter) {
        throw new Error('Primary adapter not available');
      }

      // Get all keys from fallback adapters
      for (const fallbackType of this.config.fallbacks) {
        const fallbackAdapter = this.adapters.get(fallbackType);
        if (!fallbackAdapter) continue;

        try {
          const keysResult = await fallbackAdapter.listKeys();
          if (!keysResult.success || !keysResult.data) continue;

          for (const key of keysResult.data) {
            await this.syncKey(key, primaryAdapter, fallbackAdapter);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown sync error';
          this.syncStatus.errors.push(`${fallbackType}: ${errorMsg}`);
        }
      }

      this.syncStatus.lastSync = Date.now();
    } finally {
      this.syncStatus.isRunning = false;
    }
  }

  private async syncKey(key: string, primary: StorageAdapter, fallback: StorageAdapter): Promise<void> {
    try {
      const [primaryResult, fallbackResult] = await Promise.all([
        primary.get(key),
        fallback.get(key)
      ]);

      // If only fallback has data, sync to primary
      if (!primaryResult.success && fallbackResult.success) {
        await primary.set(key, fallbackResult.data, fallbackResult.metadata);
        return;
      }

      // If both have data, resolve conflicts
      if (primaryResult.success && fallbackResult.success) {
        await this.resolveConflict(key, primaryResult, fallbackResult, primary, fallback);
      }
    } catch (error) {
      this.debugLog('Sync key failed', { key, error });
    }
  }

  private async resolveConflict(
    key: string,
    primaryResult: StorageResult<any>,
    fallbackResult: StorageResult<any>,
    primary: StorageAdapter,
    fallback: StorageAdapter
  ): Promise<void> {
    this.syncStatus.conflictsDetected++;

    switch (this.config.conflictResolution) {
      case 'latest':
        const primaryTime = primaryResult.metadata?.timestamp || 0;
        const fallbackTime = fallbackResult.metadata?.timestamp || 0;
        
        if (fallbackTime > primaryTime) {
          await primary.set(key, fallbackResult.data, fallbackResult.metadata);
        } else {
          await fallback.set(key, primaryResult.data, primaryResult.metadata);
        }
        break;

      case 'primary':
        await fallback.set(key, primaryResult.data, primaryResult.metadata);
        break;

      case 'manual':
        // For manual resolution, we could emit events or log conflicts
        this.debugLog('Manual conflict resolution required', { key });
        break;
    }

    this.syncStatus.conflictsResolved++;
  }

  private async syncToPrimary(key: string, value: any, metadata?: any): Promise<void> {
    try {
      const primaryAdapter = this.adapters.get(this.config.primary);
      if (primaryAdapter) {
        await primaryAdapter.set(key, value, metadata);
      }
    } catch (error) {
      this.debugLog('Sync to primary failed', { key, error });
    }
  }

  // Health monitoring
  async checkHealth(): Promise<Record<string, StorageHealth>> {
    const health: Record<string, StorageHealth> = {};

    for (const [type, adapter] of this.adapters.entries()) {
      try {
        health[type] = await adapter.checkHealth();
      } catch (error) {
        health[type] = {
          isHealthy: false,
          lastCheck: Date.now(),
          latency: 0,
          errorRate: 1
        };
      }
    }

    return health;
  }

  // Configuration and monitoring
  getConfiguration(): StorageConfiguration {
    return { ...this.config };
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageLatency: 0,
      adapterUsage: {},
      lastReset: Date.now()
    };
  }

  // Auto-sync management
  private startAutoSync(): void {
    if (this.config.enableSync && this.config.syncInterval > 0) {
      this.syncInterval = setInterval(() => {
        this.syncAll().catch(error => {
          this.debugLog('Auto-sync failed', { error });
        });
      }, this.config.syncInterval);
    }
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Utility methods
  private updateMetrics(startTime: number, adapter: string, success: boolean): void {
    const latency = Date.now() - startTime;
    
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }

    // Update average latency
    const totalOps = this.metrics.successfulOperations + this.metrics.failedOperations;
    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (totalOps - 1) + latency) / totalOps;

    // Update adapter usage
    if (adapter !== 'none') {
      this.metrics.adapterUsage[adapter] = (this.metrics.adapterUsage[adapter] || 0) + 1;
    }
  }

  private debugLog(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CentralizedStorage] ${message}`, data || '');
    }
  }

  // Cleanup method
  async dispose(): Promise<void> {
    this.stopAutoSync();
    
    // Close any adapter connections
    for (const adapter of this.adapters.values()) {
      if ('close' in adapter && typeof adapter.close === 'function') {
        await adapter.close();
      }
    }
  }
}

// Singleton instance
let instance: CentralizedStorageService | null = null;

export function getCentralizedStorage(config?: Partial<StorageConfiguration>): CentralizedStorageService {
  if (!instance) {
    instance = new CentralizedStorageService(config);
  }
  return instance;
}

export function resetCentralizedStorage(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}