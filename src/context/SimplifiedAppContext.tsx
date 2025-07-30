import React, { createContext, useContext, useEffect, useRef, useReducer } from 'react';
import { useAuth } from './AuthContext';
import { appStateReducer } from '@/context/AppStateReducer';
import { initialAppState } from '@/context/AppStateTypes';
import type { AppState, AppAction } from '@/context/AppStateTypes';
import { useStableHelpers } from '@/hooks/useStableHelpers';

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
  const hasLoadedRef = useRef(false);

  // ✅ PHASE 2.3: USE STABLE HELPERS HOOK
  const stableHelpers = useStableHelpers(dispatch);

  // ✅ PHASE 2.3: SIMPLE DATA LOADING - No circular dependencies
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      stableHelpers.loadData();
    }
    
    if (!user) {
      hasLoadedRef.current = false;
      stableHelpers.resetAll();
    }
  }, [user?.id]); // ✅ ONLY user.id - stableHelpers never change

  // ✅ PHASE 2.3: Listen for project changes and clear state
  useEffect(() => {
    const handleProjectChange = (event: CustomEvent) => {
      console.log('[Pure Reducer] Project changed, clearing state:', event.detail);
      hasLoadedRef.current = false;
      stableHelpers.resetAll();
    };

    window.addEventListener('projectChanged', handleProjectChange as EventListener);
    return () => {
      window.removeEventListener('projectChanged', handleProjectChange as EventListener);
    };
  }, []); // ✅ PHASE 2.3: Empty dependencies - stableHelpers never change

  const value = { state, dispatch, stableHelpers };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
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