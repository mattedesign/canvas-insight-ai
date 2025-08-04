import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthRecoveryState {
  isRecovering: boolean;
  lastSessionCheck: Date | null;
  retryCount: number;
  sessionValidationFailed: boolean;
}

interface UseAuthRecoveryOptions {
  sessionCheckInterval?: number; // minutes
  maxRetryAttempts?: number;
  enableSessionValidation?: boolean;
}

export const useAuthRecovery = (options: UseAuthRecoveryOptions = {}) => {
  const {
    sessionCheckInterval = 5,
    maxRetryAttempts = 3,
    enableSessionValidation = true
  } = options;

  const [recoveryState, setRecoveryState] = useState<AuthRecoveryState>({
    isRecovering: false,
    lastSessionCheck: null,
    retryCount: 0,
    sessionValidationFailed: false
  });

  const { toast } = useToast();
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const validationIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Validate session integrity
  const validateSession = useCallback(async (session: Session | null): Promise<boolean> => {
    if (!session || !enableSessionValidation) return true;

    try {
      // Check if token is still valid by making a simple authenticated request
      const { error } = await supabase.auth.getUser();
      
      if (error) {
        console.warn('[AuthRecovery] Session validation failed:', error.message);
        setRecoveryState(prev => ({ ...prev, sessionValidationFailed: true }));
        return false;
      }

      // Check token expiration
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : 0;

      if (timeUntilExpiry < 300) { // Less than 5 minutes
        console.warn('[AuthRecovery] Session expires soon, attempting refresh');
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[AuthRecovery] Token refresh failed:', refreshError.message);
          return false;
        }
      }

      setRecoveryState(prev => ({ 
        ...prev, 
        lastSessionCheck: new Date(),
        sessionValidationFailed: false 
      }));
      return true;
    } catch (error) {
      console.error('[AuthRecovery] Session validation error:', error);
      return false;
    }
  }, [enableSessionValidation]);

  // Attempt to recover authentication session
  const recoverSession = useCallback(async (): Promise<boolean> => {
    if (recoveryState.retryCount >= maxRetryAttempts) {
      console.error('[AuthRecovery] Max retry attempts reached');
      toast({
        title: "Session Recovery Failed",
        description: "Please sign in again to continue.",
        variant: "destructive",
      });
      return false;
    }

    setRecoveryState(prev => ({ 
      ...prev, 
      isRecovering: true, 
      retryCount: prev.retryCount + 1 
    }));

    try {
      console.log(`[AuthRecovery] Attempting session recovery (attempt ${recoveryState.retryCount + 1})`);
      
      // First, try to refresh the current session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (!error && session) {
        console.log('[AuthRecovery] Session recovery successful');
        setRecoveryState(prev => ({ 
          ...prev, 
          isRecovering: false, 
          retryCount: 0,
          sessionValidationFailed: false 
        }));
        return true;
      }

      // If refresh fails, try to get the session from storage
      const { data: { session: storedSession } } = await supabase.auth.getSession();
      
      if (storedSession) {
        const isValid = await validateSession(storedSession);
        if (isValid) {
          console.log('[AuthRecovery] Stored session recovery successful');
          setRecoveryState(prev => ({ 
            ...prev, 
            isRecovering: false, 
            retryCount: 0,
            sessionValidationFailed: false 
          }));
          return true;
        }
      }

      throw new Error('Session recovery failed');
    } catch (error: any) {
      console.error('[AuthRecovery] Recovery attempt failed:', error.message);
      
      // Exponential backoff for retries
      const backoffDelay = Math.min(1000 * Math.pow(2, recoveryState.retryCount), 10000);
      
      recoveryTimeoutRef.current = setTimeout(() => {
        recoverSession();
      }, backoffDelay);

      return false;
    } finally {
      setRecoveryState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [recoveryState.retryCount, maxRetryAttempts, validateSession, toast]);

  // Start periodic session validation
  const startSessionMonitoring = useCallback((session: Session | null) => {
    if (!enableSessionValidation || !session) return;

    // Clear existing interval
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
    }

    // Set up periodic validation
    validationIntervalRef.current = setInterval(async () => {
      const isValid = await validateSession(session);
      if (!isValid && !recoveryState.isRecovering) {
        await recoverSession();
      }
    }, sessionCheckInterval * 60 * 1000);
  }, [sessionCheckInterval, enableSessionValidation, validateSession, recoverSession, recoveryState.isRecovering]);

  // Stop session monitoring
  const stopSessionMonitoring = useCallback(() => {
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
      validationIntervalRef.current = undefined;
    }
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = undefined;
    }
  }, []);

  // Reset recovery state
  const resetRecovery = useCallback(() => {
    setRecoveryState({
      isRecovering: false,
      lastSessionCheck: null,
      retryCount: 0,
      sessionValidationFailed: false
    });
    stopSessionMonitoring();
  }, [stopSessionMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return stopSessionMonitoring;
  }, [stopSessionMonitoring]);

  return {
    recoveryState,
    validateSession,
    recoverSession,
    startSessionMonitoring,
    stopSessionMonitoring,
    resetRecovery
  };
};