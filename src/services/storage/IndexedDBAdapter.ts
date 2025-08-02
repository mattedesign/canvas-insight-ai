/**
 * IndexedDBAdapter - IndexedDB implementation for large data storage
 * Phase 2, Step 2.2: Storage Architecture Overhaul
 */

import { StorageAdapter, StorageResult, StorageHealth, StorageMetadata, StorageOptions } from './StorageAdapter';

interface IndexedDBItem {
  key: string;
  value: any;
  metadata: StorageMetadata;
}

export class IndexedDBAdapter extends StorageAdapter {
  private dbName: string;
  private storeName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(dbName: string = 'uxap_storage', storeName: string = 'data', version: number = 1, options: StorageOptions = {}) {
    super('IndexedDB', options);
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
        }
      };
    });
  }

  private async executeTransaction<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest
  ): Promise<T> {
    const db = await this.openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], mode);
      const store = transaction.objectStore(this.storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async get<T>(key: string): Promise<StorageResult<T>> {
    try {
      this.debugLog('Getting data', { key });

      const item: IndexedDBItem = await this.executeTransaction(
        'readonly',
        (store) => store.get(key)
      );

      if (!item) {
        return { success: false, error: 'Key not found' };
      }

      return {
        success: true,
        data: item.value,
        metadata: item.metadata
      };
    } catch (error) {
      this.debugLog('Get operation failed', { key, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async set<T>(key: string, value: T, metadata?: Partial<StorageMetadata>): Promise<StorageResult<void>> {
    try {
      this.debugLog('Setting data', { key });

      const fullMetadata = this.createMetadata(value, metadata);
      const item: IndexedDBItem = {
        key,
        value,
        metadata: fullMetadata
      };

      await this.executeTransaction(
        'readwrite',
        (store) => store.put(item)
      );

      return { success: true };
    } catch (error) {
      this.debugLog('Set operation failed', { key, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async delete(key: string): Promise<StorageResult<void>> {
    try {
      this.debugLog('Deleting data', { key });

      await this.executeTransaction(
        'readwrite',
        (store) => store.delete(key)
      );

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
    try {
      const result = await this.executeTransaction(
        'readonly',
        (store) => store.count(key)
      );
      return result > 0;
    } catch {
      return false;
    }
  }

  async clear(): Promise<StorageResult<void>> {
    try {
      this.debugLog('Clearing all data');

      await this.executeTransaction(
        'readwrite',
        (store) => store.clear()
      );

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

      const db = await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        transaction.oncomplete = () => resolve({ success: true });
        transaction.onerror = () => reject(transaction.error);

        for (const [key, value] of Object.entries(items)) {
          const fullMetadata = this.createMetadata(value);
          const item: IndexedDBItem = {
            key,
            value,
            metadata: fullMetadata
          };
          store.put(item);
        }
      });
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

      const db = await this.openDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        transaction.oncomplete = () => resolve({ success: true });
        transaction.onerror = () => reject(transaction.error);

        for (const key of keys) {
          store.delete(key);
        }
      });
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
      const item: IndexedDBItem = await this.executeTransaction(
        'readonly',
        (store) => store.get(key)
      );

      if (!item) {
        return { success: false, error: 'Key not found' };
      }

      return { success: true, data: item.metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listKeys(prefix?: string): Promise<StorageResult<string[]>> {
    try {
      const keys: string[] = await this.executeTransaction(
        'readonly',
        (store) => {
          const request = store.getAllKeys();
          return request as any; // Type assertion needed for getAllKeys
        }
      );

      if (prefix) {
        const filteredKeys = keys.filter(key => 
          typeof key === 'string' && key.startsWith(prefix)
        );
        return { success: true, data: filteredKeys as string[] };
      }

      return { success: true, data: keys as string[] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSize(): Promise<StorageResult<number>> {
    try {
      // Estimate usage by calculating size of all stored data
      if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return { 
          success: true, 
          data: estimate.usage || 0 
        };
      }

      // Fallback: iterate through all items and sum their sizes
      const items: IndexedDBItem[] = await this.executeTransaction(
        'readonly',
        (store) => store.getAll()
      );

      const totalSize = items.reduce((sum, item) => {
        return sum + (item.metadata?.size || 0);
      }, 0);

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
      // Test IndexedDB availability
      const testKey = '__health_check__';
      
      await this.set(testKey, 'health_check_value');
      const result = await this.get(testKey);
      await this.delete(testKey);

      const latency = Date.now() - startTime;
      const isHealthy = result.success && result.data === 'health_check_value';

      // Get storage quota estimate
      let availableSpace = 0;
      if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        availableSpace = (estimate.quota || 0) - (estimate.usage || 0);
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
      const count: number = await this.executeTransaction(
        'readonly',
        (store) => store.count()
      );

      const sizeResult = await this.getSize();

      return {
        totalItems: count,
        totalSize: sizeResult.success ? sizeResult.data : 0,
        adapter: this.name,
        database: this.dbName,
        store: this.storeName,
        version: this.version,
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

  // Cleanup method to close database connection
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}