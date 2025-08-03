import React, { createContext, useContext, useReducer } from 'react';
import { useAuth } from './AuthContext';
import { appStateReducer } from '@/context/AppStateReducer';
import { initialAppState } from '@/context/AppStateTypes';
import type { AppState, AppAction } from '@/context/AppStateTypes';

interface MinimalAppContextType {
  readonly state: AppState;
  readonly dispatch: (action: AppAction) => void;
}

const MinimalAppContext = createContext<MinimalAppContextType | undefined>(undefined);

export const MinimalAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  const value = React.useMemo(() => ({
    state,
    dispatch,
  }), [state]);

  return (
    <MinimalAppContext.Provider value={value}>
      {children}
    </MinimalAppContext.Provider>
  );
};

export const useMinimalAppContext = (): MinimalAppContextType => {
  const context = useContext(MinimalAppContext);
  if (!context) {
    throw new Error('useMinimalAppContext must be used within MinimalAppProvider');
  }
  return context;
};