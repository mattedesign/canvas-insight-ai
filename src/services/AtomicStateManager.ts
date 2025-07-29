/**
 * Atomic State Manager - Prevents race conditions in state updates
 * Coordinates all state changes to ensure consistency and prevent conflicts
 */

import { UXAnalysis, UploadedImage, ImageGroup, GroupAnalysisWithPrompt } from '@/types/ux-analysis';

export interface AtomicOperation {
  id: string;
  type: 'UPLOAD' | 'SYNC' | 'LOAD' | 'ANALYSIS' | 'DELETE' | 'CLEAR';
  priority: number;
  timestamp: number;
  data?: any;
}

export interface StateSnapshot {
  uploadedImages: UploadedImage[];
  analyses: UXAnalysis[];
  imageGroups: ImageGroup[];
  groupAnalysesWithPrompts: GroupAnalysisWithPrompt[];
  timestamp: number;
  operationId: string;
}

class AtomicStateManager {
  private operationQueue: AtomicOperation[] = [];
  private isProcessing = false;
  private lockMap = new Map<string, boolean>();
  private stateHistory: StateSnapshot[] = [];
  private maxHistorySize = 10;
  private retryMap = new Map<string, number>();
  private maxRetries = 3;

  // Operation coordination
  async executeOperation<T>(
    operationId: string,
    type: AtomicOperation['type'],
    operation: () => Promise<T>,
    priority: number = 5,
    dependencies: string[] = []
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const atomicOp: AtomicOperation = {
      id: operationId,
      type,
      priority,
      timestamp: Date.now(),
      data: { dependencies }
    };

    console.log(`[AtomicState] Queuing operation: ${type} (${operationId})`);
    
    // Check for conflicting operations
    if (this.hasConflictingOperation(atomicOp)) {
      console.warn(`[AtomicState] Conflicting operation detected for ${operationId}, waiting...`);
      await this.waitForConflictResolution(atomicOp);
    }

    // Add to queue with priority ordering
    this.operationQueue.push(atomicOp);
    this.operationQueue.sort((a, b) => b.priority - a.priority);

    return this.processQueue(operationId, operation);
  }

  private async processQueue<T>(
    targetOperationId: string,
    operation: () => Promise<T>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (this.isProcessing) {
      // Wait for current processing to complete
      await this.waitForProcessing();
    }

    const targetOperation = this.operationQueue.find(op => op.id === targetOperationId);
    if (!targetOperation) {
      return { success: false, error: 'Operation not found in queue' };
    }

    this.isProcessing = true;

    try {
      // Check dependencies
      if (targetOperation.data?.dependencies?.length > 0) {
        const pendingDeps = targetOperation.data.dependencies.filter((dep: string) =>
          this.operationQueue.some(op => op.id === dep)
        );
        
        if (pendingDeps.length > 0) {
          console.log(`[AtomicState] Waiting for dependencies: ${pendingDeps.join(', ')}`);
          await this.waitForDependencies(pendingDeps);
        }
      }

      // Acquire locks
      await this.acquireLocks([targetOperationId]);

      console.log(`[AtomicState] Executing operation: ${targetOperation.type} (${targetOperationId})`);
      
      const result = await operation();
      
      // Remove from queue
      this.operationQueue = this.operationQueue.filter(op => op.id !== targetOperationId);
      
      console.log(`[AtomicState] Operation completed: ${targetOperation.type} (${targetOperationId})`);
      
      return { success: true, data: result };

    } catch (error) {
      console.error(`[AtomicState] Operation failed: ${targetOperation.type} (${targetOperationId})`, error);
      
      // Retry logic
      const retryCount = this.retryMap.get(targetOperationId) || 0;
      if (retryCount < this.maxRetries) {
        console.log(`[AtomicState] Retrying operation ${targetOperationId} (attempt ${retryCount + 1})`);
        this.retryMap.set(targetOperationId, retryCount + 1);
        
        // Re-queue with lower priority
        targetOperation.priority = Math.max(1, targetOperation.priority - 1);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        
        return this.processQueue(targetOperationId, operation);
      } else {
        this.retryMap.delete(targetOperationId);
        this.operationQueue = this.operationQueue.filter(op => op.id !== targetOperationId);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }

    } finally {
      this.releaseLocks([targetOperationId]);
      this.isProcessing = false;
    }
  }

  // State snapshots for rollback
  saveStateSnapshot(state: Omit<StateSnapshot, 'timestamp' | 'operationId'>, operationId: string): void {
    const snapshot: StateSnapshot = {
      ...state,
      timestamp: Date.now(),
      operationId
    };

    this.stateHistory.push(snapshot);
    
    // Maintain history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }

    console.log(`[AtomicState] State snapshot saved for operation: ${operationId}`);
  }

  rollbackToSnapshot(operationId: string): StateSnapshot | null {
    const snapshot = this.stateHistory.find(s => s.operationId === operationId);
    if (snapshot) {
      console.log(`[AtomicState] Rolling back to snapshot: ${operationId}`);
      return snapshot;
    }
    
    console.warn(`[AtomicState] No snapshot found for operation: ${operationId}`);
    return null;
  }

  getLastSnapshot(): StateSnapshot | null {
    return this.stateHistory[this.stateHistory.length - 1] || null;
  }

  // Lock management
  private async acquireLocks(lockIds: string[]): Promise<void> {
    for (const lockId of lockIds) {
      while (this.lockMap.get(lockId)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      this.lockMap.set(lockId, true);
    }
  }

  private releaseLocks(lockIds: string[]): void {
    for (const lockId of lockIds) {
      this.lockMap.delete(lockId);
    }
  }

  // Conflict detection - improved to avoid same-type operation conflicts
  private hasConflictingOperation(operation: AtomicOperation): boolean {
    return this.operationQueue.some(op => {
      // Only same exact operation ID conflicts with itself
      if (op.id === operation.id) {
        return false; // Same operation, not a conflict
      }
      
      // CLEAR operations conflict with everything
      if (op.type === 'CLEAR' || operation.type === 'CLEAR') {
        return true;
      }
      
      // LOAD and SYNC operations on same resources can conflict, but allow multiple LOAD operations
      if ((op.type === 'LOAD' && operation.type === 'SYNC') ||
          (op.type === 'SYNC' && operation.type === 'LOAD')) {
        return true;
      }
      
      // Allow multiple operations of the same type, they will be processed in order
      return false;
    });
  }

  private async waitForConflictResolution(operation: AtomicOperation): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.hasConflictingOperation(operation)) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('Timeout waiting for conflict resolution');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async waitForProcessing(): Promise<void> {
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private async waitForDependencies(dependencies: string[]): Promise<void> {
    const maxWait = 60000; // 1 minute
    const startTime = Date.now();
    
    while (dependencies.some(dep => this.operationQueue.some(op => op.id === dep))) {
      if (Date.now() - startTime > maxWait) {
        console.warn('[AtomicState] Timeout waiting for dependencies, proceeding anyway');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Queue management
  clearQueue(): void {
    console.log('[AtomicState] Clearing operation queue');
    this.operationQueue = [];
    this.lockMap.clear();
    this.retryMap.clear();
  }

  getQueueStatus(): {
    operations: AtomicOperation[];
    isProcessing: boolean;
    activeLocks: string[];
  } {
    return {
      operations: [...this.operationQueue],
      isProcessing: this.isProcessing,
      activeLocks: Array.from(this.lockMap.keys())
    };
  }

  // Batch operations
  async executeBatch(operations: Array<{
    id: string;
    type: AtomicOperation['type'];
    operation: () => Promise<any>;
    priority?: number;
  }>): Promise<Array<{ success: boolean; data?: any; error?: string }>> {
    console.log(`[AtomicState] Executing batch of ${operations.length} operations`);
    
    // Execute all operations with dependency coordination
    const results = await Promise.allSettled(
      operations.map(op => 
        this.executeOperation(op.id, op.type, op.operation, op.priority || 5)
      )
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: result.reason?.message || 'Batch operation failed' }
    );
  }
}

export const atomicStateManager = new AtomicStateManager();