import React, { createContext, useContext, useReducer } from 'react';
import { useAuth } from './AuthContext';
import { appStateReducer } from '@/context/AppStateReducer';
import { initialAppState } from '@/context/AppStateTypes';
import type { AppState, AppAction } from '@/context/AppStateTypes';

// Ultra-simplified context - no validation, no optimization, no complex helpers
interface FinalAppContextType {
  readonly state: AppState;
  readonly dispatch: (action: AppAction) => void;
}

const FinalAppContext = createContext<FinalAppContextType | undefined>(undefined);

export const FinalAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialAppState);

  // Minimal context value - maximum performance
  const value = React.useMemo(() => ({ state, dispatch }), [state]);

  return (
    <FinalAppContext.Provider value={value}>
      {children}
    </FinalAppContext.Provider>
  );
};

export const useFinalAppContext = (): FinalAppContextType => {
  const context = useContext(FinalAppContext);
  if (!context) {
    throw new Error('useFinalAppContext must be used within FinalAppProvider');
  }
  return context;
};