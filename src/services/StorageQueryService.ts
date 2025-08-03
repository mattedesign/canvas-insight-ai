/**
 * StorageQueryService - Phase 2B: Storage-Database Bridge
 * Bridges Supabase Storage with storage_metadata database table
 * Implements storage policies aligned with RLS
 */

import { supabase } from "@/integrations/supabase/client";
import type { EnhancedImageDimensions } from '@/types/canvas-interfaces';
import { storagePathMigrationService } from './StoragePathMigrationService';
import { imageDimensionsService } from './ImageDimensionsService';

export interface StorageQueryOptions {
  includeMetadata?: boolean;
  validateAccess?: boolean;
  updateLastAccessed?: boolean;
}

export interface StorageListOptions {
  prefix?: string;
  projectId?: string;
  fileType?: string;
  sortBy?: 'name' | 'upload_date' | 'last_accessed' | 'file_size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BulkStorageOperation {
  operation: 'upload' | 'delete' | 'move' | 'copy';
  files: Array<{
    path: string;
    data?: File | Blob;
    destinationPath?: string;
  }>;
  metadata?: {
    projectId?: string;
    userId?: string;
  };
}

// Database-aligned metadata interface
interface DatabaseStorageMetadata {
  id?: string;
  user_id: string;
  project_id: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  file_type: string;
  dimensions: any; // Flexible type for database JSON
  upload_date?: string;
  last_accessed?: string;
}

export interface StorageOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: DatabaseStorageMetadata;
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
   * Upload file with automatic metadata creation and organized path structure
   */
  async uploadWithMetadata(
    file: File,
    projectId: string,
    options: {
      filename?: string;
      replaceExisting?: boolean;
      extractDimensions?: boolean;
    } = {}
  ): Promise<StorageOperationResult> {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Generate organized storage path
      const filename = options.filename || file.name;
      const storagePath = storagePathMigrationService.generateOrganizedPath(
        user.id,
        projectId,
        filename
      );

      // Check if file already exists (unless replacing)
      if (!options.replaceExisting) {
        const { data: existingFile } = await supabase.storage
          .from('images')
          .list('', { search: storagePath });

        if (existingFile && existingFile.length > 0) {
          throw new Error(`File already exists at path: ${storagePath}`);
        }
      }

      // Extract dimensions if requested
      let dimensions: EnhancedImageDimensions | undefined;
      if (options.extractDimensions) {
        const dimensionResult = await imageDimensionsService.extractDimensionsFromFile(file);
        if (dimensionResult.success && dimensionResult.dimensions) {
          dimensions = dimensionResult.dimensions;
        }
      }

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: options.replaceExisting
        });

      if (uploadError) throw uploadError;

      // Create metadata entry
      const metadata: Omit<DatabaseStorageMetadata, 'id'> = {
        user_id: user.id,
        project_id: projectId,
        original_filename: filename,
        storage_path: storagePath,
        file_size: file.size,
        file_type: file.type,
        dimensions: dimensions ? {
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: dimensions.aspectRatio
        } : { width: 0, height: 0, aspectRatio: 1 },
        upload_date: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      };

      const { data: metadataData, error: metadataError } = await supabase
        .from('storage_metadata')
        .insert(metadata)
        .select()
        .single();

      if (metadataError) throw metadataError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(storagePath);

      return {
        success: true,
        data: {
          path: storagePath,
          url: urlData.publicUrl,
          metadata: metadataData
        },
        metadata: metadataData
      };

    } catch (error) {
      console.error('Upload with metadata failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Download file with metadata lookup and access tracking
   */
  async downloadWithMetadata(
    storagePath: string,
    options: StorageQueryOptions = {}
  ): Promise<StorageOperationResult> {
    try {
      // Update last accessed if requested
      if (options.updateLastAccessed) {
        await this.updateLastAccessed(storagePath);
      }

      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('images')
        .download(storagePath);

      if (downloadError) throw downloadError;

      let metadata: DatabaseStorageMetadata | undefined;
      
      // Get metadata if requested
      if (options.includeMetadata) {
        const metadataResult = await this.getMetadata(storagePath);
        if (metadataResult.success) {
          metadata = metadataResult.metadata;
        }
      }

      return {
        success: true,
        data: fileData,
        metadata
      };

    } catch (error) {
      console.error('Download with metadata failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  /**
   * Get metadata for a storage path
   */
  async getMetadata(storagePath: string): Promise<StorageOperationResult> {
    try {
      const { data, error } = await supabase
        .from('storage_metadata')
        .select('*')
        .eq('storage_path', storagePath)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        metadata: data
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Metadata not found'
      };
    }
  }

  /**
   * List files with metadata filtering and sorting
   */
  async listWithMetadata(
    options: StorageListOptions = {}
  ): Promise<StorageOperationResult> {
    try {
      let query = supabase
        .from('storage_metadata')
        .select(`
          *,
          projects:project_id(name, slug)
        `);

      // Apply filters
      if (options.projectId) {
        query = query.eq('project_id', options.projectId);
      }

      if (options.fileType) {
        query = query.eq('file_type', options.fileType);
      }

      if (options.prefix) {
        query = query.ilike('storage_path', `${options.prefix}%`);
      }

      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, { 
          ascending: options.sortOrder !== 'desc' 
        });
      } else {
        query = query.order('upload_date', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enhance with public URLs
      const enhancedData = data?.map(item => ({
        ...item,
        publicUrl: supabase.storage
          .from('images')
          .getPublicUrl(item.storage_path).data.publicUrl
      }));

      return {
        success: true,
        data: enhancedData
      };

    } catch (error) {
      console.error('List with metadata failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'List failed'
      };
    }
  }

  /**
   * Delete file and metadata
   */
  async deleteWithMetadata(storagePath: string): Promise<StorageOperationResult> {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('storage_metadata')
        .delete()
        .eq('storage_path', storagePath);

      if (metadataError) throw metadataError;

      return {
        success: true,
        data: { deletedPath: storagePath }
      };

    } catch (error) {
      console.error('Delete with metadata failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  /**
   * Update metadata for existing file
   */
  async updateMetadata(
    storagePath: string,
    updates: {
      original_filename?: string;
      file_size?: number;
      file_type?: string;
      dimensions?: Record<string, any>;
      last_accessed?: string;
    }
  ): Promise<StorageOperationResult> {
    try {
      const { data, error } = await supabase
        .from('storage_metadata')
        .update(updates)
        .eq('storage_path', storagePath)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        metadata: data
      };

    } catch (error) {
      console.error('Update metadata failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }

  /**
   * Move file to new organized path with metadata update
   */
  async moveToOrganizedPath(
    currentPath: string,
    newProjectId?: string
  ): Promise<StorageOperationResult> {
    try {
      // Get current metadata
      const metadataResult = await this.getMetadata(currentPath);
      if (!metadataResult.success || !metadataResult.metadata) {
        throw new Error('Source file metadata not found');
      }

      const metadata = metadataResult.metadata;
      const projectId = newProjectId || metadata.project_id;

      // Generate new organized path
      const newPath = storagePathMigrationService.generateOrganizedPath(
        metadata.user_id,
        projectId,
        metadata.original_filename
      );

      if (newPath === currentPath) {
        return {
          success: true,
          data: { message: 'File already in correct location' }
        };
      }

      // Move file in storage
      const { error: moveError } = await supabase.storage
        .from('images')
        .move(currentPath, newPath);

      if (moveError) throw moveError;

      // Update metadata with new path
      const { data: updatedData, error: updateError } = await supabase
        .from('storage_metadata')
        .update({ 
          storage_path: newPath,
          project_id: projectId
        })
        .eq('storage_path', currentPath)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        data: {
          oldPath: currentPath,
          newPath,
          metadata: updatedData
        },
        metadata: updatedData
      };

    } catch (error) {
      console.error('Move to organized path failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Move failed'
      };
    }
  }

  /**
   * Bulk operations for multiple files
   */
  async bulkOperation(operation: BulkStorageOperation): Promise<StorageOperationResult> {
    try {
      const results: any[] = [];
      const errors: string[] = [];

      for (const file of operation.files) {
        try {
          let result: StorageOperationResult;

          switch (operation.operation) {
            case 'upload':
              if (!file.data) throw new Error('File data required for upload');
              result = await this.uploadWithMetadata(
                file.data as File,
                operation.metadata?.projectId || '',
                { filename: file.path }
              );
              break;

            case 'delete':
              result = await this.deleteWithMetadata(file.path);
              break;

            case 'move':
              if (!file.destinationPath) throw new Error('Destination path required for move');
              result = await this.moveToOrganizedPath(file.path);
              break;

            case 'copy':
              // Note: Supabase doesn't have a direct copy operation
              // We would need to download and re-upload
              throw new Error('Copy operation not yet implemented');

            default:
              throw new Error(`Unknown operation: ${operation.operation}`);
          }

          if (result.success) {
            results.push(result.data);
          } else {
            errors.push(`${file.path}: ${result.error}`);
          }

        } catch (error) {
          errors.push(`${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: errors.length === 0,
        data: {
          successful: results,
          failed: errors,
          totalProcessed: operation.files.length,
          successCount: results.length,
          errorCount: errors.length
        },
        error: errors.length > 0 ? `${errors.length} operations failed` : undefined
      };

    } catch (error) {
      console.error('Bulk operation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk operation failed'
      };
    }
  }

  /**
   * Get storage statistics for a project
   */
  async getProjectStorageStats(projectId: string): Promise<StorageOperationResult> {
    try {
      const { data: stats, error } = await supabase
        .from('storage_metadata')
        .select('file_size, file_type, upload_date')
        .eq('project_id', projectId);

      if (error) throw error;

      const totalFiles = stats?.length || 0;
      const totalSize = stats?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
      
      const fileTypes = stats?.reduce((acc, file) => {
        const type = file.file_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      return {
        success: true,
        data: {
          totalFiles,
          totalSize,
          averageFileSize,
          fileTypes,
          projectId
        }
      };

    } catch (error) {
      console.error('Get storage stats failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stats calculation failed'
      };
    }
  }

  /**
   * Update last accessed timestamp
   */
  private async updateLastAccessed(storagePath: string): Promise<void> {
    try {
      await supabase
        .from('storage_metadata')
        .update({ last_accessed: new Date().toISOString() })
        .eq('storage_path', storagePath);
    } catch (error) {
      // Silent fail for access tracking
      console.warn('Failed to update last accessed:', error);
    }
  }

  /**
   * Cleanup orphaned metadata (metadata without corresponding storage files)
   */
  async cleanupOrphanedMetadata(): Promise<StorageOperationResult> {
    try {
      // Get all metadata entries
      const { data: metadata, error: metadataError } = await supabase
        .from('storage_metadata')
        .select('id, storage_path');

      if (metadataError) throw metadataError;

      const orphanedIds: string[] = [];

      // Check each file's existence in storage
      for (const item of metadata || []) {
        try {
          const { error: downloadError } = await supabase.storage
            .from('images')
            .download(item.storage_path);

          if (downloadError) {
            orphanedIds.push(item.id);
          }
        } catch {
          orphanedIds.push(item.id);
        }
      }

      // Delete orphaned metadata entries
      if (orphanedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('storage_metadata')
          .delete()
          .in('id', orphanedIds);

        if (deleteError) throw deleteError;
      }

      return {
        success: true,
        data: {
          orphanedCount: orphanedIds.length,
          totalChecked: metadata?.length || 0
        }
      };

    } catch (error) {
      console.error('Cleanup orphaned metadata failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed'
      };
    }
  }
}

export const storageQueryService = StorageQueryService.getInstance();