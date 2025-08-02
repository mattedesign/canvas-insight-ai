/**
 * LocalStorageAdapter - Browser localStorage implementation
 * Phase 2, Step 2.2: Storage Architecture Overhaul
 */

import { StorageAdapter, StorageResult, StorageHealth, StorageMetadata, StorageOptions } from './StorageAdapter';

interface LocalStorageItem {
  value: any;
  metadata: StorageMetadata;
}

export class LocalStorageAdapter extends StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'uxap_', options: StorageOptions = {}) {
    super('LocalStorage', options);
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<StorageResult<T>> {
    try {
      this.debugLog('Getting data', { key });

      const fullKey = this.getFullKey(key);
      const rawData = localStorage.getItem(fullKey);

      if (!rawData) {
        return { success: false, error: 'Key not found' };
      }

      const item: LocalStorageItem = JSON.parse(rawData);
      return {
        success: true,
        data: item.value,
        metadata: item.metadata
      };
    } catch (error) {
      this.debugLog('Get operation failed', { key, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error'
      };
    }
  }

  async set<T>(key: string, value: T, metadata?: Partial<StorageMetadata>): Promise<StorageResult<void>> {
    try {
      this.debugLog('Setting data', { key });

      const fullKey = this.getFullKey(key);
      const fullMetadata = this.createMetadata(value, metadata);
      
      const item: LocalStorageItem = {
        value,
        metadata: fullMetadata
      };

      localStorage.setItem(fullKey, JSON.stringify(item));
      return { success: true };
    } catch (error) {
      this.debugLog('Set operation failed', { key, error });
      
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return {
          success: false,
          error: 'Storage quota exceeded'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async delete(key: string): Promise<StorageResult<void>> {
    try {
      this.debugLog('Deleting data', { key });

      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return { success: true };
    } catch (error) {
      this.debugLog('Delete operation failed', { key, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  async clear(): Promise<StorageResult<void>> {
    try {
      this.debugLog('Clearing all data');

      const keys = this.getAllKeys();
      keys.forEach(key => localStorage.removeItem(key));
      
      return { success: true };
    } catch (error) {
      this.debugLog('Clear operation failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getMultiple<T>(keys: string[]): Promise<StorageResult<Record<string, T>>> {
    try {
      this.debugLog('Getting multiple items', { keys });

      const result: Record<string, T> = {};
      
      for (const key of keys) {
        const getResult = await this.get<T>(key);
        if (getResult.success && getResult.data !== undefined) {
          result[key] = getResult.data;
        }
      }

      return { success: true, data: result };
    } catch (error) {
      this.debugLog('Get multiple operation failed', { keys, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async setMultiple<T>(items: Record<string, T>): Promise<StorageResult<void>> {
    try {
      this.debugLog('Setting multiple items', { count: Object.keys(items).length });

      for (const [key, value] of Object.entries(items)) {
        const setResult = await this.set(key, value);
        if (!setResult.success) {
          throw new Error(`Failed to set ${key}: ${setResult.error}`);
        }
      }

      return { success: true };
    } catch (error) {
      this.debugLog('Set multiple operation failed', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteMultiple(keys: string[]): Promise<StorageResult<void>> {
    try {
      this.debugLog('Deleting multiple items', { keys });

      for (const key of keys) {
        await this.delete(key);
      }

      return { success: true };
    } catch (error) {
      this.debugLog('Delete multiple operation failed', { keys, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getMetadata(key: string): Promise<StorageResult<StorageMetadata>> {
    try {
      const fullKey = this.getFullKey(key);
      const rawData = localStorage.getItem(fullKey);

      if (!rawData) {
        return { success: false, error: 'Key not found' };
      }

      const item: LocalStorageItem = JSON.parse(rawData);
      return { success: true, data: item.metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Parse error'
      };
    }
  }

  async listKeys(prefix?: string): Promise<StorageResult<string[]>> {
    try {
      const allKeys = this.getAllKeys();
      const appKeys = allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.slice(this.prefix.length));

      if (prefix) {
        return {
          success: true,
          data: appKeys.filter(key => key.startsWith(prefix))
        };
      }

      return { success: true, data: appKeys };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSize(): Promise<StorageResult<number>> {
    try {
      let totalSize = 0;
      const keys = this.getAllKeys();

      for (const key of keys) {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }

      return { success: true, data: totalSize };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkHealth(): Promise<StorageHealth> {
    const startTime = Date.now();
    
    try {
      // Test localStorage availability and quota
      const testKey = `${this.prefix}__health_check__`;
      const testValue = 'health_check_value';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const latency = Date.now() - startTime;
      const isHealthy = retrieved === testValue;

      // Estimate available space (rough estimation)
      let availableSpace = 0;
      try {
        // Try to estimate quota by attempting to fill storage
        const testData = 'x'.repeat(1024); // 1KB chunks
        let chunks = 0;
        const maxTest = 1000; // Test up to 1MB
        
        for (let i = 0; i < maxTest; i++) {
          try {
            localStorage.setItem(`${testKey}_${i}`, testData);
            chunks++;
          } catch {
            break;
          }
        }
        
        // Clean up test data
        for (let i = 0; i < chunks; i++) {
          localStorage.removeItem(`${testKey}_${i}`);
        }
        
        availableSpace = chunks * 1024; // Rough estimate in bytes
      } catch {
        // If estimation fails, use a conservative default
        availableSpace = 1024 * 1024; // 1MB default
      }

      return {
        isHealthy,
        lastCheck: Date.now(),
        latency,
        errorRate: isHealthy ? 0 : 1,
        availableSpace
      };
    } catch {
      return {
        isHealthy: false,
        lastCheck: Date.now(),
        latency: Date.now() - startTime,
        errorRate: 1,
        availableSpace: 0
      };
    }
  }

  async getStats(): Promise<Record<string, any>> {
    try {
      const keys = this.getAllKeys();
      const sizeResult = await this.getSize();

      return {
        totalItems: keys.length,
        totalSize: sizeResult.success ? sizeResult.data : 0,
        adapter: this.name,
        prefix: this.prefix,
        lastUpdated: Date.now()
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        adapter: this.name,
        lastUpdated: Date.now()
      };
    }
  }

  // Private helper methods
  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
}