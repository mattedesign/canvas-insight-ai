import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthRecovery } from '@/hooks/useAuthRecovery';
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler';

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end: string | null;
  analysis_count: number;
  analysis_limit: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { toast } = useToast();
  const { handleAuthError } = useAuthErrorHandler();
  const { 
    recoveryState, 
    validateSession, 
    startSessionMonitoring, 
    stopSessionMonitoring,
    resetRecovery 
  } = useAuthRecovery({
    sessionCheckInterval: 5,
    maxRetryAttempts: 3,
    enableSessionValidation: true
  });
  
  const initializationRef = useRef(false);

  const checkSubscription = async () => {
    if (!session) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      setSubscription(data);
    } catch (error: any) {
      setSubscription({
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null,
        analysis_count: 0,
        analysis_limit: 10
      });
    }
  };

  useEffect(() => {
    // Prevent double initialization
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log('[AuthProvider] Initializing authentication...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthProvider] Auth state change: ${event}`, { session: !!session });
        
        // Update state synchronously first
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!isInitialized) {
          setIsInitialized(true);
          setLoading(false);
        }

        try {
          // Handle session validation for existing sessions
          if (session && event === 'SIGNED_IN') {
            const isValid = await validateSession(session);
            if (isValid) {
              startSessionMonitoring(session);
              // Delay subscription check to avoid race conditions
              setTimeout(() => {
                checkSubscription();
              }, 1000);
            }
          }

          // Handle sign out cleanup
          if (event === 'SIGNED_OUT') {
            setSubscription(null);
            stopSessionMonitoring();
            resetRecovery();
          }

          // Handle token refresh
          if (event === 'TOKEN_REFRESHED' && session) {
            console.log('[AuthProvider] Token refreshed successfully');
            startSessionMonitoring(session);
          }
        } catch (error) {
          console.error('[AuthProvider] Error in auth state change handler:', error);
          handleAuthError(error, 'Auth State Change');
        }
      }
    );

    // Initialize session
    const initializeSession = async () => {
      try {
        console.log('[AuthProvider] Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthProvider] Session check error:', error);
          handleAuthError(error, 'Session Initialization');
        }

        setSession(session);
        setUser(session?.user ?? null);
        setIsInitialized(true);
        setLoading(false);

        if (session?.user) {
          const isValid = await validateSession(session);
          if (isValid) {
            startSessionMonitoring(session);
            setTimeout(() => {
              checkSubscription();
            }, 1000);
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to initialize session:', error);
        handleAuthError(error, 'Initialization');
        setIsInitialized(true);
        setLoading(false);
      }
    };

    initializeSession();

    return () => {
      subscription.unsubscribe();
      stopSessionMonitoring();
    };
  }, [isInitialized, validateSession, startSessionMonitoring, stopSessionMonitoring, resetRecovery, handleAuthError]);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        handleAuthError(error, 'Sign Up');
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link.",
        });
      }

      return { error };
    } catch (error: any) {
      handleAuthError(error, 'Sign Up');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        handleAuthError(error, 'Sign In');
      }

      return { error };
    } catch (error: any) {
      handleAuthError(error, 'Sign In');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        handleAuthError(error, 'Sign Out');
      } else {
        stopSessionMonitoring();
        resetRecovery();
      }

      return { error };
    } catch (error: any) {
      handleAuthError(error, 'Sign Out');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        handleAuthError(error, 'Password Reset');
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }

      return { error };
    } catch (error: any) {
      handleAuthError(error, 'Password Reset');
      return { error };
    }
  };

  const value: AuthContextType = React.useMemo(() => ({
    user,
    session,
    loading: loading || !isInitialized || recoveryState.isRecovering,
    subscription,
    signUp,
    signIn,
    signOut,
    resetPassword,
    checkSubscription,
  }), [user, session, loading, isInitialized, recoveryState.isRecovering, subscription]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};