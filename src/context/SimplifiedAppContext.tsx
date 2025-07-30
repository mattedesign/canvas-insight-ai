import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useAppStateManager } from '@/hooks/useAppStateManager';

interface AppContextType {
  state: ReturnType<typeof useAppStateManager>['state'];
  actions: ReturnType<typeof useAppStateManager>['actions'];
  status: ReturnType<typeof useAppStateManager>['status'];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { state, actions, status } = useAppStateManager();
  const hasLoadedRef = useRef(false);

  // ✅ SIMPLE, CLEAN DATA LOADING - No circular dependencies
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      actions.loadData();
    }
    
    if (!user) {
      hasLoadedRef.current = false;
      actions.resetAll();
    }
  }, [user?.id]); // ✅ ONLY user.id - actions are stable

  const value = { state, actions, status };

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

// ✅ CONVENIENCE HOOKS
export const useAppActions = () => useAppContext().actions;
export const useAppState = () => useAppContext().state;
export const useAppStatus = () => useAppContext().status;

// Backward compatibility aliases
export const useSimplifiedAppContext = useAppContext;
export const SimplifiedAppProvider = AppProvider;