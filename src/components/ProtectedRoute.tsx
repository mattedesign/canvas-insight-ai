import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // Show loading state while authenticating
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Verifying your session...</p>
            <p className="text-sm text-muted-foreground">This should only take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where user exists but session is invalid/expired
  if (user && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Session Expired</h2>
            <p className="text-muted-foreground">
              Your session has expired. Please sign in again to continue.
            </p>
          </div>
          <Navigate 
            to="/auth" 
            state={{ from: location.pathname, reason: 'session_expired' }} 
            replace 
          />
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    return (
      <Navigate 
        to="/auth" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;