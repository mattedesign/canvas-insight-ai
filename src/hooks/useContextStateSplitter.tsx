/**
 * Phase 6.2: Context State Splitting Hook
 * Provides utilities for splitting large context states into smaller, focused contexts
 */

import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';

export interface ContextSplit<T> {
  key: keyof T;
  dependencies?: (keyof T)[];
  shouldUpdate?: (oldValue: T[keyof T], newValue: T[keyof T]) => boolean;
}

export interface SplitContextConfig<T> {
  splits: ContextSplit<T>[];
  enableLogging?: boolean;
}

export interface SplitContextValue<T, K extends keyof T> {
  value: T[K];
  updateValue: (newValue: T[K] | ((prev: T[K]) => T[K])) => void;
  dependencies: Partial<T>;
}

/**
 * Creates a context splitting system for large state objects
 */
export function createSplitContextSystem<T extends Record<string, any>>(
  config: SplitContextConfig<T>
) {
  const contexts = new Map<keyof T, React.Context<any>>();
  const { splits, enableLogging = process.env.NODE_ENV === 'development' } = config;

  // Create individual contexts for each split
  splits.forEach(split => {
    const context = createContext<SplitContextValue<T, typeof split.key> | null>(null);
    contexts.set(split.key, context);
  });

  /**
   * Provider component that manages all split contexts
   */
  const SplitContextProvider = ({
    children,
    state,
    updateState,
  }: {
    children: ReactNode;
    state: T;
    updateState: (newState: Partial<T> | ((prev: T) => T)) => void;
  }) => {
    // Create providers for each split
    const renderProviders = useCallback((content: ReactNode): ReactNode => {
      return splits.reduce((acc, split) => {
        const Context = contexts.get(split.key)!;
        
        // Get dependencies values
        const dependencies: Partial<T> = {};
        if (split.dependencies) {
          split.dependencies.forEach(dep => {
            dependencies[dep] = state[dep];
          });
        }

        // Create context value
        const contextValue = useMemo<SplitContextValue<T, typeof split.key>>(() => {
          const updateValue = (newValue: T[typeof split.key] | ((prev: T[typeof split.key]) => T[typeof split.key])) => {
            if (enableLogging) {
              console.log(`[ContextSplitter] Updating ${String(split.key)}`);
            }

            updateState(prevState => {
              const newValueResolved = typeof newValue === 'function' 
                ? (newValue as Function)(prevState[split.key])
                : newValue;

              // Check if update should proceed
              if (split.shouldUpdate && !split.shouldUpdate(prevState[split.key], newValueResolved)) {
                if (enableLogging) {
                  console.log(`[ContextSplitter] Update blocked for ${String(split.key)} by shouldUpdate`);
                }
                return prevState;
              }

              return {
                ...prevState,
                [split.key]: newValueResolved,
              };
            });
          };

          return {
            value: state[split.key],
            updateValue,
            dependencies,
          };
        }, [
          state[split.key], 
          updateState, 
          // Include dependencies in memo deps
          ...(split.dependencies?.map(dep => state[dep]) || [])
        ]);

        return (
          <Context.Provider value={contextValue}>
            {acc}
          </Context.Provider>
        );
      }, content);
    }, [state, updateState, splits, enableLogging]);

    return <>{renderProviders(children)}</>;
  };

  /**
   * Hook to use a specific split context
   */
  const useSplitContext = <K extends keyof T>(key: K): SplitContextValue<T, K> => {
    const Context = contexts.get(key);
    if (!Context) {
      throw new Error(`Context for key "${String(key)}" not found. Make sure it's defined in splits.`);
    }

    const context = useContext(Context);
    if (!context) {
      throw new Error(`useSplitContext must be used within a SplitContextProvider for key "${String(key)}"`);
    }

    return context;
  };

  /**
   * Hook to use multiple split contexts at once
   */
  const useMultipleSplitContexts = <K extends keyof T>(keys: K[]): Record<K, SplitContextValue<T, K>> => {
    const contexts = {} as Record<K, SplitContextValue<T, K>>;
    
    keys.forEach(key => {
      contexts[key] = useSplitContext(key);
    });

    return contexts;
  };

  return {
    SplitContextProvider,
    useSplitContext,
    useMultipleSplitContexts,
    contexts,
  };
}

/**
 * Hook for creating selector-based context consumers
 */
export function useContextSelector<T, R>(
  context: React.Context<T>,
  selector: (value: T) => R,
  dependencies: any[] = []
): R {
  const contextValue = useContext(context);
  
  if (contextValue === null || contextValue === undefined) {
    throw new Error('useContextSelector must be used within the appropriate context provider');
  }

  return useMemo(
    () => selector(contextValue),
    [contextValue, selector, ...dependencies]
  );
}

/**
 * Hook for creating optimized context consumers that only re-render when specific fields change
 */
export function useOptimizedContextConsumer<T extends Record<string, any>, K extends keyof T>(
  context: React.Context<T>,
  fields: K[]
): Pick<T, K> {
  const contextValue = useContext(context);
  
  if (contextValue === null || contextValue === undefined) {
    throw new Error('useOptimizedContextConsumer must be used within the appropriate context provider');
  }

  return useMemo(() => {
    const result = {} as Pick<T, K>;
    fields.forEach(field => {
      result[field] = contextValue[field];
    });
    return result;
  }, [contextValue, ...fields.map(field => contextValue[field])]);
}

/**
 * Utility to create a memoized context value
 */
export function createMemoizedContextValue<T>(
  value: T,
  dependencies: any[]
): T {
  return useMemo(() => value, dependencies);
}

/**
 * Hook for tracking context consumer count
 */
export function useContextConsumerTracker(contextName: string) {
  const consumerCountRef = useMemo(() => ({ count: 0 }), []);

  const incrementConsumer = useCallback(() => {
    consumerCountRef.count++;
    console.log(`[ContextTracker] ${contextName} consumer count: ${consumerCountRef.count}`);
  }, [contextName]);

  const decrementConsumer = useCallback(() => {
    consumerCountRef.count = Math.max(0, consumerCountRef.count - 1);
    console.log(`[ContextTracker] ${contextName} consumer count: ${consumerCountRef.count}`);
  }, [contextName]);

  return {
    consumerCount: consumerCountRef.count,
    incrementConsumer,
    decrementConsumer,
  };
}

/**
 * HOC for optimizing context consumers
 */
export function withOptimizedContext<P, T>(
  Component: React.ComponentType<P & { contextValue: T }>,
  context: React.Context<T>,
  shouldUpdate?: (prev: T, next: T) => boolean
) {
  const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
    if (shouldUpdate) {
      return !shouldUpdate(prevProps.contextValue, nextProps.contextValue);
    }
    return false; // Always re-render if no shouldUpdate function provided
  });

  return function OptimizedContextConsumer(props: P) {
    const contextValue = useContext(context);
    return React.createElement(MemoizedComponent, { ...props, contextValue } as any);
  };
}

/**
 * Utility for deep comparison of context values
 */
export function createContextComparator<T>(
  compareFunction?: (prev: T, next: T) => boolean
) {
  return function compareContextValues(prev: T, next: T): boolean {
    if (compareFunction) {
      return compareFunction(prev, next);
    }

    // Default shallow comparison
    if (prev === next) return true;
    if (typeof prev !== 'object' || typeof next !== 'object') return false;
    if (prev === null || next === null) return false;

    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    if (prevKeys.length !== nextKeys.length) return false;

    for (const key of prevKeys) {
      if (!(key in next)) return false;
      if (prev[key as keyof T] !== next[key as keyof T]) return false;
    }

    return true;
  };
}