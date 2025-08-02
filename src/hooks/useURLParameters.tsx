/**
 * ✅ PHASE 4.2: URL PARAMETER MANAGEMENT HOOK
 * Type-safe, reactive URL parameter handling with validation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { URLStateSyncService } from '@/services/URLStateSyncService';

interface ParameterConfig<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  validate?: (value: T) => boolean;
  debounceMs?: number;
}

interface URLParameterState<T> {
  value: T;
  isValid: boolean;
  isDirty: boolean;
  error?: string;
}

interface URLParametersConfig {
  mode: 'replace' | 'push';
  syncOnMount: boolean;
  clearOnUnmount: boolean;
  validateOnChange: boolean;
}

const DEFAULT_CONFIG: URLParametersConfig = {
  mode: 'replace',
  syncOnMount: true,
  clearOnUnmount: false,
  validateOnChange: true
};

/**
 * ✅ PHASE 4.2: Hook for managing individual URL parameter
 */
export function useURLParameter<T>(
  config: ParameterConfig<T>,
  options: Partial<URLParametersConfig> = {}
): [URLParameterState<T>, (value: T) => void, () => void] {
  const location = useLocation();
  const navigate = useNavigate();
  const urlSync = URLStateSyncService.getInstance();
  const mergedOptions = { ...DEFAULT_CONFIG, ...options };

  // State for the parameter
  const [state, setState] = useState<URLParameterState<T>>(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlValue = urlParams.get(config.key);
    
    if (urlValue !== null) {
      try {
        const deserializedValue = config.deserialize 
          ? config.deserialize(urlValue)
          : (urlValue as unknown as T);
        
        const isValid = config.validate ? config.validate(deserializedValue) : true;
        
        return {
          value: isValid ? deserializedValue : config.defaultValue,
          isValid,
          isDirty: isValid,
          error: isValid ? undefined : 'Invalid value from URL'
        };
      } catch (error) {
        return {
          value: config.defaultValue,
          isValid: false,
          isDirty: false,
          error: `Deserialization error: ${error}`
        };
      }
    }
    
    return {
      value: config.defaultValue,
      isValid: true,
      isDirty: false
    };
  });

  // Register with URL sync service
  useEffect(() => {
    if (mergedOptions.syncOnMount) {
      urlSync.registerSync({
        key: config.key,
        serialize: config.serialize || ((value: T) => String(value)),
        deserialize: config.deserialize || ((value: string) => value as unknown as T),
        validate: config.validate,
        debounceMs: config.debounceMs
      });

      // Initialize with current value if it's dirty
      if (state.isDirty && state.isValid) {
        urlSync.updateState(config.key, state.value);
      }
    }

    return () => {
      if (mergedOptions.clearOnUnmount) {
        urlSync.clearState(config.key);
      }
    };
  }, []);

  // Update parameter value
  const updateParameter = useCallback((newValue: T) => {
    let isValid = true;
    let error: string | undefined;

    // Validate if validation is enabled
    if (mergedOptions.validateOnChange && config.validate) {
      isValid = config.validate(newValue);
      if (!isValid) {
        error = 'Value failed validation';
      }
    }

    // Update state
    setState({
      value: newValue,
      isValid,
      isDirty: true,
      error
    });

    // Update URL if valid
    if (isValid) {
      urlSync.updateState(config.key, newValue);
      
      // Update browser URL
      const url = new URL(window.location.href);
      const serializedValue = config.serialize 
        ? config.serialize(newValue)
        : String(newValue);
      
      url.searchParams.set(config.key, serializedValue);
      
      if (mergedOptions.mode === 'replace') {
        navigate(`${location.pathname}${url.search}`, { replace: true });
      } else {
        navigate(`${location.pathname}${url.search}`);
      }
    }
  }, [config, location.pathname, navigate, urlSync, mergedOptions]);

  // Clear parameter
  const clearParameter = useCallback(() => {
    setState({
      value: config.defaultValue,
      isValid: true,
      isDirty: false
    });

    urlSync.clearState(config.key);
    
    const url = new URL(window.location.href);
    url.searchParams.delete(config.key);
    
    if (mergedOptions.mode === 'replace') {
      navigate(`${location.pathname}${url.search}`, { replace: true });
    } else {
      navigate(`${location.pathname}${url.search}`);
    }
  }, [config.key, config.defaultValue, location.pathname, navigate, urlSync, mergedOptions]);

  // Sync from URL changes (back/forward navigation)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlValue = urlParams.get(config.key);
    
    if (urlValue !== null) {
      try {
        const deserializedValue = config.deserialize 
          ? config.deserialize(urlValue)
          : (urlValue as unknown as T);
        
        const isValid = config.validate ? config.validate(deserializedValue) : true;
        
        setState(prev => ({
          value: isValid ? deserializedValue : prev.value,
          isValid,
          isDirty: true,
          error: isValid ? undefined : 'Invalid value from URL'
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isValid: false,
          error: `Deserialization error: ${error}`
        }));
      }
    } else if (state.isDirty) {
      // Parameter was removed from URL
      setState({
        value: config.defaultValue,
        isValid: true,
        isDirty: false
      });
    }
  }, [location.search, config.key]);

  return [state, updateParameter, clearParameter];
}

/**
 * ✅ PHASE 4.2: Hook for managing multiple URL parameters
 */
export function useURLParameters<T extends Record<string, any>>(
  configs: { [K in keyof T]: ParameterConfig<T[K]> },
  options: Partial<URLParametersConfig> = {}
): {
  values: T;
  states: { [K in keyof T]: URLParameterState<T[K]> };
  updateParameter: <K extends keyof T>(key: K, value: T[K]) => void;
  updateParameters: (updates: Partial<T>) => void;
  clearParameter: <K extends keyof T>(key: K) => void;
  clearAllParameters: () => void;
  isValid: boolean;
  isDirty: boolean;
  errors: { [K in keyof T]?: string };
} {
  const location = useLocation();
  const navigate = useNavigate();
  const urlSync = URLStateSyncService.getInstance();
  const mergedOptions = { ...DEFAULT_CONFIG, ...options };

  // Initialize states for all parameters
  const [parameterStates, setParameterStates] = useState<{ [K in keyof T]: URLParameterState<T[K]> }>(() => {
    const urlParams = new URLSearchParams(location.search);
    const initialStates = {} as { [K in keyof T]: URLParameterState<T[K]> };

    Object.entries(configs).forEach(([key, config]) => {
      const urlValue = urlParams.get(config.key);
      
      if (urlValue !== null) {
        try {
          const deserializedValue = config.deserialize 
            ? config.deserialize(urlValue)
            : (urlValue as any);
          
          const isValid = config.validate ? config.validate(deserializedValue) : true;
          
          initialStates[key as keyof T] = {
            value: isValid ? deserializedValue : config.defaultValue,
            isValid,
            isDirty: isValid,
            error: isValid ? undefined : 'Invalid value from URL'
          };
        } catch (error) {
          initialStates[key as keyof T] = {
            value: config.defaultValue,
            isValid: false,
            isDirty: false,
            error: `Deserialization error: ${error}`
          };
        }
      } else {
        initialStates[key as keyof T] = {
          value: config.defaultValue,
          isValid: true,
          isDirty: false
        };
      }
    });

    return initialStates;
  });

  // Register all parameters with URL sync service
  useEffect(() => {
    if (mergedOptions.syncOnMount) {
      Object.entries(configs).forEach(([key, config]) => {
        urlSync.registerSync({
          key: config.key,
          serialize: config.serialize || ((value: any) => String(value)),
          deserialize: config.deserialize || ((value: string) => value as any),
          validate: config.validate,
          debounceMs: config.debounceMs
        });

        // Initialize with current value if it's dirty
        const state = parameterStates[key as keyof T];
        if (state?.isDirty && state?.isValid) {
          urlSync.updateState(config.key, state.value);
        }
      });
    }

    return () => {
      if (mergedOptions.clearOnUnmount) {
        Object.values(configs).forEach(config => {
          urlSync.clearState(config.key);
        });
      }
    };
  }, []);

  // Derived values
  const values = useMemo(() => {
    const result = {} as T;
    Object.keys(configs).forEach(key => {
      result[key as keyof T] = parameterStates[key as keyof T]?.value;
    });
    return result;
  }, [parameterStates, configs]);

  const isValid = useMemo(() => {
    return Object.values(parameterStates).every(state => state.isValid);
  }, [parameterStates]);

  const isDirty = useMemo(() => {
    return Object.values(parameterStates).some(state => state.isDirty);
  }, [parameterStates]);

  const errors = useMemo(() => {
    const result = {} as { [K in keyof T]?: string };
    Object.entries(parameterStates).forEach(([key, state]) => {
      if (state.error) {
        result[key as keyof T] = state.error;
      }
    });
    return result;
  }, [parameterStates]);

  // Update single parameter
  const updateParameter = useCallback(<K extends keyof T>(key: K, newValue: T[K]) => {
    const config = configs[key];
    if (!config) return;

    let isValid = true;
    let error: string | undefined;

    // Validate if validation is enabled
    if (mergedOptions.validateOnChange && config.validate) {
      isValid = config.validate(newValue);
      if (!isValid) {
        error = 'Value failed validation';
      }
    }

    // Update state
    setParameterStates(prev => ({
      ...prev,
      [key]: {
        value: newValue,
        isValid,
        isDirty: true,
        error
      }
    }));

    // Update URL if valid
    if (isValid) {
      urlSync.updateState(config.key, newValue);
      updateURL();
    }
  }, [configs, urlSync, mergedOptions]);

  // Update multiple parameters
  const updateParameters = useCallback((updates: Partial<T>) => {
    const newStates = { ...parameterStates };
    let hasValidUpdates = false;

    Object.entries(updates).forEach(([key, value]) => {
      const config = configs[key as keyof T];
      if (!config) return;

      let isValid = true;
      let error: string | undefined;

      // Validate if validation is enabled
      if (mergedOptions.validateOnChange && config.validate) {
        isValid = config.validate(value);
        if (!isValid) {
          error = 'Value failed validation';
        }
      }

      newStates[key as keyof T] = {
        value: value,
        isValid,
        isDirty: true,
        error
      };

      if (isValid) {
        urlSync.updateState(config.key, value);
        hasValidUpdates = true;
      }
    });

    setParameterStates(newStates);

    if (hasValidUpdates) {
      updateURL();
    }
  }, [parameterStates, configs, urlSync, mergedOptions]);

  // Clear single parameter
  const clearParameter = useCallback(<K extends keyof T>(key: K) => {
    const config = configs[key];
    if (!config) return;

    setParameterStates(prev => ({
      ...prev,
      [key]: {
        value: config.defaultValue,
        isValid: true,
        isDirty: false
      }
    }));

    urlSync.clearState(config.key);
    updateURL();
  }, [configs, urlSync]);

  // Clear all parameters
  const clearAllParameters = useCallback(() => {
    const newStates = {} as { [K in keyof T]: URLParameterState<T[K]> };
    
    Object.entries(configs).forEach(([key, config]) => {
      newStates[key as keyof T] = {
        value: config.defaultValue,
        isValid: true,
        isDirty: false
      };
      urlSync.clearState(config.key);
    });

    setParameterStates(newStates);
    updateURL();
  }, [configs, urlSync]);

  // Update browser URL
  const updateURL = useCallback(() => {
    const url = urlSync.generateURL();
    
    if (mergedOptions.mode === 'replace') {
      navigate(`${location.pathname}${new URL(url).search}`, { replace: true });
    } else {
      navigate(`${location.pathname}${new URL(url).search}`);
    }
  }, [urlSync, location.pathname, navigate, mergedOptions]);

  // Sync from URL changes (back/forward navigation)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const newStates = { ...parameterStates };
    
    Object.entries(configs).forEach(([key, config]) => {
      const urlValue = urlParams.get(config.key);
      
      if (urlValue !== null) {
        try {
          const deserializedValue = config.deserialize 
            ? config.deserialize(urlValue)
            : (urlValue as any);
          
          const isValid = config.validate ? config.validate(deserializedValue) : true;
          
          newStates[key as keyof T] = {
            value: isValid ? deserializedValue : newStates[key as keyof T].value,
            isValid,
            isDirty: true,
            error: isValid ? undefined : 'Invalid value from URL'
          };
        } catch (error) {
          newStates[key as keyof T] = {
            ...newStates[key as keyof T],
            isValid: false,
            error: `Deserialization error: ${error}`
          };
        }
      } else if (newStates[key as keyof T].isDirty) {
        // Parameter was removed from URL
        newStates[key as keyof T] = {
          value: config.defaultValue,
          isValid: true,
          isDirty: false
        };
      }
    });
    
    setParameterStates(newStates);
  }, [location.search]);

  return {
    values,
    states: parameterStates,
    updateParameter,
    updateParameters,
    clearParameter,
    clearAllParameters,
    isValid,
    isDirty,
    errors
  };
}