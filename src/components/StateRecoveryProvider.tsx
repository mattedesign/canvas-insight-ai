/**
 * State Recovery Provider - Wraps the app with comprehensive error handling
 */

import React from 'react';
import { ErrorRecoveryBoundary } from './ErrorRecoveryBoundary';
import { useAppState } from '@/hooks/useAppState';
import { atomicStateManager } from '@/services/AtomicStateManager';

interface StateRecoveryProviderProps {
  children: React.ReactNode;
}

export const StateRecoveryProvider: React.FC<StateRecoveryProviderProps> = ({ children }) => {
  const state = useAppState();

  const handleRecovery = async () => {
    console.log('[StateRecovery] Attempting state recovery...');
    
    try {
      // Try to rollback to last known good state
      const lastSnapshot = atomicStateManager.getLastSnapshot();
      if (lastSnapshot) {
        console.log('[StateRecovery] Rolling back to snapshot:', lastSnapshot.operationId);
        // The atomic state manager handles the actual rollback
        atomicStateManager.rollbackToSnapshot(lastSnapshot.operationId);
      } else {
        // If no snapshot, trigger a fresh data load
        console.log('[StateRecovery] No snapshot available, triggering fresh load');
        window.location.reload();
      }
    } catch (error) {
      console.error('[StateRecovery] Recovery failed:', error);
      // Last resort: reload the page
      window.location.reload();
    }
  };

  return (
    <ErrorRecoveryBoundary
      name="AppStateProvider"
      enableRecovery={true}
      enableStateRollback={true}
      onRecovery={handleRecovery}
    >
      {children}
    </ErrorRecoveryBoundary>
  );
};