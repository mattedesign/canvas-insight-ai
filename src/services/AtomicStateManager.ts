/**
 * AtomicStateManager - Phase 2, Step 2.1: Atomic State Operations
 * Provides conflict-free state updates to prevent circular dependencies
 */

import { validateState } from '@/utils/stateValidation';

interface StateOperation {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

interface StateSnapshot {
  id: string;
  state: any;
  timestamp: number;
  operation: string;
}

interface AtomicConfig {
  enableValidation: boolean;
  enableRollback: boolean;
  enableDebug: boolean;
  maxRetries: number;
  snapshotLimit: number;
}

export class AtomicStateManager {
  private operationQueue: StateOperation[] = [];
  private stateSnapshots: StateSnapshot[] = [];
  private isProcessing = false;
  private lastValidState: any = null;
  private config: AtomicConfig;

  constructor(config: Partial<AtomicConfig> = {}) {
    this.config = {
      enableValidation: true,
      enableRollback: true,
      enableDebug: process.env.NODE_ENV === 'development',
      maxRetries: 3,
      snapshotLimit: 10,
      ...config
    };

    this.debugLog('AtomicStateManager initialized', { config: this.config });
  }

  /**
   * Execute atomic state operation - all-or-nothing
   */
  async executeAtomicOperation<T>(
    currentState: T,
    operation: string,
    updateFn: (state: T) => T,
    validationContext?: string
  ): Promise<{ success: boolean; newState?: T; error?: string; rollbackTriggered?: boolean }> {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.debugLog(`[${operationId}] Starting atomic operation: ${operation}`);
    
    try {
      // Phase 1: Create state snapshot for rollback
      if (this.config.enableRollback) {
        this.createStateSnapshot(currentState, operation);
      }

      // Phase 2: Validate current state before operation
      if (this.config.enableValidation) {
        const validation = validateState(currentState, `${operation}:before`);
        if (!validation.isValid) {
          throw new Error(`Pre-operation validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Phase 3: Execute the state update
      const newState = updateFn(currentState);

      // Phase 4: Validate new state after operation
      if (this.config.enableValidation) {
        const validation = validateState(newState, `${operation}:after`);
        if (!validation.isValid) {
          this.debugLog(`[${operationId}] Post-operation validation failed`, validation.errors);
          
          // Attempt rollback
          if (this.config.enableRollback) {
            const rollbackState = this.performRollback();
            if (rollbackState) {
              this.debugLog(`[${operationId}] Rollback successful`);
              return { 
                success: false, 
                error: `Operation failed validation, rolled back: ${validation.errors.join(', ')}`,
                rollbackTriggered: true,
                newState: rollbackState
              };
            }
          }
          
          throw new Error(`Post-operation validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Phase 5: Check for circular dependencies
      if (this.detectCircularDependency(currentState, newState)) {
        throw new Error('Circular dependency detected in state update');
      }

      // Phase 6: Operation successful
      this.lastValidState = newState;
      this.debugLog(`[${operationId}] Atomic operation completed successfully`);
      
      return { success: true, newState };

    } catch (error) {
      this.debugLog(`[${operationId}] Atomic operation failed:`, error);
      
      // Attempt rollback on failure
      if (this.config.enableRollback) {
        const rollbackState = this.performRollback();
        if (rollbackState) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : String(error),
            rollbackTriggered: true,
            newState: rollbackState
          };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Queue state operation for batch processing
   */
  queueOperation(operation: StateOperation): void {
    this.operationQueue.push(operation);
    this.debugLog('Operation queued', { operation: operation.type, queueLength: this.operationQueue.length });
    
    // Auto-process if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queued operations in batch to prevent conflicts
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.debugLog('Processing operation queue', { queueLength: this.operationQueue.length });

    try {
      while (this.operationQueue.length > 0) {
        const operation = this.operationQueue.shift()!;
        
        // Process operation with conflict detection
        await this.processOperation(operation);
        
        // Small delay to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (error) {
      this.debugLog('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual operation with conflict detection
   */
  private async processOperation(operation: StateOperation): Promise<void> {
    try {
      this.debugLog(`Processing operation: ${operation.type}`, operation);
      
      // Operation processing would happen here
      // This is a framework for batch processing
      
    } catch (error) {
      operation.retries++;
      
      if (operation.retries < this.config.maxRetries) {
        this.debugLog(`Operation ${operation.type} failed, retrying (${operation.retries}/${this.config.maxRetries})`);
        this.operationQueue.unshift(operation); // Re-queue for retry
      } else {
        this.debugLog(`Operation ${operation.type} failed after max retries`, error);
      }
    }
  }

  /**
   * Create state snapshot for rollback capability
   */
  private createStateSnapshot(state: any, operation: string): void {
    const snapshot: StateSnapshot = {
      id: `snapshot-${Date.now()}`,
      state: JSON.parse(JSON.stringify(state)), // Deep copy
      timestamp: Date.now(),
      operation
    };

    this.stateSnapshots.push(snapshot);

    // Limit snapshots to prevent memory issues
    if (this.stateSnapshots.length > this.config.snapshotLimit) {
      this.stateSnapshots.shift();
    }

    this.debugLog('State snapshot created', { snapshotId: snapshot.id, operation });
  }

  /**
   * Perform rollback to last valid state
   */
  private performRollback(): any | null {
    if (this.stateSnapshots.length === 0) {
      this.debugLog('No snapshots available for rollback');
      return null;
    }

    const lastSnapshot = this.stateSnapshots[this.stateSnapshots.length - 1];
    this.debugLog('Performing rollback', { snapshotId: lastSnapshot.id, operation: lastSnapshot.operation });
    
    return lastSnapshot.state;
  }

  /**
   * Detect circular dependencies in state updates
   */
  private detectCircularDependency(oldState: any, newState: any): boolean {
    try {
      // Simple circular dependency detection
      // Check if the state update creates a circular reference
      JSON.stringify(newState);
      
      // Additional check: compare state complexity
      const oldKeys = this.getObjectKeys(oldState);
      const newKeys = this.getObjectKeys(newState);
      
      // If new state has significantly more keys, might indicate circular refs
      if (newKeys.length > oldKeys.length * 2) {
        this.debugLog('Potential circular dependency: state complexity increased dramatically');
        return true;
      }
      
      return false;
    } catch (error) {
      // JSON.stringify fails on circular references
      this.debugLog('Circular dependency detected via JSON.stringify failure');
      return true;
    }
  }

  /**
   * Get all object keys recursively (for complexity analysis)
   */
  private getObjectKeys(obj: any, visited = new Set()): string[] {
    if (!obj || typeof obj !== 'object' || visited.has(obj)) {
      return [];
    }
    
    visited.add(obj);
    const keys: string[] = [];
    
    try {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          keys.push(key);
          if (typeof obj[key] === 'object') {
            keys.push(...this.getObjectKeys(obj[key], visited));
          }
        }
      }
    } catch (error) {
      // Handle potential issues with property access
    }
    
    return keys;
  }

  /**
   * Get current queue status for debugging
   */
  getQueueStatus(): { queueLength: number; isProcessing: boolean; snapshotsCount: number } {
    return {
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      snapshotsCount: this.stateSnapshots.length
    };
  }

  /**
   * Clear all snapshots (for memory management)
   */
  clearSnapshots(): void {
    this.stateSnapshots = [];
    this.debugLog('State snapshots cleared');
  }

  /**
   * Get last valid state for emergency recovery
   */
  getLastValidState(): any | null {
    return this.lastValidState;
  }

  /**
   * Debug logging utility
   */
  private debugLog(message: string, data?: any): void {
    if (this.config.enableDebug) {
      console.log(`[AtomicStateManager] ${message}`, data || '');
    }
  }

  /**
   * Enable/disable debugging at runtime
   */
  setDebugMode(enabled: boolean): void {
    this.config.enableDebug = enabled;
    this.debugLog(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}