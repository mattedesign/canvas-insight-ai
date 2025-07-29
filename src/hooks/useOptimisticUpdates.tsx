/**
 * Optimistic Updates Manager
 * Provides immediate UI feedback with rollback capabilities
 */

import { useState, useCallback, useRef } from 'react';
import { useFilteredToast } from './use-filtered-toast';
import type { UploadedImage, UXAnalysis, ImageGroup } from '@/types/ux-analysis';

interface OptimisticOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'image' | 'analysis' | 'group';
  optimisticData: any;
  originalData?: any;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  retryCount: number;
}

interface OptimisticConfig {
  maxRetries: number;
  retryDelay: number;
  confirmationTimeout: number;
}

const DEFAULT_CONFIG: OptimisticConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  confirmationTimeout: 10000
};

export const useOptimisticUpdates = (config: Partial<OptimisticConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { toast } = useFilteredToast();
  
  const [operations, setOperations] = useState<Map<string, OptimisticOperation>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Clear operation timeout
  const clearOperationTimeout = useCallback((operationId: string) => {
    const timeout = timeoutRefs.current.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(operationId);
    }
  }, []);

  // Set operation timeout for automatic failure handling
  const setOperationTimeout = useCallback((operationId: string) => {
    const timeout = setTimeout(() => {
      setOperations(prev => {
        const newOps = new Map(prev);
        const operation = newOps.get(operationId);
        if (operation && operation.status === 'pending') {
          operation.status = 'failed';
          console.warn(`[OptimisticUpdates] Operation ${operationId} timed out`);
        }
        return newOps;
      });
      timeoutRefs.current.delete(operationId);
    }, finalConfig.confirmationTimeout);

    timeoutRefs.current.set(operationId, timeout);
  }, [finalConfig.confirmationTimeout]);

  // Create optimistic operation
  const createOptimisticOperation = useCallback((
    type: 'create' | 'update' | 'delete',
    entity: 'image' | 'analysis' | 'group',
    optimisticData: any,
    originalData?: any
  ): string => {
    const operationId = generateOperationId();
    
    const operation: OptimisticOperation = {
      id: operationId,
      type,
      entity,
      optimisticData,
      originalData,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    setOperations(prev => new Map(prev).set(operationId, operation));
    setOperationTimeout(operationId);

    console.log(`[OptimisticUpdates] Created ${type} operation for ${entity}:`, operationId);
    return operationId;
  }, [generateOperationId, setOperationTimeout]);

  // Confirm operation success
  const confirmOperation = useCallback((operationId: string, confirmedData?: any) => {
    setOperations(prev => {
      const newOps = new Map(prev);
      const operation = newOps.get(operationId);
      
      if (operation) {
        operation.status = 'confirmed';
        if (confirmedData) {
          operation.optimisticData = confirmedData;
        }
        
        clearOperationTimeout(operationId);
        console.log(`[OptimisticUpdates] Confirmed operation:`, operationId);
        
        // Clean up confirmed operation after a delay
        setTimeout(() => {
          setOperations(current => {
            const cleaned = new Map(current);
            cleaned.delete(operationId);
            return cleaned;
          });
        }, 5000);
      }
      
      return newOps;
    });
  }, [clearOperationTimeout]);

  // Fail operation and potentially rollback
  const failOperation = useCallback((operationId: string, error: string, shouldRollback = true) => {
    setOperations(prev => {
      const newOps = new Map(prev);
      const operation = newOps.get(operationId);
      
      if (operation) {
        operation.status = 'failed';
        operation.retryCount++;
        
        clearOperationTimeout(operationId);
        
        console.error(`[OptimisticUpdates] Operation failed:`, operationId, error);
        
        if (shouldRollback && operation.originalData) {
          toast({
            title: "Operation failed",
            description: `${operation.type} ${operation.entity} failed. Changes have been reverted.`,
            category: "error",
            variant: "destructive"
          });
        }
        
        // Clean up failed operation
        setTimeout(() => {
          setOperations(current => {
            const cleaned = new Map(current);
            cleaned.delete(operationId);
            return cleaned;
          });
        }, 3000);
      }
      
      return newOps;
    });

    return shouldRollback;
  }, [clearOperationTimeout, toast]);

  // Retry failed operation
  const retryOperation = useCallback(async (
    operationId: string, 
    retryFunction: () => Promise<boolean>
  ) => {
    const operation = operations.get(operationId);
    if (!operation || operation.retryCount >= finalConfig.maxRetries) {
      return false;
    }

    console.log(`[OptimisticUpdates] Retrying operation ${operationId}, attempt ${operation.retryCount + 1}`);

    // Wait for retry delay
    await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay * operation.retryCount));

    try {
      const success = await retryFunction();
      
      if (success) {
        confirmOperation(operationId);
        return true;
      } else {
        failOperation(operationId, 'Retry failed', false);
        return false;
      }
    } catch (error) {
      failOperation(operationId, error instanceof Error ? error.message : 'Retry error', false);
      return false;
    }
  }, [operations, finalConfig.maxRetries, finalConfig.retryDelay, confirmOperation, failOperation]);

  // Optimistic image upload
  const optimisticImageUpload = useCallback((
    file: File,
    uploadFunction: (file: File) => Promise<UploadedImage>
  ): { tempImage: UploadedImage; operationId: string; confirm: () => Promise<boolean> } => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempUrl = URL.createObjectURL(file);
    
    const tempImage: UploadedImage = {
      id: tempId,
      name: file.name,
      url: tempUrl,
      file,
      dimensions: { width: 0, height: 0 },
      status: 'processing'
    };

    const operationId = createOptimisticOperation('create', 'image', tempImage);

    const confirm = async (): Promise<boolean> => {
      try {
        const confirmedImage = await uploadFunction(file);
        confirmOperation(operationId, confirmedImage);
        
        // Clean up blob URL
        URL.revokeObjectURL(tempUrl);
        
        return true;
      } catch (error) {
        failOperation(operationId, error instanceof Error ? error.message : 'Upload failed');
        URL.revokeObjectURL(tempUrl);
        return false;
      }
    };

    return { tempImage, operationId, confirm };
  }, [createOptimisticOperation, confirmOperation, failOperation]);

  // Optimistic analysis update
  const optimisticAnalysisUpdate = useCallback((
    originalAnalysis: UXAnalysis,
    updates: Partial<UXAnalysis>,
    updateFunction: (analysis: UXAnalysis) => Promise<UXAnalysis>
  ): { updatedAnalysis: UXAnalysis; operationId: string; confirm: () => Promise<boolean> } => {
    const updatedAnalysis = { ...originalAnalysis, ...updates };
    const operationId = createOptimisticOperation('update', 'analysis', updatedAnalysis, originalAnalysis);

    const confirm = async (): Promise<boolean> => {
      try {
        const confirmedAnalysis = await updateFunction(updatedAnalysis);
        confirmOperation(operationId, confirmedAnalysis);
        return true;
      } catch (error) {
        failOperation(operationId, error instanceof Error ? error.message : 'Update failed');
        return false;
      }
    };

    return { updatedAnalysis, operationId, confirm };
  }, [createOptimisticOperation, confirmOperation, failOperation]);

  // Optimistic group creation
  const optimisticGroupCreate = useCallback((
    groupData: Omit<ImageGroup, 'id' | 'createdAt'>,
    createFunction: (group: ImageGroup) => Promise<ImageGroup>
  ): { tempGroup: ImageGroup; operationId: string; confirm: () => Promise<boolean> } => {
    const tempGroup: ImageGroup = {
      ...groupData,
      id: `temp-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    const operationId = createOptimisticOperation('create', 'group', tempGroup);

    const confirm = async (): Promise<boolean> => {
      try {
        const confirmedGroup = await createFunction(tempGroup);
        confirmOperation(operationId, confirmedGroup);
        return true;
      } catch (error) {
        failOperation(operationId, error instanceof Error ? error.message : 'Group creation failed');
        return false;
      }
    };

    return { tempGroup, operationId, confirm };
  }, [createOptimisticOperation, confirmOperation, failOperation]);

  // Get all pending operations
  const getPendingOperations = useCallback(() => {
    return Array.from(operations.values()).filter(op => op.status === 'pending');
  }, [operations]);

  // Get failed operations that can be retried
  const getRetryableOperations = useCallback(() => {
    return Array.from(operations.values()).filter(
      op => op.status === 'failed' && op.retryCount < finalConfig.maxRetries
    );
  }, [operations, finalConfig.maxRetries]);

  // Check if entity has pending optimistic operations
  const hasPendingOperations = useCallback((entityType?: 'image' | 'analysis' | 'group') => {
    const pending = getPendingOperations();
    return entityType 
      ? pending.some(op => op.entity === entityType)
      : pending.length > 0;
  }, [getPendingOperations]);

  // Get optimistic data for entity (returns the most recent optimistic version)
  const getOptimisticData = useCallback((entityId: string, entityType: 'image' | 'analysis' | 'group'): any | null => {
    const entityOperations = Array.from(operations.values())
      .filter(op => op.entity === entityType && 
                   op.optimisticData?.id === entityId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return entityOperations.length > 0 ? entityOperations[0].optimisticData : null;
  }, [operations]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    
    // Clear operations
    setOperations(new Map());
  }, []);

  return {
    // Core operations
    createOptimisticOperation,
    confirmOperation,
    failOperation,
    retryOperation,
    
    // Specialized operations
    optimisticImageUpload,
    optimisticAnalysisUpdate,
    optimisticGroupCreate,
    
    // Queries
    getPendingOperations,
    getRetryableOperations,
    hasPendingOperations,
    getOptimisticData,
    
    // Utilities
    cleanup,
    operationsCount: operations.size,
    
    // Direct access for debugging
    operations: Array.from(operations.values())
  };
};