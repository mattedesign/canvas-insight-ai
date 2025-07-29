/**
 * Background Sync Service - Handles asynchronous data synchronization
 * Prevents race conditions and ensures data consistency during background operations
 */

import { UXAnalysis, UploadedImage } from '@/types/ux-analysis';
import { DataMigrationService } from './DataMigrationService';
import { AnalysisPerformanceService } from './AnalysisPerformanceService';
import { atomicStateManager } from './AtomicStateManager';
import { supabase } from '@/integrations/supabase/client';

export interface SyncOperation {
  id: string;
  type: 'IMAGE_UPLOAD' | 'ANALYSIS_GENERATION' | 'METADATA_EXTRACTION' | 'FULL_SYNC';
  imageId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  data: any;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface SyncResult {
  operationId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

class BackgroundSyncService {
  private syncQueue = new Map<string, SyncOperation>();
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;
  private readonly PROCESS_INTERVAL = 2000; // 2 seconds
  private readonly MAX_CONCURRENT = 3;
  private activeSyncs = new Set<string>();

  // Event handlers
  private onSyncUpdate?: (operation: SyncOperation) => void;
  private onSyncComplete?: (result: SyncResult) => void;
  private onSyncError?: (operationId: string, error: string) => void;

  constructor() {
    this.startProcessing();
  }

  // Public API
  setEventHandlers(handlers: {
    onSyncUpdate?: (operation: SyncOperation) => void;
    onSyncComplete?: (result: SyncResult) => void;
    onSyncError?: (operationId: string, error: string) => void;
  }): void {
    this.onSyncUpdate = handlers.onSyncUpdate;
    this.onSyncComplete = handlers.onSyncComplete;
    this.onSyncError = handlers.onSyncError;
  }

  // Queue background image processing
  async queueImageProcessing(
    imageId: string,
    imageUrl: string,
    imageName: string,
    userContext: string = ''
  ): Promise<string> {
    const operationId = `img-${imageId}-${Date.now()}`;
    
    const operation: SyncOperation = {
      id: operationId,
      type: 'IMAGE_UPLOAD',
      imageId,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      data: { imageUrl, imageName, userContext },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.syncQueue.set(operationId, operation);
    console.log(`[BackgroundSync] Queued image processing: ${operationId}`);
    
    this.onSyncUpdate?.(operation);
    return operationId;
  }

  // Queue analysis generation
  async queueAnalysisGeneration(
    imageId: string,
    imageUrl: string,
    imageName: string,
    userContext: string = ''
  ): Promise<string> {
    const operationId = `analysis-${imageId}-${Date.now()}`;
    
    const operation: SyncOperation = {
      id: operationId,
      type: 'ANALYSIS_GENERATION',
      imageId,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      data: { imageUrl, imageName, userContext },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.syncQueue.set(operationId, operation);
    console.log(`[BackgroundSync] Queued analysis generation: ${operationId}`);
    
    this.onSyncUpdate?.(operation);
    return operationId;
  }

  // Queue metadata extraction
  async queueMetadataExtraction(imageId: string, file: File): Promise<string> {
    const operationId = `metadata-${imageId}-${Date.now()}`;
    
    const operation: SyncOperation = {
      id: operationId,
      type: 'METADATA_EXTRACTION',
      imageId,
      status: 'pending',
      attempts: 0,
      maxAttempts: 2,
      data: { file },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.syncQueue.set(operationId, operation);
    console.log(`[BackgroundSync] Queued metadata extraction: ${operationId}`);
    
    this.onSyncUpdate?.(operation);
    return operationId;
  }

  // Queue full data sync
  async queueFullSync(data: {
    uploadedImages: UploadedImage[];
    analyses: UXAnalysis[];
    imageGroups: any[];
    groupAnalysesWithPrompts: any[];
  }): Promise<string> {
    const operationId = `full-sync-${Date.now()}`;
    
    const operation: SyncOperation = {
      id: operationId,
      type: 'FULL_SYNC',
      imageId: 'all',
      status: 'pending',
      attempts: 0,
      maxAttempts: 2,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.syncQueue.set(operationId, operation);
    console.log(`[BackgroundSync] Queued full sync: ${operationId}`);
    
    this.onSyncUpdate?.(operation);
    return operationId;
  }

  // Get sync status
  getSyncStatus(): {
    pending: number;
    processing: number;
    failed: number;
    operations: SyncOperation[];
  } {
    const operations = Array.from(this.syncQueue.values());
    
    return {
      pending: operations.filter(op => op.status === 'pending').length,
      processing: operations.filter(op => op.status === 'processing').length,
      failed: operations.filter(op => op.status === 'failed').length,
      operations
    };
  }

  // Cancel operation
  cancelOperation(operationId: string): boolean {
    const operation = this.syncQueue.get(operationId);
    if (operation && operation.status === 'pending') {
      this.syncQueue.delete(operationId);
      console.log(`[BackgroundSync] Cancelled operation: ${operationId}`);
      return true;
    }
    return false;
  }

  // Retry failed operation
  retryOperation(operationId: string): boolean {
    const operation = this.syncQueue.get(operationId);
    if (operation && operation.status === 'failed') {
      operation.status = 'pending';
      operation.attempts = 0;
      operation.updatedAt = Date.now();
      operation.error = undefined;
      
      console.log(`[BackgroundSync] Retrying operation: ${operationId}`);
      this.onSyncUpdate?.(operation);
      return true;
    }
    return false;
  }

  // Clear completed operations
  clearCompleted(): void {
    const completed = Array.from(this.syncQueue.entries())
      .filter(([_, op]) => op.status === 'completed')
      .map(([id, _]) => id);
    
    completed.forEach(id => this.syncQueue.delete(id));
    console.log(`[BackgroundSync] Cleared ${completed.length} completed operations`);
  }

  // Private processing methods
  private startProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
    
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL);
    
    console.log('[BackgroundSync] Started background processing');
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeSyncs.size >= this.MAX_CONCURRENT) {
      return;
    }

    const pendingOps = Array.from(this.syncQueue.values())
      .filter(op => op.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt);

    if (pendingOps.length === 0) {
      return;
    }

    // Process operations up to the concurrent limit
    const toProcess = pendingOps.slice(0, this.MAX_CONCURRENT - this.activeSyncs.size);
    
    await Promise.all(
      toProcess.map(operation => this.processOperation(operation))
    );
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    if (this.activeSyncs.has(operation.id)) {
      return; // Already processing
    }

    this.activeSyncs.add(operation.id);
    operation.status = 'processing';
    operation.attempts++;
    operation.updatedAt = Date.now();
    
    console.log(`[BackgroundSync] Processing operation: ${operation.id} (attempt ${operation.attempts})`);
    this.onSyncUpdate?.(operation);

    const startTime = Date.now();

    try {
      let result: any;

      // Use atomic state manager for coordination
      const atomicResult = await atomicStateManager.executeOperation(
        operation.id,
        'SYNC',
        async () => {
          switch (operation.type) {
            case 'IMAGE_UPLOAD':
              return await this.processImageUpload(operation);
            
            case 'ANALYSIS_GENERATION':
              return await this.processAnalysisGeneration(operation);
            
            case 'METADATA_EXTRACTION':
              return await this.processMetadataExtraction(operation);
            
            case 'FULL_SYNC':
              return await this.processFullSync(operation);
            
            default:
              throw new Error(`Unknown operation type: ${operation.type}`);
          }
        },
        7 // High priority for sync operations
      );

      if (atomicResult.success) {
        result = atomicResult.data;
        operation.status = 'completed';
        operation.updatedAt = Date.now();
        
        const syncResult: SyncResult = {
          operationId: operation.id,
          success: true,
          data: result,
          duration: Date.now() - startTime
        };
        
        console.log(`[BackgroundSync] Operation completed: ${operation.id} (${syncResult.duration}ms)`);
        this.onSyncComplete?.(syncResult);
        
        // Keep completed operations for a short time for reference
        setTimeout(() => {
          this.syncQueue.delete(operation.id);
        }, 30000); // 30 seconds

      } else {
        throw new Error(atomicResult.error || 'Operation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BackgroundSync] Operation failed: ${operation.id}`, error);
      
      operation.error = errorMessage;
      operation.updatedAt = Date.now();

      if (operation.attempts >= operation.maxAttempts) {
        operation.status = 'failed';
        console.error(`[BackgroundSync] Operation failed permanently: ${operation.id}`);
        
        this.onSyncError?.(operation.id, errorMessage);
      } else {
        operation.status = 'retrying';
        console.log(`[BackgroundSync] Will retry operation: ${operation.id} (attempt ${operation.attempts}/${operation.maxAttempts})`);
        
        // Schedule retry with exponential backoff
        setTimeout(() => {
          if (this.syncQueue.has(operation.id)) {
            operation.status = 'pending';
            this.onSyncUpdate?.(operation);
          }
        }, Math.pow(2, operation.attempts) * 1000);
      }

      const syncResult: SyncResult = {
        operationId: operation.id,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
      
      this.onSyncComplete?.(syncResult);
    } finally {
      this.activeSyncs.delete(operation.id);
      this.onSyncUpdate?.(operation);
    }
  }

  private async processImageUpload(operation: SyncOperation): Promise<any> {
    const { imageUrl, imageName } = operation.data;
    
    // This would typically handle uploading to storage
    // For now, we'll just validate the operation
    console.log(`Processing image upload for: ${imageName}`);
    
    return { imageId: operation.imageId, processed: true };
  }

  private async processAnalysisGeneration(operation: SyncOperation): Promise<UXAnalysis> {
    const { imageUrl, imageName, userContext } = operation.data;
    
    console.log(`Generating analysis for: ${imageName}`);
    
    const result = await AnalysisPerformanceService.performAnalysisWithRetry(
      operation.imageId,
      imageUrl,
      imageName,
      userContext
    );

    if (!result.success || !result.analysis) {
      throw new Error(result.error || 'Analysis generation failed');
    }

    return result.analysis;
  }

  private async processMetadataExtraction(operation: SyncOperation): Promise<any> {
    const { file } = operation.data;
    
    console.log(`Extracting metadata for: ${file.name}`);
    
    // Extract basic metadata from file
    const metadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };

    // Additional processing could be done here
    return metadata;
  }

  private async processFullSync(operation: SyncOperation): Promise<any> {
    console.log('Processing full data sync');
    
    const result = await DataMigrationService.migrateAllToDatabase(operation.data);
    
    if (!result.success) {
      throw new Error('Full sync failed');
    }

    return result.data;
  }

  // Cleanup
  destroy(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    
    this.syncQueue.clear();
    this.activeSyncs.clear();
    console.log('[BackgroundSync] Service destroyed');
  }
}

export const backgroundSyncService = new BackgroundSyncService();
