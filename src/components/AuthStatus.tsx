import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Shield, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export const AuthStatus: React.FC = () => {
  const { user, session, loading, subscription } = useAuth();

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Checking authentication...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user || !session) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Not authenticated</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sessionTimeLeft = session.expires_at 
    ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000))
    : 0;

  const hoursLeft = Math.floor(sessionTimeLeft / 3600);
  const minutesLeft = Math.floor((sessionTimeLeft % 3600) / 60);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>Authentication Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="default" className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>Authenticated</span>
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">User</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{user.email}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Session</span>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">
              {sessionTimeLeft > 0 
                ? `${hoursLeft}h ${minutesLeft}m left`
                : 'Expired'
              }
            </span>
          </div>
        </div>

        {subscription && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant={subscription.subscribed ? "default" : "secondary"}>
              {subscription.subscription_tier || 'Free'}
            </Badge>
          </div>
        )}

        {subscription && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Usage</span>
            <span className="text-sm">
              {subscription.analysis_count} / {subscription.analysis_limit}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};