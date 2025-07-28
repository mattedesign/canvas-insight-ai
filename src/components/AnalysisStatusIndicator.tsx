import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bot, Zap, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const AnalysisStatusIndicator = () => {
  const { user } = useAuth();

  return (
    <Card className="w-full max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4" />
          Analysis Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Authentication Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Authentication</span>
          <Badge variant={user ? "default" : "destructive"}>
            {user ? "Logged In" : "Not Logged In"}
          </Badge>
        </div>

        {/* Analysis Type */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Analysis Type</span>
          <Badge variant={user ? "default" : "secondary"}>
            {user ? "AI-Powered" : "Mock Data"}
          </Badge>
        </div>

        {/* Status Message */}
        <div className="p-3 rounded-lg bg-muted">
          {user ? (
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Real AI Analysis Active</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Using OpenAI GPT-4 Vision for comprehensive UX analysis
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Mock Analysis Mode</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Log in to get real AI-powered analysis
                </p>
              </div>
            </div>
          )}
        </div>

        {!user && (
          <Button 
            onClick={() => window.location.href = '/auth'} 
            size="sm" 
            className="w-full"
          >
            <Key className="mr-2 h-4 w-4" />
            Log In for AI Analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
};