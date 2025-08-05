import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield, Lock } from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';

interface AdminOnlyRouteProps {
  children: React.ReactNode;
}

const AdminOnlyRoute: React.FC<AdminOnlyRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // First ensure user is authenticated
  if (loading || !user) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  }

  // Check if user is the admin
  const isAdmin = user.email === 'sparkingmatt@gmail.com';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-16 w-16 text-amber-500" />
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground">
              This area is only accessible to authorized administrators.
            </p>
          </div>
          <Navigate 
            to="/dashboard" 
            state={{ from: location.pathname, reason: 'insufficient_permissions' }} 
            replace 
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminOnlyRoute;