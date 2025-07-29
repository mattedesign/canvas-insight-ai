import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const checkSubscription = async () => {
    if (!session) return;
    
    let retries = 0;
    const maxRetries = 3;
    
    const attemptRequest = async (): Promise<void> => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        
        if (error) throw error;
        setSubscription(data);
      } catch (error: any) {
        console.error(`Error checking subscription (attempt ${retries + 1}):`, error);
        
        // Check if it's a network error and we can retry
        if (retries < maxRetries && (
          error.message?.includes('fetch') ||
          error.message?.includes('network') ||
          error.message?.includes('CORS') ||
          error.status >= 500
        )) {
          retries++;
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retries) * 1000;
          setTimeout(attemptRequest, delay);
          return;
        }
        
        // Set default free tier on final error
        setSubscription({
          subscribed: false,
          subscription_tier: 'free',
          subscription_end: null,
          analysis_count: 0,
          analysis_limit: 10
        });
        
        // Show user-friendly error message for CORS/network issues
        if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
          toast({
            title: "Connection Issue",
            description: "Please check your internet connection and try again.",
            variant: "destructive",
          });
        }
      }
    };
    
    await attemptRequest();
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check subscription on sign in
        if (session?.user && event === 'SIGNED_IN') {
          // Add slight delay to ensure session is fully established
          setTimeout(() => {
            checkSubscription();
          }, 1000);
        }
        
        // Clear subscription on sign out
        if (event === 'SIGNED_OUT') {
          setSubscription(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check subscription if user is authenticated
      if (session?.user) {
        setTimeout(() => {
          checkSubscription();
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Use production domain if available, fallback to current origin
      const currentOrigin = window.location.origin;
      const redirectUrl = currentOrigin.includes('lovableproject.com') 
        ? 'https://app.figmant.ai/'
        : `${currentOrigin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
          errorMessage = "Connection issue. Please check your internet connection and try again.";
        } else if (error.message.includes('User already registered')) {
          errorMessage = "This email is already registered. Try signing in instead.";
        }
        
        toast({
          title: "Sign up failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
      }

      return { error };
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
        errorMessage = "Connection issue. Please check your internet connection and try again.";
      }
      
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
          errorMessage = "Connection issue. Please check your internet connection and try again.";
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        }
        
        toast({
          title: "Sign in failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }

      return { error };
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
        errorMessage = "Connection issue. Please check your internet connection and try again.";
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
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
        toast({
          title: "Sign out failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed out",
          description: "You've been successfully signed out.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    subscription,
    signUp,
    signIn,
    signOut,
    checkSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};