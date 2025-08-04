import { useCallback } from 'react';
import { AuthError } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export interface AuthErrorInfo {
  type: 'auth' | 'network' | 'validation' | 'rate_limit' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  userMessage: string;
  technicalMessage: string;
  suggestedAction?: string;
}

export const useAuthErrorHandler = () => {
  const { toast } = useToast();

  const categorizeError = useCallback((error: any): AuthErrorInfo => {
    const message = error?.message?.toLowerCase() || '';
    const code = error?.code || '';

    // Network-related errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return {
        type: 'network',
        severity: 'medium',
        isRetryable: true,
        userMessage: 'Connection issue. Please check your internet and try again.',
        technicalMessage: error.message,
        suggestedAction: 'Check your network connection and retry'
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return {
        type: 'rate_limit',
        severity: 'medium',
        isRetryable: true,
        userMessage: 'Too many attempts. Please wait a moment before trying again.',
        technicalMessage: error.message,
        suggestedAction: 'Wait 1-2 minutes before retrying'
      };
    }

    // Authentication-specific errors
    switch (message) {
      case 'invalid login credentials':
      case 'invalid credentials':
        return {
          type: 'auth',
          severity: 'low',
          isRetryable: true,
          userMessage: 'Invalid email or password. Please check your credentials.',
          technicalMessage: error.message,
          suggestedAction: 'Verify your email and password are correct'
        };

      case 'email not confirmed':
        return {
          type: 'validation',
          severity: 'medium',
          isRetryable: false,
          userMessage: 'Please check your email and click the confirmation link.',
          technicalMessage: error.message,
          suggestedAction: 'Check your email inbox and spam folder'
        };

      case 'user not found':
        return {
          type: 'auth',
          severity: 'low',
          isRetryable: true,
          userMessage: 'No account found with this email. Please sign up first.',
          technicalMessage: error.message,
          suggestedAction: 'Sign up for a new account or verify the email address'
        };

      case 'signup disabled':
        return {
          type: 'auth',
          severity: 'high',
          isRetryable: false,
          userMessage: 'New account registration is currently disabled.',
          technicalMessage: error.message,
          suggestedAction: 'Contact support for assistance'
        };

      case 'weak password':
      case 'password is too weak':
        return {
          type: 'validation',
          severity: 'low',
          isRetryable: true,
          userMessage: 'Password is too weak. Please use a stronger password.',
          technicalMessage: error.message,
          suggestedAction: 'Use at least 8 characters with mixed case, numbers, and symbols'
        };

      case 'invalid email':
        return {
          type: 'validation',
          severity: 'low',
          isRetryable: true,
          userMessage: 'Please enter a valid email address.',
          technicalMessage: error.message,
          suggestedAction: 'Check email format and try again'
        };

      case 'session not found':
      case 'jwt expired':
      case 'refresh token not found':
        return {
          type: 'auth',
          severity: 'medium',
          isRetryable: true,
          userMessage: 'Your session has expired. Please sign in again.',
          technicalMessage: error.message,
          suggestedAction: 'Sign in to restore your session'
        };

      default:
        return {
          type: 'unknown',
          severity: 'medium',
          isRetryable: true,
          userMessage: 'An unexpected error occurred. Please try again.',
          technicalMessage: error.message,
          suggestedAction: 'Try again or contact support if the issue persists'
        };
    }
  }, []);

  const handleAuthError = useCallback((error: any, context?: string) => {
    const errorInfo = categorizeError(error);
    
    console.error(`[AuthError${context ? ` - ${context}` : ''}]:`, {
      ...errorInfo,
      originalError: error
    });

    // Show user-friendly toast
    toast({
      title: getErrorTitle(errorInfo.type, errorInfo.severity),
      description: errorInfo.userMessage + (errorInfo.suggestedAction ? ` ${errorInfo.suggestedAction}` : ''),
      variant: errorInfo.severity === 'critical' || errorInfo.severity === 'high' ? 'destructive' : 'default',
    });

    return errorInfo;
  }, [categorizeError, toast]);

  const getErrorTitle = (type: AuthErrorInfo['type'], severity: AuthErrorInfo['severity']): string => {
    if (severity === 'critical') return 'Critical Error';
    if (severity === 'high') return 'Authentication Error';
    
    switch (type) {
      case 'network': return 'Connection Issue';
      case 'auth': return 'Sign In Problem';
      case 'validation': return 'Validation Error';
      case 'rate_limit': return 'Rate Limited';
      default: return 'Error';
    }
  };

  return {
    handleAuthError,
    categorizeError
  };
};