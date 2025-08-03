/**
 * Client-First State Manager
 * Handles auto-saves, optimistic updates, and offline-first operations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { useFilteredToast } from './use-filtered-toast';
import type { AppState } from '@/context/AppStateTypes';

interface ClientStateConfig {
  autoSaveInterval: number;
  debounceDelay: number;
  maxRetries: number;
  offlineStorageKey: string;
}

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'image' | 'analysis' | 'group';
  data: any;
  timestamp: number;
  retries: number;
}

interface ClientStateMetrics {
  lastSave: number | null;
  pendingOperations: number;
  offlineMode: boolean;
  syncStatus: 'idle' | 'syncing' | 'failed';
}

const DEFAULT_CONFIG: ClientStateConfig = {
  autoSaveInterval: 30000, // 30 seconds
  debounceDelay: 2000, // 2 seconds
  maxRetries: 3,
  offlineStorageKey: 'ux-analysis-offline-state'
};

export const useClientStateManager = (
  state: AppState,
  syncFunction: (state: AppState) => Promise<boolean>,
  config: Partial<ClientStateConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { toast } = useFilteredToast();
  
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [metrics, setMetrics] = useState<ClientStateMetrics>({
    lastSave: null,
    pendingOperations: 0,
    offlineMode: false,
    syncStatus: 'idle'
  });
  
  const lastStateRef = useRef<AppState>(state);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(navigator.onLine);
  const { debounce } = useDebounce();

  // Save state to localStorage for offline persistence
  const saveToLocalStorage = useCallback((stateToSave: AppState, operations: PendingOperation[] = []) => {
    try {
      const offlineData = {
        state: stateToSave,
        pendingOperations: operations,
        timestamp: Date.now(),
        version: stateToSave.version
      };
      localStorage.setItem(finalConfig.offlineStorageKey, JSON.stringify(offlineData));
      console.log('[ClientStateManager] State saved to localStorage');
    } catch (error) {
      console.error('[ClientStateManager] Failed to save to localStorage:', error);
    }
  }, [finalConfig.offlineStorageKey]);

  // Load state from localStorage
  const loadFromLocalStorage = useCallback((): { state: AppState | null; operations: PendingOperation[] } => {
    try {
      const stored = localStorage.getItem(finalConfig.offlineStorageKey);
      if (stored) {
        const offlineData = JSON.parse(stored);
        return {
          state: offlineData.state,
          operations: offlineData.pendingOperations || []
        };
      }
    } catch (error) {
      console.error('[ClientStateManager] Failed to load from localStorage:', error);
    }
    return { state: null, operations: [] };
  }, [finalConfig.offlineStorageKey]);

  // Add pending operation for later sync
  const addPendingOperation = useCallback((operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>) => {
    const newOperation: PendingOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0
    };

    setPendingOperations(prev => {
      const updated = [...prev, newOperation];
      saveToLocalStorage(state, updated);
      return updated;
    });

    console.log('[ClientStateManager] Added pending operation:', newOperation.type, newOperation.entity);
  }, [state, saveToLocalStorage]);

  // Process pending operations when back online
  const processPendingOperations = useCallback(async () => {
    if (pendingOperations.length === 0 || !isOnlineRef.current) return;

    setMetrics(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      console.log(`[ClientStateManager] Processing ${pendingOperations.length} pending operations`);
      
      // Attempt to sync current state with all pending operations applied
      const success = await syncFunction(state);
      
      if (success) {
        setPendingOperations([]);
        saveToLocalStorage(state, []);
        setMetrics(prev => ({
          ...prev,
          lastSave: Date.now(),
          pendingOperations: 0,
          syncStatus: 'idle'
        }));
        
        toast({
          title: "Sync complete",
          description: "All pending changes have been saved to the cloud.",
          category: "success"
        });
      } else {
        throw new Error('Sync function returned false');
      }
    } catch (error) {
      console.error('[ClientStateManager] Failed to process pending operations:', error);
      
      // Retry failed operations
      setPendingOperations(prev => {
        const updated = prev.map(op => ({ ...op, retries: op.retries + 1 }))
          .filter(op => op.retries < finalConfig.maxRetries);
        saveToLocalStorage(state, updated);
        return updated;
      });

      setMetrics(prev => ({ ...prev, syncStatus: 'failed' }));
      
      toast({
        title: "Sync failed",
        description: "Some changes couldn't be saved. Will retry when connection improves.",
        category: "error",
        variant: "destructive"
      });
    }
  }, [pendingOperations, state, syncFunction, finalConfig.maxRetries, saveToLocalStorage, toast]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!isOnlineRef.current) {
      // In offline mode, just save to localStorage
      saveToLocalStorage(state);
      setMetrics(prev => ({ ...prev, lastSave: Date.now() }));
      return;
    }

    try {
      setMetrics(prev => ({ ...prev, syncStatus: 'syncing' }));
      
      const success = await syncFunction(state);
      
      if (success) {
        setMetrics(prev => ({
          ...prev,
          lastSave: Date.now(),
          syncStatus: 'idle'
        }));
        saveToLocalStorage(state); // Keep localStorage in sync
      } else {
        throw new Error('Auto-save failed');
      }
    } catch (error) {
      console.error('[ClientStateManager] Auto-save failed:', error);
      
      // Add current state as pending operation for later sync
      // Use shallow comparison instead of deep JSON.stringify to avoid recursion
      if (lastStateRef.current?.version !== state.version || 
          lastStateRef.current?.uploadedImages.length !== state.uploadedImages.length ||
          lastStateRef.current?.analyses.length !== state.analyses.length) {
        addPendingOperation({
          type: 'update',
          entity: 'image', // Generic update operation
          data: state
        });
      }
      
      // Fall back to localStorage
      saveToLocalStorage(state);
      setMetrics(prev => ({ 
        ...prev, 
        syncStatus: 'failed',
        lastSave: Date.now() // Local save timestamp
      }));
    }
  }, [state, syncFunction, saveToLocalStorage, addPendingOperation]);

  // Handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[ClientStateManager] Connection restored');
      isOnlineRef.current = true;
      setMetrics(prev => ({ ...prev, offlineMode: false }));
      
      // Process any pending operations
      processPendingOperations();
      
      toast({
        title: "Connection restored",
        description: "Syncing pending changes...",
        category: "success"
      });
    };

    const handleOffline = () => {
      console.log('[ClientStateManager] Connection lost, switching to offline mode');
      isOnlineRef.current = false;
      setMetrics(prev => ({ ...prev, offlineMode: true }));
      
      toast({
        title: "Offline mode",
        description: "Changes will be saved locally and synced when connection returns.",
        category: "error"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processPendingOperations, toast]);

  // Create debounced auto-save function
  const debouncedAutoSave = useCallback(() => {
    debounce(() => {
      // Use shallow comparison instead of deep JSON.stringify
      if (lastStateRef.current?.version !== state.version ||
          lastStateRef.current?.uploadedImages.length !== state.uploadedImages.length) {
        performAutoSave();
        lastStateRef.current = state;
      }
    }, finalConfig.debounceDelay)();
  }, [state, performAutoSave, finalConfig.debounceDelay, debounce]);

  // Auto-save timer
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(() => {
      // Use shallow comparison instead of deep JSON.stringify
      if (lastStateRef.current?.version !== state.version ||
          lastStateRef.current?.uploadedImages.length !== state.uploadedImages.length) {
        performAutoSave();
        lastStateRef.current = state;
      }
    }, finalConfig.autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [state, performAutoSave, finalConfig.autoSaveInterval]);

  // Trigger debounced save on state changes
  useEffect(() => {
    debouncedAutoSave();
  }, [state, debouncedAutoSave]);

  // Initialize from localStorage on mount
  useEffect(() => {
    const { operations } = loadFromLocalStorage();
    if (operations.length > 0) {
      setPendingOperations(operations);
      setMetrics(prev => ({ ...prev, pendingOperations: operations.length }));
      
      // Process operations if online
      if (isOnlineRef.current) {
        setTimeout(processPendingOperations, 1000); // Small delay for initialization
      }
    }
  }, [loadFromLocalStorage, processPendingOperations]);

  // Update metrics when pending operations change
  useEffect(() => {
    setMetrics(prev => ({ ...prev, pendingOperations: pendingOperations.length }));
  }, [pendingOperations.length]);

  // Manual sync function
  const manualSync = useCallback(async () => {
    await performAutoSave();
    await processPendingOperations();
  }, [performAutoSave, processPendingOperations]);

  // Optimistic update function
  const optimisticUpdate = useCallback((operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>) => {
    // Add to pending operations for later sync
    addPendingOperation(operation);
    
    // Return success immediately for optimistic UI updates
    return Promise.resolve(true);
  }, [addPendingOperation]);

  return {
    metrics,
    pendingOperations: pendingOperations.length,
    isOffline: !isOnlineRef.current,
    manualSync,
    optimisticUpdate,
    saveToLocalStorage: () => saveToLocalStorage(state),
    loadFromLocalStorage
  };
};