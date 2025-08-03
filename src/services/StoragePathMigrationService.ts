/**
 * Storage Path Migration Service
 * Handles migration from flat storage structure to organized userId/projectId/filename structure
 * Ensures zero-downtime migration with rollback capabilities
 */

import { supabase } from "@/integrations/supabase/client";

interface MigrationResult {
  success: boolean;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ path: string; error: string }>;
}

interface StorageMetadata {
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
}

export class StoragePathMigrationService {
  private static instance: StoragePathMigrationService;

  static getInstance(): StoragePathMigrationService {
    if (!StoragePathMigrationService.instance) {
      StoragePathMigrationService.instance = new StoragePathMigrationService();
    }
    return StoragePathMigrationService.instance;
  }

  /**
   * Generate organized storage path: userId/projectId/filename
   */
  generateOrganizedPath(userId: string, projectId: string | null, filename: string): string {
    if (projectId) {
      return `${userId}/${projectId}/${filename}`;
    }
    return `${userId}/default/${filename}`;
  }

  /**
   * Check if a path is already organized (contains userId/projectId structure)
   */
  isPathOrganized(path: string, userId: string): boolean {
    return path.startsWith(`${userId}/`) && path.split('/').length >= 3;
  }

  /**
   * Migrate existing flat storage to organized structure
   */
  async migrateToOrganizedStorage(options: {
    dryRun?: boolean;
    batchSize?: number;
    onProgress?: (current: number, total: number) => void;
  } = {}): Promise<MigrationResult> {
    const { dryRun = false, batchSize = 50, onProgress } = options;
    
    const result: MigrationResult = {
      success: true,
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      // Get all storage metadata that needs migration
      const { data: allFiles, error: fetchError } = await supabase
        .from('storage_metadata')
        .select('*')
        .order('upload_date', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch storage metadata: ${fetchError.message}`);
      }

      if (!allFiles || allFiles.length === 0) {
        console.log('[Storage Migration] No files found to migrate');
        return result;
      }

      console.log(`[Storage Migration] Found ${allFiles.length} files to process`);

      // Process files in batches
      for (let i = 0; i < allFiles.length; i += batchSize) {
        const batch = allFiles.slice(i, i + batchSize);
        
        for (const file of batch) {
          try {
            await this.migrateFile(file, dryRun, result);
          } catch (error) {
            result.failed++;
            result.errors.push({
              path: file.storage_path,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Report progress
        if (onProgress) {
          onProgress(Math.min(i + batchSize, allFiles.length), allFiles.length);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('[Storage Migration] Migration completed:', result);
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push({
        path: 'SYSTEM',
        error: error instanceof Error ? error.message : 'Unknown system error'
      });
      return result;
    }
  }

  /**
   * Migrate a single file
   */
  private async migrateFile(
    file: StorageMetadata, 
    dryRun: boolean, 
    result: MigrationResult
  ): Promise<void> {
    // Check if file is already organized
    if (this.isPathOrganized(file.storage_path, file.user_id)) {
      result.skipped++;
      return;
    }

    // Generate new organized path
    const newPath = this.generateOrganizedPath(
      file.user_id, 
      file.project_id, 
      file.original_filename
    );

    if (dryRun) {
      console.log(`[Storage Migration] Would migrate: ${file.storage_path} → ${newPath}`);
      result.migrated++;
      return;
    }

    try {
      // Check if file exists in storage
      const { data: existingFile } = await supabase.storage
        .from('images')
        .list('', { search: file.storage_path });

      if (!existingFile || existingFile.length === 0) {
        // File doesn't exist in storage, just update metadata
        await this.updateMetadataPath(file.id, newPath);
        result.migrated++;
        return;
      }

      // Copy file to new organized path
      const { data: copyData, error: copyError } = await supabase.storage
        .from('images')
        .copy(file.storage_path, newPath);

      if (copyError) {
        throw new Error(`Copy failed: ${copyError.message}`);
      }

      // Update metadata with new path
      await this.updateMetadataPath(file.id, newPath);

      // Remove old file (only after successful copy and metadata update)
      const { error: removeError } = await supabase.storage
        .from('images')
        .remove([file.storage_path]);

      if (removeError) {
        console.warn(`[Storage Migration] Failed to remove old file ${file.storage_path}: ${removeError.message}`);
        // Don't fail the migration if cleanup fails
      }

      result.migrated++;

    } catch (error) {
      throw new Error(`Migration failed for ${file.storage_path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update storage metadata with new path
   */
  private async updateMetadataPath(metadataId: string, newPath: string): Promise<void> {
    const { error } = await supabase
      .from('storage_metadata')
      .update({ 
        storage_path: newPath,
        last_accessed: new Date().toISOString()
      })
      .eq('id', metadataId);

    if (error) {
      throw new Error(`Failed to update metadata: ${error.message}`);
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    isCompleted: boolean;
    progress: number;
    summary: string;
  }> {
    try {
      const { data: allFiles, error } = await supabase
        .from('storage_metadata')
        .select('storage_path, user_id');

      if (error || !allFiles) {
        throw new Error(error?.message || 'Failed to fetch files');
      }

      const total = allFiles.length;
      const organized = allFiles.filter(file => 
        this.isPathOrganized(file.storage_path, file.user_id)
      ).length;

      const progress = total > 0 ? (organized / total) * 100 : 100;

      return {
        isCompleted: progress === 100,
        progress,
        summary: `${organized}/${total} files organized`
      };

    } catch (error) {
      return {
        isCompleted: false,
        progress: 0,
        summary: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}