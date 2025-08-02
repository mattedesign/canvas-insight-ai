/**
 * SupabaseStorageAdapter - Supabase-specific storage implementation
 * Phase 2, Step 2.2: Storage Architecture Overhaul
 */

import { supabase } from '@/integrations/supabase/client';
import { StorageAdapter, StorageResult, StorageHealth, StorageMetadata, StorageOptions } from './StorageAdapter';

interface SupabaseStorageOptions extends StorageOptions {
  tableName?: string;
  bucketName?: string;
}

export class SupabaseStorageAdapter extends StorageAdapter {
  private tableName: string = 'storage_data';

  constructor(options: SupabaseStorageOptions = {}) {
    super('Supabase', options);
    // Use the storage_data table we created
    this.tableName = 'storage_data';
  }

  async get<T>(key: string): Promise<StorageResult<T>> {
    try {
      this.debugLog('Getting data', { key });

      const { data, error } = await supabase
        .from('storage_data')
        .select('value, metadata')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return { success: false, error: 'Key not found' };
        }
        throw error;
      }

      return {
        success: true,
        data: data.value as T,
        metadata: data.metadata as unknown as StorageMetadata
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

      const { error } = await supabase
        .from('storage_data')
        .upsert({
          key,
          value: value as any,
          metadata: fullMetadata as any,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

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

      const { error } = await supabase
        .from('storage_data')
        .delete()
        .eq('key', key);

      if (error) throw error;

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
      const { data, error } = await supabase
        .from('storage_data')
        .select('key')
        .eq('key', key)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  async clear(): Promise<StorageResult<void>> {
    try {
      this.debugLog('Clearing all data');

      const { error } = await supabase
        .from('storage_data')
        .delete()
        .neq('key', ''); // Delete all records

      if (error) throw error;

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

      const { data, error } = await supabase
        .from('storage_data')
        .select('key, value, metadata')
        .in('key', keys);

      if (error) throw error;

      const result: Record<string, T> = {};
      data?.forEach(item => {
        result[item.key] = item.value as T;
      });

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

      const records = Object.entries(items).map(([key, value]) => ({
        key,
        value: value as any,
        metadata: this.createMetadata(value) as any,
        user_id: null, // Will be set by RLS
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('storage_data')
        .upsert(records);

      if (error) throw error;

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

      const { error } = await supabase
        .from('storage_data')
        .delete()
        .in('key', keys);

      if (error) throw error;

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
      const { data, error } = await supabase
        .from('storage_data')
        .select('metadata')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'Key not found' };
        }
        throw error;
      }

      return { success: true, data: data.metadata as unknown as StorageMetadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listKeys(prefix?: string): Promise<StorageResult<string[]>> {
    try {
      let query = supabase.from('storage_data').select('key');
      
      if (prefix) {
        query = query.like('key', `${prefix}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const keys = data?.map(item => item.key) || [];
      return { success: true, data: keys };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSize(): Promise<StorageResult<number>> {
    try {
      const { data, error } = await supabase
        .from('storage_data')
        .select('metadata');

      if (error) throw error;

      const totalSize = data?.reduce((sum, item) => {
        return sum + ((item.metadata as any)?.size || 0);
      }, 0) || 0;

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
      // Simple health check - try to read from the table
      const { error } = await supabase
        .from('storage_data')
        .select('count')
        .limit(1);

      const latency = Date.now() - startTime;

      return {
        isHealthy: !error,
        lastCheck: Date.now(),
        latency,
        errorRate: error ? 1 : 0
      };
    } catch {
      return {
        isHealthy: false,
        lastCheck: Date.now(),
        latency: Date.now() - startTime,
        errorRate: 1
      };
    }
  }

  async getStats(): Promise<Record<string, any>> {
    try {
      const { data: countData } = await supabase
        .from('storage_data')
        .select('*', { count: 'exact', head: true });

      const sizeResult = await this.getSize();

      return {
        totalItems: countData?.length || 0,
        totalSize: sizeResult.success ? sizeResult.data : 0,
        adapter: this.name,
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
}