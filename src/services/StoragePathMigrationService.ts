/**
 * StoragePathMigrationService - Phase 1B: Storage Path Migration
 * Migrates existing flat storage to organized structure: userId/projectId/filename
 */

import { supabase } from "@/integrations/supabase/client";

export interface MigrationProgress {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  currentFile?: string;
  isComplete: boolean;
  errors: Array<{ file: string; error: string }>;
}

export interface OrganizedStoragePath {
  originalPath: string;
  newPath: string;
  userId: string;
  projectId: string;
  filename: string;
}

export class StoragePathMigrationService {
  private static instance: StoragePathMigrationService;
  private migrationProgress: MigrationProgress = {
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    isComplete: false,
    errors: []
  };

  static getInstance(): StoragePathMigrationService {
    if (!StoragePathMigrationService.instance) {
      StoragePathMigrationService.instance = new StoragePathMigrationService();
    }
    return StoragePathMigrationService.instance;
  }

  /**
   * Generates organized storage path: userId/projectId/filename
   */
  generateOrganizedPath(userId: string, projectId: string, filename: string): string {
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${userId}/${projectId}/${sanitizedFilename}`;
  }

  /**
   * Analyzes current storage structure and plans migration
   */
  async analyzeStorageStructure(): Promise<{
    totalImages: number;
    flatStorageImages: number;
    organizedImages: number;
    migrationNeeded: OrganizedStoragePath[];
  }> {
    try {
      // Get all images from database
      const { data: images, error } = await supabase
        .from('images')
        .select(`
          id,
          storage_path,
          filename,
          project_id,
          projects!inner(user_id)
        `);

      if (error) throw error;

      const migrationNeeded: OrganizedStoragePath[] = [];
      let flatStorageImages = 0;
      let organizedImages = 0;

      for (const image of images || []) {
        const userId = (image.projects as any).user_id;
        const expectedPath = this.generateOrganizedPath(
          userId,
          image.project_id,
          image.filename
        );

        if (image.storage_path === expectedPath) {
          organizedImages++;
        } else {
          flatStorageImages++;
          migrationNeeded.push({
            originalPath: image.storage_path,
            newPath: expectedPath,
            userId,
            projectId: image.project_id,
            filename: image.filename
          });
        }
      }

      return {
        totalImages: images?.length || 0,
        flatStorageImages,
        organizedImages,
        migrationNeeded
      };

    } catch (error) {
      console.error('Failed to analyze storage structure:', error);
      throw error;
    }
  }

  /**
   * Performs zero-downtime migration of storage paths
   */
  async migrateStoragePaths(
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationProgress> {
    try {
      const analysis = await this.analyzeStorageStructure();
      
      this.migrationProgress = {
        totalFiles: analysis.migrationNeeded.length,
        processedFiles: 0,
        failedFiles: 0,
        isComplete: false,
        errors: []
      };

      if (analysis.migrationNeeded.length === 0) {
        this.migrationProgress.isComplete = true;
        onProgress?.(this.migrationProgress);
        return this.migrationProgress;
      }

      // Process migrations in batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = this.chunkArray(analysis.migrationNeeded, batchSize);

      for (const batch of batches) {
        await Promise.all(
          batch.map(async (migration) => {
            try {
              await this.migrateSingleFile(migration);
              this.migrationProgress.processedFiles++;
              this.migrationProgress.currentFile = migration.filename;
            } catch (error) {
              this.migrationProgress.failedFiles++;
              this.migrationProgress.errors.push({
                file: migration.filename,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          })
        );
        
        onProgress?.(this.migrationProgress);
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.migrationProgress.isComplete = true;
      this.migrationProgress.currentFile = undefined;
      
      onProgress?.(this.migrationProgress);
      return this.migrationProgress;

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrates a single file to new organized path
   */
  private async migrateSingleFile(migration: OrganizedStoragePath): Promise<void> {
    try {
      // Copy file to new location
      const { error: copyError } = await supabase.storage
        .from('images')
        .copy(migration.originalPath, migration.newPath);

      if (copyError) throw copyError;

      // Update database with new path
      const { error: updateError } = await supabase
        .from('images')
        .update({ storage_path: migration.newPath })
        .eq('storage_path', migration.originalPath);

      if (updateError) throw updateError;

      // Create storage_metadata entry
      await this.createStorageMetadata(migration);

      // Remove old file (only after successful copy and DB update)
      const { error: deleteError } = await supabase.storage
        .from('images')
        .remove([migration.originalPath]);

      if (deleteError) {
        console.warn(`Failed to delete original file ${migration.originalPath}:`, deleteError);
        // Don't throw here - the migration succeeded, cleanup failed
      }

    } catch (error) {
      console.error(`Failed to migrate file ${migration.filename}:`, error);
      throw error;
    }
  }

  /**
   * Creates storage_metadata entry for migrated file
   */
  private async createStorageMetadata(migration: OrganizedStoragePath): Promise<void> {
    try {
      // Get file info from storage
      const { data: fileData } = await supabase.storage
        .from('images')
        .download(migration.newPath);

      if (!fileData) throw new Error('File not found after migration');

      // Get image info from database
      const { data: imageData, error } = await supabase
        .from('images')
        .select('file_size, file_type, dimensions')
        .eq('storage_path', migration.newPath)
        .single();

      if (error) throw error;

      // Create storage_metadata entry
      const { error: metadataError } = await supabase
        .from('storage_metadata')
        .insert({
          user_id: migration.userId,
          project_id: migration.projectId,
          original_filename: migration.filename,
          storage_path: migration.newPath,
          file_size: imageData.file_size,
          file_type: imageData.file_type,
          dimensions: imageData.dimensions
        });

      if (metadataError) throw metadataError;

    } catch (error) {
      console.error('Failed to create storage metadata:', error);
      throw error;
    }
  }

  /**
   * Verifies migration integrity
   */
  async verifyMigrationIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    statistics: {
      totalFiles: number;
      accessibleFiles: number;
      inaccessibleFiles: number;
      metadataEntries: number;
    };
  }> {
    try {
      const issues: string[] = [];
      
      // Get all images after migration
      const { data: images, error } = await supabase
        .from('images')
        .select('*');

      if (error) throw error;

      let accessibleFiles = 0;
      let inaccessibleFiles = 0;

      // Check each file accessibility
      for (const image of images || []) {
        try {
          const { error: downloadError } = await supabase.storage
            .from('images')
            .download(image.storage_path);

          if (downloadError) {
            inaccessibleFiles++;
            issues.push(`File not accessible: ${image.storage_path}`);
          } else {
            accessibleFiles++;
          }
        } catch {
          inaccessibleFiles++;
          issues.push(`File not accessible: ${image.storage_path}`);
        }
      }

      // Check metadata entries
      const { data: metadata, error: metadataError } = await supabase
        .from('storage_metadata')
        .select('id');

      if (metadataError) throw metadataError;

      return {
        isValid: issues.length === 0,
        issues,
        statistics: {
          totalFiles: images?.length || 0,
          accessibleFiles,
          inaccessibleFiles,
          metadataEntries: metadata?.length || 0
        }
      };

    } catch (error) {
      console.error('Failed to verify migration integrity:', error);
      throw error;
    }
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get current migration progress
   */
  getMigrationProgress(): MigrationProgress {
    return { ...this.migrationProgress };
  }

  /**
   * Reset migration progress
   */
  resetProgress(): void {
    this.migrationProgress = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      isComplete: false,
      errors: []
    };
  }
}

export const storagePathMigrationService = StoragePathMigrationService.getInstance();