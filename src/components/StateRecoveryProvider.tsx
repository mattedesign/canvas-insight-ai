/**
 * State Recovery Provider - Wraps the app with comprehensive error handling
 */

import React from 'react';
import { ErrorRecoveryBoundary } from './ErrorRecoveryBoundary';
import { useAppState } from '@/hooks/useAppState';
// Removed AtomicStateManager - using direct dispatch

interface StateRecoveryProviderProps {
  children: React.ReactNode;
}

export const StateRecoveryProvider: React.FC<StateRecoveryProviderProps> = ({ children }) => {
  const state = useAppState();

  const handleRecovery = async () => {
    console.log('[StateRecovery] Attempting state recovery...');
    
    try {
      // Try to rollback to last known good state
      // Direct dispatch - implement in next step
      console.log('[StateRecovery] State rollback would be implemented here');
      // For now, trigger a fresh data load
      window.location.reload();
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