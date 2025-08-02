/**
 * StorageAdapter - Base interface for storage operations
 * Phase 2, Step 2.2: Storage Architecture Overhaul
 */

export interface StorageOptions {
  enableCompression?: boolean;
  enableEncryption?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface StorageMetadata {
  timestamp: number;
  version: string;
  size: number;
  checksum?: string;
  compressed?: boolean;
  encrypted?: boolean;
}

export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: StorageMetadata;
}

export interface StorageHealth {
  isHealthy: boolean;
  lastCheck: number;
  latency: number;
  errorRate: number;
  availableSpace?: number;
}

export abstract class StorageAdapter {
  protected name: string;
  protected options: StorageOptions;
  
  constructor(name: string, options: StorageOptions = {}) {
    this.name = name;
    this.options = {
      enableCompression: false,
      enableEncryption: false,
      maxRetries: 3,
      timeout: 5000,
      ...options
    };
  }

  // Core storage operations
  abstract get<T>(key: string): Promise<StorageResult<T>>;
  abstract set<T>(key: string, value: T, metadata?: Partial<StorageMetadata>): Promise<StorageResult<void>>;
  abstract delete(key: string): Promise<StorageResult<void>>;
  abstract exists(key: string): Promise<boolean>;
  abstract clear(): Promise<StorageResult<void>>;

  // Batch operations
  abstract getMultiple<T>(keys: string[]): Promise<StorageResult<Record<string, T>>>;
  abstract setMultiple<T>(items: Record<string, T>): Promise<StorageResult<void>>;
  abstract deleteMultiple(keys: string[]): Promise<StorageResult<void>>;

  // Metadata operations
  abstract getMetadata(key: string): Promise<StorageResult<StorageMetadata>>;
  abstract listKeys(prefix?: string): Promise<StorageResult<string[]>>;
  abstract getSize(): Promise<StorageResult<number>>;

  // Health monitoring
  abstract checkHealth(): Promise<StorageHealth>;
  abstract getStats(): Promise<Record<string, any>>;

  // Utility methods
  getName(): string {
    return this.name;
  }

  getOptions(): StorageOptions {
    return { ...this.options };
  }

  // Protected helper methods
  protected generateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  protected createMetadata(data: any, partial?: Partial<StorageMetadata>): StorageMetadata {
    const serialized = JSON.stringify(data);
    return {
      timestamp: Date.now(),
      version: '1.0.0',
      size: new Blob([serialized]).size,
      checksum: this.generateChecksum(data),
      compressed: this.options.enableCompression || false,
      encrypted: this.options.enableEncryption || false,
      ...partial
    };
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.options.maxRetries || 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  protected debugLog(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.name}] ${message}`, data || '');
    }
  }
}