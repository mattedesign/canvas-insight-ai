import { useContext } from 'react';
import { MinimalAppProvider, useMinimalAppContext } from '@/context/MinimalAppContext';
import type { AppState, AppAction } from '@/context/AppStateTypes';

// Simple hook that provides direct access to state and dispatch
// No selectors, no optimization - just basic state access
export const useSimpleAppState = () => {
  const { state, dispatch } = useMinimalAppContext();
  return { state, dispatch };
};

// Convenience hooks for common state access patterns
export const useAppState = <T = AppState>(selector?: (state: AppState) => T): T => {
  const { state } = useMinimalAppContext();
  return selector ? selector(state) : (state as T);
};

export const useAppDispatch = () => {
  const { dispatch } = useMinimalAppContext();
  return dispatch;
};