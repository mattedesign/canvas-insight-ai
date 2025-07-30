import React, { createContext, useContext, useEffect, useRef, useReducer } from 'react';
import { useAuth } from './AuthContext';
import { appStateReducer } from '@/context/AppStateReducer';
import { initialAppState } from '@/context/AppStateTypes';
import type { AppState, AppAction } from '@/context/AppStateTypes';
import { useStableHelpers } from '@/hooks/useStableHelpers';
import { useInitializationManager } from '@/hooks/useInitializationManager';
import { InitializationErrorBoundary } from '@/components/InitializationErrorBoundary';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  stableHelpers: {
    loadData: (expectedProjectId?: string) => Promise<void>;
    uploadImages: (files: File[]) => Promise<void>;
    createGroup: (data: any) => void;
    deleteImage: (id: string) => void;
    resetAll: () => void;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  // ✅ PHASE 2.3: USE STABLE HELPERS HOOK
  const stableHelpers = useStableHelpers(dispatch);

  // ✅ PHASE 3.2: USE INITIALIZATION MANAGER
  const initializationManager = useInitializationManager(dispatch);

  // ✅ PHASE 3.2: ONE-TIME INITIALIZATION EFFECT - Empty dependencies
  useEffect(() => {
    if (user?.id) {
      console.log('[AppProvider] User authenticated, initializing app for user:', user.id);
      
      // ✅ PHASE 3.2: Initialize with current user and project context
      initializationManager.initializeApp({
        userId: user.id,
        retryAttempts: 3,
        retryDelay: 1000,
      }).catch(error => {
        console.error('[AppProvider] Initialization failed:', error);
        // Error boundary will handle this
      });
    } else {
      console.log('[AppProvider] User not authenticated, resetting initialization');
      initializationManager.resetInitialization();
      stableHelpers.resetAll();
    }
  }, [user?.id]); // ✅ PHASE 3.2: Only user.id - all other dependencies are stable

  // ✅ PHASE 3.2: Handle retry requests from error boundary
  const handleInitializationRetry = () => {
    if (user?.id) {
      return initializationManager.initializeApp({
        userId: user.id,
        retryAttempts: 3,
        retryDelay: 1000,
      });
    }
    return Promise.resolve();
  };

  const value = { state, dispatch, stableHelpers };

  return (
    <InitializationErrorBoundary onRetry={handleInitializationRetry} maxRetries={3}>
      <AppContext.Provider value={value}>
        {children}
      </AppContext.Provider>
    </InitializationErrorBoundary>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// ✅ PHASE 2.3: PURE REDUCER HOOKS
export const useAppDispatch = () => useAppContext().dispatch;
export const useAppState = () => useAppContext().state;
export const useAppHelpers = () => useAppContext().stableHelpers;

// ✅ PHASE 2.3: REMOVED - No backward compatibility aliases
// All components should use the new hook names directly