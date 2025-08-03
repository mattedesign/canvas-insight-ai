/**
 * Storage Query Service
 * Bridge between Supabase Storage and storage_metadata database table
 * Provides organized storage queries with RLS policies
 */

import { supabase } from "@/integrations/supabase/client";

interface StorageQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'upload_date' | 'last_accessed' | 'file_size' | 'original_filename';
  sortOrder?: 'asc' | 'desc';
  fileType?: string;
  projectId?: string;
}

interface StorageFile {
  id: string;
  user_id: string;
  project_id: string | null;
  original_filename: string;
  storage_path: string;
  file_size: number | null;
  file_type: string | null;
  dimensions: any;
  upload_date: string;
  last_accessed: string;
  signed_url?: string;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: { [key: string]: number };
  projectDistribution: { [key: string]: number };
  averageFileSize: number;
}

export class StorageQueryService {
  private static instance: StorageQueryService;

  static getInstance(): StorageQueryService {
    if (!StorageQueryService.instance) {
      StorageQueryService.instance = new StorageQueryService();
    }
    return StorageQueryService.instance;
  }

  /**
   * Get user's files with organized storage metadata
   */
  async getUserFiles(options: StorageQueryOptions = {}): Promise<{
    files: StorageFile[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'upload_date',
      sortOrder = 'desc',
      fileType,
      projectId
    } = options;

    try {
      let query = supabase
        .from('storage_metadata')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply filters
      if (fileType) {
        query = query.eq('file_type', fileType);
      }

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch files: ${error.message}`);
      }

      const total = count || 0;
      const files = data || [];

      return {
        files,
        total,
        hasMore: offset + files.length < total
      };

    } catch (error) {
      console.error('[Storage Query] Failed to get user files:', error);
      return {
        files: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Get files for a specific project
   */
  async getProjectFiles(projectId: string, options: Omit<StorageQueryOptions, 'projectId'> = {}): Promise<StorageFile[]> {
    const result = await this.getUserFiles({ ...options, projectId });
    return result.files;
  }

  /**
   * Get file by ID with signed URL
   */
  async getFileById(fileId: string, includeSignedUrl: boolean = true): Promise<StorageFile | null> {
    try {
      const { data, error } = await supabase
        .from('storage_metadata')
        .select('*')
        .eq('id', fileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // File not found
        }
        throw new Error(`Failed to fetch file: ${error.message}`);
      }

      const file = data as StorageFile;

      // Generate signed URL if requested
      if (includeSignedUrl) {
        const { data: urlData } = await supabase.storage
          .from('images')
          .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

        if (urlData?.signedUrl) {
          file.signed_url = urlData.signedUrl;
        }
      }

      // Update last accessed timestamp
      await this.updateLastAccessed(fileId);

      return file;

    } catch (error) {
      console.error('[Storage Query] Failed to get file by ID:', error);
      return null;
    }
  }

  /**
   * Get signed URL for a file
   */
  async getSignedUrl(fileId: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const file = await this.getFileById(fileId, false);
      
      if (!file) {
        return null;
      }

      const { data, error } = await supabase.storage
        .from('images')
        .createSignedUrl(file.storage_path, expiresIn);

      if (error) {
        console.error('[Storage Query] Failed to create signed URL:', error);
        return null;
      }

      // Update last accessed timestamp
      await this.updateLastAccessed(fileId);

      return data.signedUrl;

    } catch (error) {
      console.error('[Storage Query] Failed to get signed URL:', error);
      return null;
    }
  }

  /**
   * Create storage metadata entry
   */
  async createStorageMetadata(data: {
    user_id: string;
    project_id: string | null;
    original_filename: string;
    storage_path: string;
    file_size?: number;
    file_type?: string;
    dimensions?: any;
  }): Promise<string | null> {
    try {
      const { data: result, error } = await supabase
        .from('storage_metadata')
        .insert([data])
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create storage metadata: ${error.message}`);
      }

      return result.id;

    } catch (error) {
      console.error('[Storage Query] Failed to create storage metadata:', error);
      return null;
    }
  }

  /**
   * Update storage metadata
   */
  async updateStorageMetadata(
    fileId: string, 
    updates: Partial<StorageFile>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('storage_metadata')
        .update(updates)
        .eq('id', fileId);

      if (error) {
        throw new Error(`Failed to update storage metadata: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('[Storage Query] Failed to update storage metadata:', error);
      return false;
    }
  }

  /**
   * Delete storage metadata and file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      // Get file metadata first
      const file = await this.getFileById(fileId, false);
      
      if (!file) {
        return false;
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([file.storage_path]);

      if (storageError) {
        console.warn('[Storage Query] Failed to delete from storage:', storageError);
        // Continue with metadata deletion even if storage deletion fails
      }

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('storage_metadata')
        .delete()
        .eq('id', fileId);

      if (metadataError) {
        throw new Error(`Failed to delete metadata: ${metadataError.message}`);
      }

      return true;

    } catch (error) {
      console.error('[Storage Query] Failed to delete file:', error);
      return false;
    }
  }

  /**
   * Update last accessed timestamp
   */
  private async updateLastAccessed(fileId: string): Promise<void> {
    try {
      await supabase
        .from('storage_metadata')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', fileId);
    } catch (error) {
      // Don't throw - this is a non-critical operation
      console.warn('[Storage Query] Failed to update last_accessed:', error);
    }
  }

  /**
   * Generate organized storage path for new file
   */
  generateStoragePath(userId: string, projectId: string | null, filename: string): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    if (projectId) {
      return `${userId}/${projectId}/${sanitizedFilename}`;
    }
    
    return `${userId}/default/${sanitizedFilename}`;
  }

  /**
   * Get storage statistics for user
   */
  async getUserStorageStats(): Promise<StorageStats> {
    try {
      const { data, error } = await supabase
        .from('storage_metadata')
        .select('file_type, file_size, project_id');

      if (error) {
        throw new Error(`Failed to fetch storage stats: ${error.message}`);
      }

      const files = data || [];
      const stats: StorageStats = {
        totalFiles: files.length,
        totalSize: 0,
        fileTypes: {},
        projectDistribution: {},
        averageFileSize: 0
      };

      let totalSize = 0;
      let filesWithSize = 0;

      for (const file of files) {
        // File types
        if (file.file_type) {
          stats.fileTypes[file.file_type] = (stats.fileTypes[file.file_type] || 0) + 1;
        }

        // Project distribution
        const projectKey = file.project_id || 'default';
        stats.projectDistribution[projectKey] = (stats.projectDistribution[projectKey] || 0) + 1;

        // File sizes
        if (file.file_size && file.file_size > 0) {
          totalSize += file.file_size;
          filesWithSize++;
        }
      }

      stats.totalSize = totalSize;
      stats.averageFileSize = filesWithSize > 0 ? Math.round(totalSize / filesWithSize) : 0;

      return stats;

    } catch (error) {
      console.error('[Storage Query] Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        projectDistribution: {},
        averageFileSize: 0
      };
    }
  }
}

export const storageQueryService = StorageQueryService.getInstance();